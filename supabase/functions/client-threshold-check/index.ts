import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  enabled: boolean;
  thresholds: {
    buy_box: number;
    conversion_rate_drop: number;
  };
  enabled_alert_types: string[];
}

/**
 * Below this many sessions a day's conversion rate is noise, and a swing
 * between two thin days is not a story worth waking a client for.
 */
const MIN_SESSIONS_FOR_CONVERSION = 20;

interface Account {
  id: string;
  account_name: string;
  merchant_token: string;
  alert_config: AlertConfig;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Starting client threshold check...');
    
    // Get all accounts with alerts enabled
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts_master')
      .select('id, account_name, merchant_token, alert_config')
      .not('alert_config', 'is', null);
    
    if (accountsError) throw accountsError;
    
    const alertsGenerated = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];
    
    for (const account of (accounts as Account[])) {
      const config = account.alert_config;
      
      // Skip if alerts not enabled (no longer require email)
      if (!config?.enabled) continue;
      
      console.log(`Checking alerts for ${account.account_name}`);
      
      // Check Buy Box threshold
      if (config.enabled_alert_types?.includes('buy_box')) {
        const { data: asinData, error: asinError } = await supabase
          .from('daily_asin_data')
          .select('buy_box_percentage, sales')
          .eq('merchant_token', account.merchant_token)
          .eq('record_date', yesterdayStr);
        
        if (!asinError && asinData && asinData.length > 0) {
          // Calculate weighted average buy box
          let totalSales = 0;
          let weightedBuyBox = 0;
          
          for (const asin of asinData) {
            const sales = Number(asin.sales) || 0;
            const buyBox = Number(asin.buy_box_percentage) || 0;
            totalSales += sales;
            weightedBuyBox += buyBox * sales;
          }
          
          const avgBuyBox = totalSales > 0 ? weightedBuyBox / totalSales : 0;
          const threshold = config.thresholds?.buy_box || 98;
          
          if (avgBuyBox < threshold && avgBuyBox > 0) {
            // Check if alert already exists for this date
            const { data: existing } = await supabase
              .from('client_threshold_alerts')
              .select('id')
              .eq('merchant_token', account.merchant_token)
              .eq('alert_type', 'buy_box')
              .eq('detection_date', yesterdayStr)
              .maybeSingle();
            
            if (!existing) {
              const { error: insertError } = await supabase
                .from('client_threshold_alerts')
                .insert({
                  account_name: account.account_name,
                  merchant_token: account.merchant_token,
                  client_email: 'dashboard@alerts.internal', // Placeholder - not used for email
                  alert_type: 'buy_box',
                  metric_value: avgBuyBox,
                  threshold_value: threshold,
                  detection_date: yesterdayStr,
                  message: `Buy Box percentage (${avgBuyBox.toFixed(1)}%) has dropped below your threshold of ${threshold}%`,
                  metadata: { total_asins: asinData.length, total_sales: totalSales }
                });
              
              if (!insertError) {
                alertsGenerated.push({ account: account.account_name, type: 'buy_box', value: avgBuyBox });
                console.log(`✓ Buy Box alert created for ${account.account_name}`);
              }
            }
          }
        }
      }
      
      // Check Conversion Rate threshold
      //
      // This must read conversion the way the dashboard card does, and it did
      // not. It used to take daily_asin_data.conversion_rate — a PER-ASIN ratio
      // that carries values like 140% and 200% because it is units over page
      // views — and average it weighted by SALES. Mahi Naturals came out at
      // 74.8% on 2 Aug that way, while the card, the heatmap and every daily
      // cell on the same screen showed 22.15%. Two figures for one thing, and
      // the alert quoted the one that appears nowhere on the page.
      //
      // rpc_metrics_daily_country is the single definition the KPI cards use:
      // Σunits ÷ Σsessions, sessions recovered from unit_session_percentage,
      // resolved by BRAND so a scope means the same thing here as on screen.
      if (config.enabled_alert_types?.includes('conversion_rate')) {
        // accounts_master.merchant_token is brand_marketplaces.sales_account_key.
        const { data: market } = await supabase
          .from('brand_marketplaces')
          .select('selling_partner_id, country_code')
          .eq('sales_account_key', account.merchant_token)
          .eq('enabled', true)
          .maybeSingle();

        if (!market) {
          console.log(`- ${account.account_name}: no brand_marketplaces scope, conversion check skipped`);
        } else {
          const readConversion = async (day: string): Promise<number | null> => {
            const { data, error } = await supabase.rpc('rpc_metrics_daily_country', {
              p_spid: market.selling_partner_id,
              p_scope: market.country_code,
              p_start: day,
              p_end: day,
            });
            if (error || !data || data.length === 0) return null;
            const row = data[0] as { conversion: number | null; sessions: number | null; has_sessions: boolean };
            // A day the feed has not delivered yet has no denominator. That is
            // absence, not a conversion rate of zero — asserting 0.0% is what
            // produced "dropped 100.0% ... to 0.0%" on an account running at
            // 29%. No sessions, no reading, no alert.
            if (!row.has_sessions) return null;
            const sessions = Number(row.sessions);
            if (!Number.isFinite(sessions) || sessions < MIN_SESSIONS_FOR_CONVERSION) return null;
            const conversion = row.conversion == null ? null : Number(row.conversion);
            return Number.isFinite(conversion as number) ? (conversion as number) : null;
          };

          const [yesterdayCR, dayBeforeCR] = await Promise.all([
            readConversion(yesterdayStr),
            readConversion(dayBeforeStr),
          ]);

          if (yesterdayCR == null || dayBeforeCR == null) {
            console.log(
              `- ${account.account_name}: conversion check skipped, ` +
              `${yesterdayStr}=${yesterdayCR ?? 'no data'} ${dayBeforeStr}=${dayBeforeCR ?? 'no data'}`,
            );
          } else if (dayBeforeCR > 0) {
            const percentChange = ((yesterdayCR - dayBeforeCR) / dayBeforeCR) * 100;
            const threshold = config.thresholds?.conversion_rate_drop || 25;

            if (percentChange < -threshold) {
              // Check if alert already exists
              const { data: existing } = await supabase
                .from('client_threshold_alerts')
                .select('id')
                .eq('merchant_token', account.merchant_token)
                .eq('alert_type', 'conversion_rate')
                .eq('detection_date', yesterdayStr)
                .maybeSingle();

              if (!existing) {
                const { error: insertError } = await supabase
                  .from('client_threshold_alerts')
                  .insert({
                    account_name: account.account_name,
                    merchant_token: account.merchant_token,
                    client_email: 'dashboard@alerts.internal', // Placeholder - not used for email
                    alert_type: 'conversion_rate',
                    metric_value: yesterdayCR,
                    threshold_value: threshold,
                    detection_date: yesterdayStr,
                    message: `Conversion rate dropped ${Math.abs(percentChange).toFixed(1)}% (from ${dayBeforeCR.toFixed(1)}% to ${yesterdayCR.toFixed(1)}%), exceeding your ${threshold}% drop threshold`,
                    metadata: {
                      previous_value: dayBeforeCR,
                      percent_change: percentChange,
                      source: 'rpc_metrics_daily_country',
                      basis: 'units ÷ sessions, same as the dashboard KPI card',
                      scope: `${market.selling_partner_id}/${market.country_code}`,
                    }
                  });

                if (!insertError) {
                  alertsGenerated.push({ account: account.account_name, type: 'conversion_rate', change: percentChange });
                  console.log(`✓ Conversion Rate alert created for ${account.account_name}`);
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`✓ Threshold check complete. Generated ${alertsGenerated.length} alerts.`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        alerts_generated: alertsGenerated.length,
        details: alertsGenerated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Error in client threshold check:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
