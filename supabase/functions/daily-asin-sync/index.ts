import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('🚀 Starting daily ASIN data sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !googleSheetsApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Google Sheets configuration - Correct ASIN Sales sheet
    const sheetId = '148fhdWwIdodj4NIDhwairqr2q7f5gy38RmeEhX5NBfk';
    const range = 'Sheet1!A:Z';

    // Use current date for syncing
    const targetDate = new Date();
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    console.log(`[ASIN] Syncing data for date: ${targetDate.toISOString()}`);
    console.log(`📅 Processing ASIN data for date: ${targetDateStr}`);

    console.log('📊 Fetching ASIN data from Google Sheets...');
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${googleSheetsApiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.values || data.values.length <= 1) {
      console.log('⚠️ No data found in ASIN sheet');
      
      // Update sync status with warning
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'asin',
          sync_date: targetDateStr,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No data found in Google Sheets'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No ASIN data found to sync',
        data: { date: targetDateStr, records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = data.values[0];

    // Process ASIN data with validation
    console.log('📋 Processing and validating ASIN data...');
    const asinRecords = [];
    for (let i = 1; i < data.values.length; i++) {
      const row = data.values[i];
      if (!row || row.length === 0) continue;
      
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });

      // Validate required fields and date - using correct column names from the sheet
      const rowDateStr = rowData['date'];
      const accountName = rowData['account_name'] || '';
      const childAsin = rowData['sales_and_traffic_report_by_date__childasin'] || '';
      const parentAsin = rowData['sales_and_traffic_report_by_date__parentasin'] || '';
      
      // Parse the date and check if it matches target date
      let rowDate: Date | null = null;
      try {
        rowDate = new Date(rowDateStr);
      } catch {
        continue;
      }
      
      if (rowDate && rowDate.toISOString().split('T')[0] === targetDateStr && 
          accountName && childAsin) {
        
        // Parse numeric values from correct column names
        const sales = parseFloat(rowData['sales_and_traffic_report_by_date__salesbyasin_orderedproductsales_amount']) || 0;
        const unitsSold = parseFloat(rowData['sales_and_traffic_report_by_date__salesbyasin_unitsordered']) || 0;
        const pageViews = parseFloat(rowData['sales_and_traffic_report_by_date__trafficbyasin_browserpageviews']) || 0;
        const buyBoxPercentage = parseFloat(rowData['sales_and_traffic_report_by_date__trafficbyasin_buyboxpercentage']) || 0;
        const conversionRate = parseFloat(rowData['sales_and_traffic_report_by_date__trafficbyasin_unitsessionpercentage']) || 0;
        
        asinRecords.push({
          record_date: targetDateStr,
          merchant_token: accountName, // Using account_name as identifier since that's what we have
          account_name: accountName,
          parent_asin: parentAsin,
          child_asin: childAsin,
          product_title: '', // Not available in this sheet
          sales: sales,
          units_sold: unitsSold,
          page_views: pageViews,
          buy_box_percentage: buyBoxPercentage,
          conversion_rate: conversionRate,
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }

    console.log(`✅ Validated ${asinRecords.length} ASIN records`);

    if (asinRecords.length === 0) {
      console.log('⚠️ No valid ASIN records found after validation');
      
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'asin',
          sync_date: targetDateStr,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No valid ASIN records found'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No valid ASIN records found',
        data: { date: targetDateStr, records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clear existing data for the target date
    console.log('🗑️ Clearing existing ASIN data for target date...');
    await supabase.from('daily_asin_data').delete().eq('record_date', targetDateStr);

    // Insert ASIN data with robust batch processing (like force-historical-sync)
    const asinBatchSize = 1000;
    const maxExecutionTime = 420000; // 7 minutes (leave 3 min buffer for Supabase 10min limit)
    let totalInserted = 0;
    
    console.log(`📦 Starting ASIN batch processing: ${asinRecords.length} total records in batches of ${asinBatchSize}`);
    
    for (let i = 0; i < asinRecords.length; i += asinBatchSize) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`⏰ ASIN processing timeout approaching, processed ${totalInserted} of ${asinRecords.length} records`);
        break;
      }
      
      const batch = asinRecords.slice(i, i + asinBatchSize);
      const batchNum = Math.floor(i / asinBatchSize) + 1;
      const totalBatches = Math.ceil(asinRecords.length / asinBatchSize);
      
      console.log(`📦 Processing ASIN batch ${batchNum}/${totalBatches} (${batch.length} records)`);
      
      const { data: inserted, error } = await supabase
        .from('daily_asin_data')
        .insert(batch)
        .select();

      if (error) {
        // If duplicate key error, try upsert
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          console.log(`🔄 Duplicate keys detected, using upsert for ASIN batch ${batchNum}`);
          
          const { data: upserted, error: upsertError } = await supabase
            .from('daily_asin_data')
            .upsert(batch, { 
              onConflict: 'record_date,merchant_token,parent_asin,child_asin',
              ignoreDuplicates: false 
            })
            .select();
            
          if (upsertError) {
            console.error(`❌ ASIN batch ${batchNum} upsert error:`, upsertError);
            throw upsertError;
          }
          totalInserted += upserted?.length || 0;
        } else {
          console.error(`❌ ASIN batch ${batchNum} error:`, error);
          throw error;
        }
      } else {
        totalInserted += inserted?.length || 0;
      }
      console.log(`✅ ASIN batch ${batchNum}/${totalBatches}: ${batch.length} records processed (${totalInserted}/${asinRecords.length} total)`);
      
      // Delay between batches to prevent CPU overload
      if (i + asinBatchSize < asinRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update sync status
    await supabase
      .from('daily_sync_status')
      .upsert({
        sync_type: 'asin',
        sync_date: targetDateStr,
        status: 'completed',
        records_processed: totalInserted,
        last_run_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        error_message: null
      }, { onConflict: 'sync_type,sync_date' });

    console.log(`✅ Daily ASIN sync completed - banked ${totalInserted} ASIN records`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily ASIN data synced successfully',
      data: {
        date: targetDateStr,
        records: totalInserted
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Error in daily ASIN sync:', error);

    // Log error to sync status
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      // Target September 1st specifically for testing
      const targetDate = new Date('2024-09-01');
      const targetDateStr = targetDate.toISOString().split('T')[0];

      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'asin',
          sync_date: targetDateStr,
          status: 'failed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: error.message
        }, { onConflict: 'sync_type,sync_date' });
    } catch (logError) {
      console.error('❌ Failed to log error status:', logError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});