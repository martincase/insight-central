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
    console.log('🚀 Starting daily vendor data sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !googleSheetsApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Google Sheets configuration - Updated to use new vendor sheet
    const sheetId = '1il1doajzBPxg5uO8BOPJNxtCt9w2JRGajL5XhWAIYC0';
    const range = 'Sheet1!A:Z';

    // Use current date for syncing
    const targetDate = new Date();
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    console.log(`[VENDOR] Syncing data for date: ${targetDate.toISOString()}`);
    console.log(`📅 Processing vendor data for date: ${targetDateStr}`);

    console.log('📊 Fetching vendor data from Google Sheets...');
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${googleSheetsApiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.values || data.values.length <= 1) {
      console.log('⚠️ No data found in vendor sheet');
      
      // Update sync status with warning
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'vendor',
          sync_date: targetDateStr,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No data found in Google Sheets'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No vendor data found to sync',
        data: { date: targetDateStr, records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = data.values[0];

    // Process vendor data with validation
    console.log('📋 Processing and validating vendor data...');
    const validVendorRecords = [];
    for (let i = 1; i < data.values.length; i++) {
      const row = data.values[i];
      if (!row || row.length === 0) continue;
      
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });

      // Validate required fields and date - ASIN is required for unique constraint
      const rowDate = new Date(rowData['date']);
      if (rowDate.toISOString().split('T')[0] === targetDateStr && 
          rowData['account_name'] && 
          rowData['vendor_sales_report__asin']) {
        
        validVendorRecords.push({
          record_date: targetDateStr,
          merchant_token: rowData['account_name'], // Using account_name as merchant_token
          account_name: rowData['account_name'],
          asin: rowData['vendor_sales_report__asin'],
          sales: 0, // Not available in current data structure
          units_ordered: parseFloat(rowData['vendor_sales_report__shippedunits']) || 0,
          page_views: 0, // Not available in current data structure
          buy_box_percentage: 0, // Not available in current data structure
          conversion_rate: 0, // Not available in current data structure
          shipped_revenue_amount: parseFloat(rowData['vendor_sales_report__shippedrevenue_amount']) || 0,
          shipped_cogs_amount: parseFloat(rowData['vendor_sales_report__shippedcogs_amount']) || 0,
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }

    // Remove duplicates based on unique constraint (record_date, merchant_token, asin)
    // Using same logic as force-historical-sync
    const uniqueVendorRecords = validVendorRecords.reduce((acc, current) => {
      const key = `${current.record_date}_${current.merchant_token}_${current.asin}`;
      if (!acc.seen.has(key)) {
        acc.seen.add(key);
        acc.records.push(current);
      }
      return acc;
    }, { seen: new Set(), records: [] }).records;
    
    console.log(`📊 Filtered ${data.values.length} → ${validVendorRecords.length} valid → ${uniqueVendorRecords.length} unique vendor records`);

    if (uniqueVendorRecords.length === 0) {
      console.log('⚠️ No unique vendor records found after validation');
      
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'vendor',
          sync_date: targetDateStr,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No unique vendor records found'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No unique vendor records found',
        data: { date: targetDateStr, records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clear existing data for the target date
    console.log('🗑️ Clearing existing vendor data for target date...');
    await supabase.from('daily_vendor_data').delete().eq('record_date', targetDateStr);

    // Insert vendor data with robust batch processing (like force-historical-sync)
    const vendorBatchSize = 1000;
    const maxExecutionTime = 420000; // 7 minutes (leave 3 min buffer for Supabase 10min limit)
    let totalInserted = 0;
    
    console.log(`📦 Starting Vendor batch processing: ${uniqueVendorRecords.length} total records in batches of ${vendorBatchSize}`);
    
    for (let i = 0; i < uniqueVendorRecords.length; i += vendorBatchSize) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`⏰ Vendor processing timeout approaching, processed ${totalInserted} of ${uniqueVendorRecords.length} records`);
        break;
      }
      
      const batch = uniqueVendorRecords.slice(i, i + vendorBatchSize);
      const batchNum = Math.floor(i / vendorBatchSize) + 1;
      const totalBatches = Math.ceil(uniqueVendorRecords.length / vendorBatchSize);
      
      console.log(`📦 Processing Vendor batch ${batchNum}/${totalBatches} (${batch.length} records)`);
      
      // Use upsert directly instead of insert first (like force-historical-sync)
      const { data: upserted, error } = await supabase
        .from('daily_vendor_data')
        .upsert(batch, { 
          onConflict: 'record_date,merchant_token,asin',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error(`❌ Vendor batch ${batchNum} upsert error:`, error);
        throw error;
      } else {
        totalInserted += upserted?.length || 0;
      }
      console.log(`✅ Vendor batch ${batchNum}/${totalBatches}: ${batch.length} records processed (${totalInserted}/${uniqueVendorRecords.length} total)`);
      
      // Delay between batches to prevent CPU overload
      if (i + vendorBatchSize < uniqueVendorRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update sync status
    await supabase
      .from('daily_sync_status')
      .upsert({
        sync_type: 'vendor',
        sync_date: targetDateStr,
        status: 'completed',
        records_processed: totalInserted,
        last_run_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        error_message: null
      }, { onConflict: 'sync_type,sync_date' });

    console.log(`✅ Daily vendor sync completed - banked ${totalInserted} vendor records`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily vendor data synced successfully',
      data: {
        date: targetDateStr,
        records: totalInserted
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Error in daily vendor sync:', error);

    // Log error to sync status
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'vendor',
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