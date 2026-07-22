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
    console.log('🚀 Starting daily campaign data sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !googleSheetsApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Google Sheets configuration  
    const sheetId = '1PwVUhyXPKL0-NmSl0X2YUevRuUQfSMCJhYQjQZc6bgQ';
    const range = 'PPC Campaigns!A:Z';

    // Use current date for syncing
    const targetDate = new Date();
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    console.log(`[CAMPAIGN] Syncing data for date: ${targetDate.toISOString()}`);
    console.log(`📅 Processing campaign data for date: ${targetDateStr}`);

    console.log('📊 Fetching campaign data from Google Sheets...');
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${googleSheetsApiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.values || data.values.length <= 1) {
      console.log('⚠️ No data found in campaign sheet');
      
      // Update sync status with warning
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'campaign',
          sync_date: targetDateStr,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No data found in Google Sheets'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No campaign data found to sync',
        data: { date: targetDateStr, records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = data.values[0];

    // Process campaign data with validation
    console.log('📋 Processing and validating campaign data...');
    const campaignRecords = [];
    for (let i = 1; i < data.values.length; i++) {
      const row = data.values[i];
      if (!row || row.length === 0) continue;
      
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });

      // Validate required fields and date
      const rowDate = new Date(rowData['Date']);
      if (rowDate.toISOString().split('T')[0] === targetDateStr && 
          rowData['Merchant Token'] && 
          rowData['Campaign Name']) {
        
        const spend = parseFloat(rowData['Spend']) || 0;
        const sales = parseFloat(rowData['Sales']) || 0;
        const acos = sales > 0 ? (spend / sales) * 100 : 0;

        campaignRecords.push({
          record_date: targetDateStr,
          merchant_token: rowData['Merchant Token'],
          account_name: rowData['Account Name'] || '',
          campaign_name: rowData['Campaign Name'],
          spend: spend,
          sales: sales,
          acos: acos,
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }

    console.log(`✅ Validated ${campaignRecords.length} campaign records`);

    if (campaignRecords.length === 0) {
      console.log('⚠️ No valid campaign records found after validation');
      
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'campaign',
          sync_date: targetDateStr,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No valid campaign records found'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No valid campaign records found',
        data: { date: targetDateStr, records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clear existing data for the target date
    console.log('🗑️ Clearing existing campaign data for target date...');
    await supabase.from('daily_campaign_data').delete().eq('record_date', targetDateStr);

    // Insert campaign data with robust batch processing (like force-historical-sync)
    const campaignBatchSize = 1000;
    const maxExecutionTime = 420000; // 7 minutes (leave 3 min buffer for Supabase 10min limit)
    let totalInserted = 0;
    
    console.log(`📦 Starting Campaign batch processing: ${campaignRecords.length} total records in batches of ${campaignBatchSize}`);
    
    for (let i = 0; i < campaignRecords.length; i += campaignBatchSize) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`⏰ Campaign processing timeout approaching, processed ${totalInserted} of ${campaignRecords.length} records`);
        break;
      }
      
      const batch = campaignRecords.slice(i, i + campaignBatchSize);
      const batchNum = Math.floor(i / campaignBatchSize) + 1;
      const totalBatches = Math.ceil(campaignRecords.length / campaignBatchSize);
      
      console.log(`📦 Processing Campaign batch ${batchNum}/${totalBatches} (${batch.length} records)`);
      
      const { data: inserted, error } = await supabase
        .from('daily_campaign_data')
        .insert(batch)
        .select();

      if (error) {
        // If duplicate key error, try upsert
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          console.log(`🔄 Duplicate keys detected, using upsert for Campaign batch ${batchNum}`);
          
          const { data: upserted, error: upsertError } = await supabase
            .from('daily_campaign_data')
            .upsert(batch, { 
              onConflict: 'record_date,merchant_token,campaign_name',
              ignoreDuplicates: false 
            })
            .select();
            
          if (upsertError) {
            console.error(`❌ Campaign batch ${batchNum} upsert error:`, upsertError);
            throw upsertError;
          }
          totalInserted += upserted?.length || 0;
        } else {
          console.error(`❌ Campaign batch ${batchNum} error:`, error);
          throw error;
        }
      } else {
        totalInserted += inserted?.length || 0;
      }
      console.log(`✅ Campaign batch ${batchNum}/${totalBatches}: ${batch.length} records processed (${totalInserted}/${campaignRecords.length} total)`);
      
      // Delay between batches to prevent CPU overload
      if (i + campaignBatchSize < campaignRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update sync status
    await supabase
      .from('daily_sync_status')
      .upsert({
        sync_type: 'campaign',
        sync_date: targetDateStr,
        status: 'completed',
        records_processed: totalInserted,
        last_run_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        error_message: null
      }, { onConflict: 'sync_type,sync_date' });

    console.log(`✅ Daily campaign sync completed - banked ${totalInserted} campaign records`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily campaign data synced successfully',
      data: {
        date: targetDateStr,
        records: totalInserted
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Error in daily campaign sync:', error);

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
          sync_type: 'campaign',
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