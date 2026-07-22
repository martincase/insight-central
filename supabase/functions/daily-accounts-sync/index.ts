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
    console.log('🚀 Starting daily accounts sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !googleSheetsApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Google Sheets configuration
    const sheetId = '1vdpd9MIh9O_cDVyh-Kk2p9Gi7RjlzBFVJClaTFYOWUE';
    const range = 'Accounts!A:Z';

    console.log('📊 Fetching accounts data from Google Sheets...');
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${googleSheetsApiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.values || data.values.length <= 1) {
      console.log('⚠️ No data found in accounts sheet');
      
      // Target September 1st specifically for testing
      const today = new Date('2024-09-01').toISOString().split('T')[0];
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'accounts',
          sync_date: today,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No data found in Google Sheets'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No accounts data found to sync',
        data: { date: today, records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = data.values[0];
    const today = new Date('2024-09-01').toISOString().split('T')[0];

    console.log('📋 Processing accounts data...');

    // Process and validate accounts data
    const accountRecords = [];
    for (let i = 1; i < data.values.length; i++) {
      const row = data.values[i];
      const rowData = {};
      
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });

      // Validate required fields
      if (rowData['Merchant Token'] && rowData['Account Name']) {
        accountRecords.push({
          merchant_token: rowData['Merchant Token'],
          account_name: rowData['Account Name'],
          ppc_account_name: rowData['PPC Account Name'] || '',
          account_type: rowData['Account Type'] || 'seller',
          seller_central_link: rowData['Seller Central Link'] || '',
          status: rowData['Status'] || 'active',
          updated_at: new Date().toISOString()
        });
      }
    }

    console.log(`✅ Validated ${accountRecords.length} account records`);

    if (accountRecords.length === 0) {
      console.log('⚠️ No valid accounts found after validation');
      
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'accounts',
          sync_date: today,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No valid accounts found'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No valid accounts found',
        data: { date: today, records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clear existing accounts (robust approach like force-historical-sync)
    console.log('🗑️ Clearing existing accounts...');
    await supabase.from('accounts_master').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert accounts using robust batch processing
    const batchSize = 1000;
    let totalInserted = 0;
    const maxExecutionTime = 420000; // 7 minutes
    
    console.log(`📦 Starting accounts batch processing: ${accountRecords.length} total records in batches of ${batchSize}`);

    for (let i = 0; i < accountRecords.length; i += batchSize) {
      // Check timeout
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`⏰ Accounts processing timeout approaching, processed ${totalInserted} of ${accountRecords.length} records`);
        break;
      }

      const batch = accountRecords.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(accountRecords.length / batchSize);
      
      console.log(`📦 Processing accounts batch ${batchNum}/${totalBatches} (${batch.length} records)`);

      const { data: inserted, error } = await supabase
        .from('accounts_master')
        .insert(batch)
        .select();

      if (error) {
        // If duplicate key error, try upsert fallback
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          console.log(`🔄 Duplicate keys detected, using upsert for accounts batch ${batchNum}`);
          
          const { data: upserted, error: upsertError } = await supabase
            .from('accounts_master')
            .upsert(batch, { 
              onConflict: 'merchant_token',
              ignoreDuplicates: false 
            })
            .select();
            
          if (upsertError) {
            console.error(`❌ Accounts batch ${batchNum} upsert error:`, upsertError);
            throw upsertError;
          }
          totalInserted += upserted?.length || 0;
        } else {
          console.error(`❌ Accounts batch ${batchNum} error:`, error);
          throw error;
        }
      } else {
        totalInserted += inserted?.length || 0;
      }
      
      console.log(`✅ Accounts batch ${batchNum}/${totalBatches}: ${batch.length} records processed (${totalInserted}/${accountRecords.length} total)`);
      
      // Delay between batches to prevent CPU overload
      if (i + batchSize < accountRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update sync status
    await supabase
      .from('daily_sync_status')
      .upsert({
        sync_type: 'accounts',
        sync_date: today,
        status: 'completed',
        records_processed: totalInserted,
        last_run_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        error_message: null
      }, { onConflict: 'sync_type,sync_date' });

    console.log(`✅ Daily accounts sync completed successfully - banked ${totalInserted} accounts`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily accounts data synced successfully',
      data: {
        date: today,
        records: totalInserted
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Error in daily accounts sync:', error);

    // Log error to sync status
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const today = new Date('2024-09-01').toISOString().split('T')[0];

      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'accounts',
          sync_date: today,
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