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
    console.log('📈 Starting performance anomaly detection...');
    
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
      console.log(`📊 Analyzing performance for ${accounts.length} active accounts...`);

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Performance thresholds - defined outside loop for global access
      const thresholds = {
        sales_drop_percentage: 25,
        acos_spike_percentage: 50,
        conversion_drop_percentage: 30,
        buy_box_drop_percentage: 20,
        ppc_spend_spike_percentage: 40
      };

      for (const account of accounts) {
        try {
          accountsChecked++;
          console.log(`Analyzing performance for: ${account.account_name}`);

          // Get recent sales and PPC data
          const { data: recentData, error: dataError } = await supabase
            .from('daily_sales_ppc_data')
            .select('*')
            .eq('merchant_token', account.merchant_token)
            .gte('record_date', weekAgo.toISOString().split('T')[0])
            .order('record_date', { ascending: false });

          if (dataError) {
            console.error(`Data error for ${account.account_name}:`, dataError);
            errorsEncountered++;
            errorDetails.push(`Data error for ${account.account_name}: ${dataError.message}`);
            continue;
          }

          if (!recentData || recentData.length < 2) {
            console.log(`⏭️ Insufficient data for ${account.account_name} - skipping analysis`);
            continue;
          }

          // Get PPC data for ACOS analysis
          const { data: ppcData, error: ppcError } = await supabase
            .from('daily_ppc_data')
            .select('*')
            .eq('merchant_token', account.merchant_token)
            .gte('record_date', weekAgo.toISOString().split('T')[0])
            .order('record_date', { ascending: false });

          if (ppcError) {
            console.error(`PPC data error for ${account.account_name}:`, ppcError);
          }

          // Get ASIN data for conversion rate and buy box analysis  
          const { data: asinData, error: asinError } = await supabase
            .from('daily_asin_data')
            .select('*')
            .eq('merchant_token', account.merchant_token)
            .gte('record_date', weekAgo.toISOString().split('T')[0])
            .order('record_date', { ascending: false });

          if (asinError) {
            console.error(`ASIN data error for ${account.account_name}:`, asinError);
          }

          const alerts = [];
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          // Analyze sales performance
          const currentSales = recentData.find(d => d.record_date === yesterdayStr);
          if (currentSales) {
            // Get average sales from previous week
            const previousWeekData = recentData.filter(d => d.record_date < yesterdayStr && d.sales > 0);
            if (previousWeekData.length > 0) {
              const avgPreviousSales = previousWeekData.reduce((sum, d) => sum + Number(d.sales), 0) / previousWeekData.length;
              const currentSalesValue = Number(currentSales.sales);
              
              if (avgPreviousSales > 0) {
                const salesChangePercent = ((currentSalesValue - avgPreviousSales) / avgPreviousSales) * 100;
                
                // Alert on significant sales drops
                if (salesChangePercent < -thresholds.sales_drop_percentage) {
                  const severity = salesChangePercent < -50 ? 'critical' : salesChangePercent < -40 ? 'high' : 'medium';
                  
                  alerts.push({
                    account_name: account.account_name,
                    merchant_token: account.merchant_token,
                    metric_name: 'sales',
                    current_value: currentSalesValue,
                    previous_value: avgPreviousSales,
                    threshold_breached: thresholds.sales_drop_percentage,
                    percentage_change: salesChangePercent,
                    anomaly_type: 'sudden_drop',
                    severity: severity,
                    detection_date: yesterdayStr,
                    message: `Sales dropped ${Math.abs(salesChangePercent).toFixed(1)}% (${currentSalesValue.toLocaleString()} vs avg ${avgPreviousSales.toLocaleString()})`,
                    metadata: {
                      current_sales: currentSalesValue,
                      average_previous_sales: avgPreviousSales,
                      days_compared: previousWeekData.length,
                      threshold_used: thresholds.sales_drop_percentage
                    }
                  });
                }
              }
            }
          }

          // Analyze PPC performance
          if (ppcData && ppcData.length > 0) {
            const currentPpc = ppcData.find(d => d.record_date === yesterdayStr);
            if (currentPpc) {
              const previousPpcData = ppcData.filter(d => d.record_date < yesterdayStr);
              
              if (previousPpcData.length > 0) {
                // Check ACOS spikes
                const avgPreviousAcos = previousPpcData
                  .filter(d => Number(d.acos) > 0)
                  .reduce((sum, d) => sum + Number(d.acos), 0) / previousPpcData.filter(d => Number(d.acos) > 0).length;
                
                const currentAcos = Number(currentPpc.acos);
                
                if (avgPreviousAcos > 0 && currentAcos > 0) {
                  const acosChangePercent = ((currentAcos - avgPreviousAcos) / avgPreviousAcos) * 100;
                  
                  if (acosChangePercent > thresholds.acos_spike_percentage) {
                    const severity = acosChangePercent > 100 ? 'critical' : acosChangePercent > 75 ? 'high' : 'medium';
                    
                    alerts.push({
                      account_name: account.account_name,
                      merchant_token: account.merchant_token,
                      metric_name: 'acos',
                      current_value: currentAcos,
                      previous_value: avgPreviousAcos,
                      threshold_breached: thresholds.acos_spike_percentage,
                      percentage_change: acosChangePercent,
                      anomaly_type: 'sudden_spike',
                      severity: severity,
                      detection_date: yesterdayStr,
                      message: `ACOS spiked ${acosChangePercent.toFixed(1)}% (${currentAcos.toFixed(1)}% vs avg ${avgPreviousAcos.toFixed(1)}%)`,
                      metadata: {
                        current_acos: currentAcos,
                        average_previous_acos: avgPreviousAcos,
                        threshold_used: thresholds.acos_spike_percentage
                      }
                    });
                  }
                }

                // Check PPC spend spikes
                const avgPreviousSpend = previousPpcData
                  .filter(d => Number(d.ppc_spend) > 0)
                  .reduce((sum, d) => sum + Number(d.ppc_spend), 0) / previousPpcData.filter(d => Number(d.ppc_spend) > 0).length;
                
                const currentSpend = Number(currentPpc.ppc_spend);
                
                if (avgPreviousSpend > 0 && currentSpend > 0) {
                  const spendChangePercent = ((currentSpend - avgPreviousSpend) / avgPreviousSpend) * 100;
                  
                  if (spendChangePercent > thresholds.ppc_spend_spike_percentage) {
                    const severity = spendChangePercent > 80 ? 'high' : 'medium';
                    
                    alerts.push({
                      account_name: account.account_name,
                      merchant_token: account.merchant_token,
                      metric_name: 'ppc_spend',
                      current_value: currentSpend,
                      previous_value: avgPreviousSpend,
                      threshold_breached: thresholds.ppc_spend_spike_percentage,
                      percentage_change: spendChangePercent,
                      anomaly_type: 'sudden_spike',
                      severity: severity,
                      detection_date: yesterdayStr,
                      message: `PPC spend increased ${spendChangePercent.toFixed(1)}% (${currentSpend.toLocaleString()} vs avg ${avgPreviousSpend.toLocaleString()})`,
                      metadata: {
                        current_spend: currentSpend,
                        average_previous_spend: avgPreviousSpend,
                        threshold_used: thresholds.ppc_spend_spike_percentage
                      }
                    });
                  }
                }
              }
            }
          }

          // Analyze ASIN performance (conversion rate and buy box)
          if (asinData && asinData.length > 0) {
            // Group ASIN data by date and aggregate
            const asinByDate = asinData.reduce((acc, asin) => {
              if (!acc[asin.record_date]) {
                acc[asin.record_date] = [];
              }
              acc[asin.record_date].push(asin);
              return acc;
            }, {} as Record<string, any[]>);

            const currentAsins = asinByDate[yesterdayStr];
            if (currentAsins && currentAsins.length > 0) {
              // Calculate weighted averages for current day
              const currentTotalPageViews = currentAsins.reduce((sum, a) => sum + Number(a.page_views || 0), 0);
              const currentWeightedConversion = currentAsins.reduce((sum, a) => {
                const pageViews = Number(a.page_views || 0);
                const conversionRate = Number(a.conversion_rate || 0);
                return sum + (pageViews * conversionRate);
              }, 0) / (currentTotalPageViews || 1);

              const currentWeightedBuyBox = currentAsins.reduce((sum, a) => {
                const pageViews = Number(a.page_views || 0);
                const buyBox = Number(a.buy_box_percentage || 0);
                return sum + (pageViews * buyBox);
              }, 0) / (currentTotalPageViews || 1);

              // Calculate averages for previous days
              const previousDates = Object.keys(asinByDate).filter(date => date < yesterdayStr);
              if (previousDates.length > 0) {
                let totalPreviousPageViews = 0;
                let weightedPreviousConversion = 0;
                let weightedPreviousBuyBox = 0;

                previousDates.forEach(date => {
                  const asins = asinByDate[date];
                  const datePageViews = asins.reduce((sum, a) => sum + Number(a.page_views || 0), 0);
                  totalPreviousPageViews += datePageViews;
                  
                  weightedPreviousConversion += asins.reduce((sum, a) => {
                    const pageViews = Number(a.page_views || 0);
                    const conversionRate = Number(a.conversion_rate || 0);
                    return sum + (pageViews * conversionRate);
                  }, 0);

                  weightedPreviousBuyBox += asins.reduce((sum, a) => {
                    const pageViews = Number(a.page_views || 0);
                    const buyBox = Number(a.buy_box_percentage || 0);
                    return sum + (pageViews * buyBox);
                  }, 0);
                });

                const avgPreviousConversion = weightedPreviousConversion / (totalPreviousPageViews || 1);
                const avgPreviousBuyBox = weightedPreviousBuyBox / (totalPreviousPageViews || 1);

                // Check conversion rate drops
                if (avgPreviousConversion > 0 && currentWeightedConversion > 0) {
                  const conversionChangePercent = ((currentWeightedConversion - avgPreviousConversion) / avgPreviousConversion) * 100;
                  
                  if (conversionChangePercent < -thresholds.conversion_drop_percentage) {
                    const severity = conversionChangePercent < -50 ? 'high' : 'medium';
                    
                    alerts.push({
                      account_name: account.account_name,
                      merchant_token: account.merchant_token,
                      metric_name: 'conversion_rate',
                      current_value: currentWeightedConversion,
                      previous_value: avgPreviousConversion,
                      threshold_breached: thresholds.conversion_drop_percentage,
                      percentage_change: conversionChangePercent,
                      anomaly_type: 'sudden_drop',
                      severity: severity,
                      detection_date: yesterdayStr,
                      message: `Conversion rate dropped ${Math.abs(conversionChangePercent).toFixed(1)}% (${currentWeightedConversion.toFixed(2)}% vs avg ${avgPreviousConversion.toFixed(2)}%)`,
                      metadata: {
                        current_conversion_rate: currentWeightedConversion,
                        average_previous_conversion: avgPreviousConversion,
                        threshold_used: thresholds.conversion_drop_percentage,
                        asins_analyzed: currentAsins.length
                      }
                    });
                  }
                }

                // Check buy box percentage drops
                if (avgPreviousBuyBox > 0 && currentWeightedBuyBox >= 0) {
                  const buyBoxChangePercent = ((currentWeightedBuyBox - avgPreviousBuyBox) / avgPreviousBuyBox) * 100;
                  
                  if (buyBoxChangePercent < -thresholds.buy_box_drop_percentage) {
                    const severity = buyBoxChangePercent < -40 ? 'high' : 'medium';
                    
                    alerts.push({
                      account_name: account.account_name,
                      merchant_token: account.merchant_token,
                      metric_name: 'buy_box_percentage',
                      current_value: currentWeightedBuyBox,
                      previous_value: avgPreviousBuyBox,
                      threshold_breached: thresholds.buy_box_drop_percentage,
                      percentage_change: buyBoxChangePercent,
                      anomaly_type: 'sudden_drop',
                      severity: severity,
                      detection_date: yesterdayStr,
                      message: `Buy Box dropped ${Math.abs(buyBoxChangePercent).toFixed(1)}% (${currentWeightedBuyBox.toFixed(1)}% vs avg ${avgPreviousBuyBox.toFixed(1)}%)`,
                      metadata: {
                        current_buy_box: currentWeightedBuyBox,
                        average_previous_buy_box: avgPreviousBuyBox,
                        threshold_used: thresholds.buy_box_drop_percentage,
                        asins_analyzed: currentAsins.length
                      }
                    });
                  }
                }
              }
            }
          }

          // Insert alerts into database
          if (alerts.length > 0) {
            console.log(`🚨 Creating ${alerts.length} performance alerts for ${account.account_name}`);
            
            // Check if similar alerts already exist (avoid duplicates)
            for (const alert of alerts) {
              const { data: existingAlerts } = await supabase
                .from('performance_anomaly_alerts')
                .select('id')
                .eq('account_name', alert.account_name)
                .eq('metric_name', alert.metric_name)
                .eq('detection_date', alert.detection_date)
                .eq('status', 'active');

              if (!existingAlerts || existingAlerts.length === 0) {
                const { error: insertError } = await supabase
                  .from('performance_anomaly_alerts')
                  .insert(alert);

                if (insertError) {
                  console.error(`Error inserting alert for ${account.account_name}:`, insertError);
                  errorsEncountered++;
                  errorDetails.push(`Failed to insert alert for ${account.account_name}: ${insertError.message}`);
                } else {
                  alertsGenerated++;
                  console.log(`✅ Alert created: ${alert.metric_name} ${alert.anomaly_type} for ${account.account_name}`);
                }
              } else {
                console.log(`⏭️ Similar alert already exists for ${account.account_name} - ${alert.metric_name}`);
              }
            }
          } else {
            console.log(`✅ No performance anomalies detected for ${account.account_name}`);
          }

        } catch (error) {
          console.error(`Error analyzing account ${account.account_name}:`, error);
          errorsEncountered++;
          errorDetails.push(`Analysis error for ${account.account_name}: ${error.message}`);
        }
      }
    }

    const executionTime = Date.now() - startTime;
    const runStatus = errorsEncountered > 0 ? (alertsGenerated > 0 ? 'partial' : 'failure') : 'success';

    // Log monitoring status
    const { error: statusError } = await supabase
      .from('monitoring_status')
      .insert({
        monitor_type: 'anomaly_detection',
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

    console.log(`🏁 Performance anomaly detection completed in ${executionTime}ms`);
    console.log(`📊 Summary: ${accountsChecked} accounts analyzed, ${alertsGenerated} alerts generated, ${errorsEncountered} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          accounts_checked: accountsChecked,
          alerts_generated: alertsGenerated,
          errors_encountered: errorsEncountered,
          execution_time_ms: executionTime,
          status: runStatus,
          thresholds_used: thresholds
        },
        errors: errorDetails.length > 0 ? errorDetails : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('🚨 Critical error in performance anomaly detection:', error);
    
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
          monitor_type: 'anomaly_detection',
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