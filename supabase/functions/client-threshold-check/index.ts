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
      if (config.enabled_alert_types?.includes('conversion_rate')) {
        const { data: yesterdayData, error: yesterdayError } = await supabase
          .from('daily_asin_data')
          .select('conversion_rate, sales')
          .eq('merchant_token', account.merchant_token)
          .eq('record_date', yesterdayStr);
        
        const { data: dayBeforeData, error: dayBeforeError } = await supabase
          .from('daily_asin_data')
          .select('conversion_rate, sales')
          .eq('merchant_token', account.merchant_token)
          .eq('record_date', dayBeforeStr);
        
        if (!yesterdayError && !dayBeforeError && yesterdayData && dayBeforeData && 
            yesterdayData.length > 0 && dayBeforeData.length > 0) {
          
          // Calculate weighted average conversion rates
          const calcWeightedAvg = (data: any[]) => {
            let totalSales = 0;
            let weightedCR = 0;
            
            for (const item of data) {
              const sales = Number(item.sales) || 0;
              const cr = Number(item.conversion_rate) || 0;
              totalSales += sales;
              weightedCR += cr * sales;
            }
            
            return totalSales > 0 ? weightedCR / totalSales : 0;
          };
          
          const yesterdayCR = calcWeightedAvg(yesterdayData);
          const dayBeforeCR = calcWeightedAvg(dayBeforeData);
          
          if (dayBeforeCR > 0) {
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
                      asins_checked: yesterdayData.length 
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
