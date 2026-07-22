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
    console.log('🚀 Starting daily PPC campaign sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !googleSheetsApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Google Sheets configuration for PPC Campaign data
    const sheetId = '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw';
    const range = 'Daily PPC V2!A:Z';

    console.log('📊 Fetching PPC campaign data from Google Sheets...');
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${googleSheetsApiKey}`
    );

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.values || data.values.length === 0) {
      console.log('⚠️ No data found in sheet');
      
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'ppc_campaigns',
          sync_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No data found in Google Sheets'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No PPC campaign data found to sync',
        data: { records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = data.values[0] || [];
    console.log('📊 Sheet Headers:', headers);

    // Column mapping
    const columnMap = {
      'date': 'record_date',
      'datasource': 'datasource',
      'source': 'source',
      'account_id': 'account_id',
      'account_name': 'account_name',
      'sponsored_products_campaign__attributedsales14d': 'attributed_sales_14d',
      'sponsored_products_campaign__cost': 'cost',
      'sponsored_products_campaign__clicks': 'clicks',
      'sponsored_products_campaign__cpc': 'cpc',
      'sponsored_products_campaign__ctr': 'ctr',
      'sponsored_products_campaign__impressions': 'impressions'
    };

    // Process records
    const records = [];
    for (let i = 1; i < data.values.length; i++) {
      const row = data.values[i];
      if (!row || row.length === 0) continue;

      const rowData: Record<string, any> = {};
      headers.forEach((header: string, index: number) => {
        rowData[header] = row[index] || '';
      });

      // Map to database columns
      const record: Record<string, any> = {};
      
      for (const [sheetCol, dbCol] of Object.entries(columnMap)) {
        if (sheetCol === 'date') {
          // Parse and format date
          const dateValue = rowData[sheetCol];
          if (dateValue) {
            try {
              const parsedDate = new Date(dateValue);
              record[dbCol] = parsedDate.toISOString().split('T')[0];
            } catch (e) {
              console.warn(`Invalid date format in row ${i}: ${dateValue}`);
              continue;
            }
          } else {
            continue; // Skip records without date
          }
        } else if (['attributed_sales_14d', 'cost', 'cpc', 'ctr'].includes(dbCol)) {
          // Numeric columns - parse as float
          const value = rowData[sheetCol];
          record[dbCol] = value ? parseFloat(value) : 0;
        } else if (['clicks', 'impressions'].includes(dbCol)) {
          // Integer columns
          const value = rowData[sheetCol];
          record[dbCol] = value ? parseInt(value) : 0;
        } else {
          // String columns
          record[dbCol] = rowData[sheetCol] || '';
        }
      }

      // Validate required fields
      if (record.record_date && record.account_name) {
        records.push(record);
      }
    }

    console.log(`📦 Parsed ${records.length} valid PPC campaign records`);

    if (records.length === 0) {
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'ppc_campaigns',
          sync_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No valid records found'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No valid PPC campaign records to sync',
        data: { records: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process in batches of 1500
    const batchSize = 1500;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      console.log(`📤 Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} (${batch.length} records)...`);

      const { data: insertData, error: insertError } = await supabase
        .from('perplexity_ppc_campaigns')
        .upsert(batch, {
          onConflict: 'record_date,account_name',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} error:`, insertError);
        totalErrors += batch.length;
      } else {
        totalInserted += batch.length;
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed: ${batch.length} records`);
      }
    }

    const executionTime = Date.now() - startTime;

    // Update sync status
    await supabase
      .from('daily_sync_status')
      .upsert({
        sync_type: 'ppc_campaigns',
        sync_date: new Date().toISOString().split('T')[0],
        status: totalErrors > 0 ? 'partial_success' : 'success',
        records_processed: totalInserted,
        last_run_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        error_message: totalErrors > 0 ? `${totalErrors} records failed to insert` : null
      }, { onConflict: 'sync_type,sync_date' });

    console.log(`✅ PPC campaign sync completed: ${totalInserted} records inserted, ${totalErrors} errors in ${executionTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      message: 'PPC campaign data synced successfully',
      data: {
        totalRecords: records.length,
        inserted: totalInserted,
        errors: totalErrors,
        executionTimeMs: executionTime
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Sync error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
