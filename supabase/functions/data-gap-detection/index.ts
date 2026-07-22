import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting data gap detection...');
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let accountsChecked = 0;
    let alertsGenerated = 0;
    let errorsEncountered = 0;
    const errorDetails: string[] = [];

    // Get all active accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts_master')
      .select('*')
      .eq('status', 'active');

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      errorsEncountered++;
      errorDetails.push(`Failed to fetch accounts: ${accountsError.message}`);
    }

    if (accounts && accounts.length > 0) {
      console.log(`📊 Checking ${accounts.length} active accounts for data gaps...`);

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      for (const account of accounts) {
        try {
          accountsChecked++;
          console.log(`Checking account: ${account.account_name}`);

          // Check for missing sales data
          const { data: recentSales, error: salesError } = await supabase
            .from('daily_sales_ppc_data')
            .select('record_date, last_synced_at')
            .eq('merchant_token', account.merchant_token)
            .gte('record_date', twoDaysAgo.toISOString().split('T')[0])
            .order('record_date', { ascending: false })
            .limit(2);

          if (salesError) {
            console.error(`Sales data error for ${account.account_name}:`, salesError);
            errorsEncountered++;
            errorDetails.push(`Sales data error for ${account.account_name}: ${salesError.message}`);
            continue;
          }

          // Check for missing PPC data
          const { data: recentPpc, error: ppcError } = await supabase
            .from('daily_ppc_data')
            .select('record_date, last_synced_at')
            .eq('merchant_token', account.merchant_token)
            .gte('record_date', twoDaysAgo.toISOString().split('T')[0])
            .order('record_date', { ascending: false })
            .limit(2);

          if (ppcError) {
            console.error(`PPC data error for ${account.account_name}:`, ppcError);
            errorsEncountered++;
            errorDetails.push(`PPC data error for ${account.account_name}: ${ppcError.message}`);
            continue;
          }

          // Check for missing ASIN data
          const { data: recentAsin, error: asinError } = await supabase
            .from('daily_asin_data')
            .select('record_date, last_synced_at')
            .eq('merchant_token', account.merchant_token)
            .gte('record_date', twoDaysAgo.toISOString().split('T')[0])
            .order('record_date', { ascending: false })
            .limit(2);

          if (asinError) {
            console.error(`ASIN data error for ${account.account_name}:`, asinError);
            errorsEncountered++;
            errorDetails.push(`ASIN data error for ${account.account_name}: ${asinError.message}`);
            continue;
          }

          // Analyze data gaps and create alerts
          const alerts = [];

          // Check if sales data is missing for yesterday
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          const hasSalesYesterday = recentSales?.some(d => d.record_date === yesterdayStr);
          
          if (!hasSalesYesterday) {
            const lastSalesData = recentSales?.[0];
            const hoursSinceUpdate = lastSalesData?.last_synced_at 
              ? Math.floor((now.getTime() - new Date(lastSalesData.last_synced_at).getTime()) / (1000 * 60 * 60))
              : null;

            alerts.push({
              account_name: account.account_name,
              merchant_token: account.merchant_token,
              alert_type: 'missing_sales_data',
              severity: hoursSinceUpdate && hoursSinceUpdate > 48 ? 'high' : 'medium',
              message: `Sales data missing for ${yesterdayStr}. Last sync: ${lastSalesData?.last_synced_at || 'unknown'}`,
              last_data_date: lastSalesData?.record_date || null,
              hours_since_update: hoursSinceUpdate,
              metadata: { 
                missing_date: yesterdayStr,
                last_available_date: lastSalesData?.record_date || null,
                data_type: 'sales'
              }
            });
          }

          // Check if PPC data is missing
          const hasPpcYesterday = recentPpc?.some(d => d.record_date === yesterdayStr);
          if (!hasPpcYesterday && account.ppc_account_name) {
            const lastPpcData = recentPpc?.[0];
            const hoursSinceUpdate = lastPpcData?.last_synced_at 
              ? Math.floor((now.getTime() - new Date(lastPpcData.last_synced_at).getTime()) / (1000 * 60 * 60))
              : null;

            alerts.push({
              account_name: account.account_name,
              merchant_token: account.merchant_token,
              alert_type: 'missing_ppc_data',
              severity: hoursSinceUpdate && hoursSinceUpdate > 48 ? 'high' : 'medium',
              message: `PPC data missing for ${yesterdayStr}. Last sync: ${lastPpcData?.last_synced_at || 'unknown'}`,
              last_data_date: lastPpcData?.record_date || null,
              hours_since_update: hoursSinceUpdate,
              metadata: { 
                missing_date: yesterdayStr,
                last_available_date: lastPpcData?.record_date || null,
                data_type: 'ppc',
                ppc_account: account.ppc_account_name
              }
            });
          }

          // Check for stale data (no updates in 72+ hours)
          const staleThresholdHours = 72;
          if (recentSales?.length > 0) {
            const lastSyncDate = new Date(recentSales[0].last_synced_at);
            const hoursSinceSync = Math.floor((now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60));
            
            if (hoursSinceSync > staleThresholdHours) {
              alerts.push({
                account_name: account.account_name,
                merchant_token: account.merchant_token,
                alert_type: 'stale_data',
                severity: hoursSinceSync > 120 ? 'critical' : 'high',
                message: `Data not updated in ${hoursSinceSync} hours (${Math.floor(hoursSinceSync / 24)} days)`,
                last_data_date: recentSales[0].record_date,
                hours_since_update: hoursSinceSync,
                metadata: { 
                  threshold_hours: staleThresholdHours,
                  last_sync: recentSales[0].last_synced_at
                }
              });
            }
          }

          // Insert alerts into database
          if (alerts.length > 0) {
            console.log(`🚨 Creating ${alerts.length} alerts for ${account.account_name}`);
            
            // Check if similar alerts already exist (avoid duplicates)
            for (const alert of alerts) {
              const { data: existingAlerts } = await supabase
                .from('data_gap_alerts')
                .select('id')
                .eq('account_name', alert.account_name)
                .eq('alert_type', alert.alert_type)
                .eq('status', 'active')
                .eq('last_data_date', alert.last_data_date);

              if (!existingAlerts || existingAlerts.length === 0) {
                const { error: insertError } = await supabase
                  .from('data_gap_alerts')
                  .insert(alert);

                if (insertError) {
                  console.error(`Error inserting alert for ${account.account_name}:`, insertError);
                  errorsEncountered++;
                  errorDetails.push(`Failed to insert alert for ${account.account_name}: ${insertError.message}`);
                } else {
                  alertsGenerated++;
                  console.log(`✅ Alert created: ${alert.alert_type} for ${account.account_name}`);
                }
              } else {
                console.log(`⏭️ Similar alert already exists for ${account.account_name} - ${alert.alert_type}`);
              }
            }
          } else {
            console.log(`✅ No data gaps detected for ${account.account_name}`);
          }

        } catch (error) {
          console.error(`Error processing account ${account.account_name}:`, error);
          errorsEncountered++;
          errorDetails.push(`Processing error for ${account.account_name}: ${error.message}`);
        }
      }
    }

    const executionTime = Date.now() - startTime;
    const runStatus = errorsEncountered > 0 ? (alertsGenerated > 0 ? 'partial' : 'failure') : 'success';

    // Log monitoring status
    const { error: statusError } = await supabase
      .from('monitoring_status')
      .insert({
        monitor_type: 'data_gap_detection',
        run_status: runStatus,
        accounts_checked: accountsChecked,
        alerts_generated: alertsGenerated,
        errors_encountered: errorsEncountered,
        execution_time_ms: executionTime,
        error_details: errorDetails.length > 0 ? { errors: errorDetails } : null
      });

    if (statusError) {
      console.error('Error logging monitoring status:', statusError);
    }

    console.log(`🏁 Data gap detection completed in ${executionTime}ms`);
    console.log(`📊 Summary: ${accountsChecked} accounts checked, ${alertsGenerated} alerts generated, ${errorsEncountered} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          accounts_checked: accountsChecked,
          alerts_generated: alertsGenerated,
          errors_encountered: errorsEncountered,
          execution_time_ms: executionTime,
          status: runStatus
        },
        errors: errorDetails.length > 0 ? errorDetails : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('🚨 Critical error in data gap detection:', error);
    
    const executionTime = Date.now() - startTime;
    
    // Try to log the failure
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabase
        .from('monitoring_status')
        .insert({
          monitor_type: 'data_gap_detection',
          run_status: 'failure',
          accounts_checked: 0,
          alerts_generated: 0,
          errors_encountered: 1,
          execution_time_ms: executionTime,
          error_details: { critical_error: error.message }
        });
    } catch (logError) {
      console.error('Failed to log critical error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        execution_time_ms: executionTime
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});