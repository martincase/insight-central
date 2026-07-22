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
    console.log('🚀 Starting daily sales and PPC data sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !googleSheetsApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Google Sheets configuration
    const salesSheetId = '1vdpd9MIh9O_cDVyh-Kk2p9Gi7RjlzBFVJClaTFYOWUE';
    const ppcSheetId = '1PwVUhyXPKL0-NmSl0X2YUevRuUQfSMCJhYQjQZc6bgQ';
    const salesRange = 'Daily Sales!A:Z';
    const ppcRange = 'Daily PPC V2!A:Z';

    // Use current date for syncing
    const targetDate = new Date();
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    console.log(`[SALES_PPC] Syncing data for date: ${targetDate.toISOString()}`);
    console.log(`📅 Processing data for date: ${targetDateStr}`);

    // Fetch both sheets in parallel
    console.log('📊 Fetching sales and PPC data from Google Sheets...');
    const [salesResponse, ppcResponse] = await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${salesSheetId}/values/${salesRange}?key=${googleSheetsApiKey}`),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ppcSheetId}/values/${ppcRange}?key=${googleSheetsApiKey}`)
    ]);

    if (!salesResponse.ok || !ppcResponse.ok) {
      throw new Error(`Google Sheets API error: Sales ${salesResponse.status}, PPC ${ppcResponse.status}`);
    }

    const [salesData, ppcData] = await Promise.all([
      salesResponse.json(),
      ppcResponse.json()
    ]);

    if (!salesData.values || !ppcData.values) {
      console.log('⚠️ No data found in sheets');
      
      // Update sync status with warning
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'sales_ppc',
          sync_date: targetDateStr,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No data found in Google Sheets'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({
        success: true,
        message: 'No sales/PPC data found to sync',
        data: { date: targetDateStr, salesRecords: 0, ppcRecords: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const salesHeaders = salesData.values[0] || [];
    const ppcHeaders = ppcData.values[0] || [];

    // Debug: Log the PPC headers to see what columns are available
    console.log('📊 PPC Headers:', ppcHeaders);
    console.log('📊 Looking for impressions and clicks columns...');

    // Process sales data with validation
    const salesRecords = [];
    if (salesData.values.length > 1) {
      for (let i = 1; i < salesData.values.length; i++) {
        const row = salesData.values[i];
        if (!row || row.length === 0) continue;
        
        const rowData = {};
        salesHeaders.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });

        // Validate required fields and date
        const rowDate = new Date(rowData['Date']);
        if (rowDate.toISOString().split('T')[0] === targetDateStr && rowData['Merchant Token']) {
          salesRecords.push({
            record_date: targetDateStr,
            merchant_token: rowData['Merchant Token'],
            account_name: rowData['Account Name'] || '',
            sales: parseFloat(rowData['Sales']) || 0,
            units_ordered: parseFloat(rowData['Units Ordered']) || 0,
            page_views: parseFloat(rowData['Page Views']) || 0,
            buy_box_percentage: parseFloat(rowData['Buy Box Percentage']) || 0,
            conversion_rate: parseFloat(rowData['Conversion Rate']) || 0,
            last_synced_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        }
      }
    }

    // Process PPC data with validation
    const ppcRecords = [];
    if (ppcData.values.length > 1) {
      for (let i = 1; i < ppcData.values.length; i++) {
        const row = ppcData.values[i];
        if (!row || row.length === 0) continue;
        
        const rowData = {};
        ppcHeaders.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });

        // Helper function to parse numbers that might have commas or other formatting
        const parseNumber = (value: string | number): number => {
          if (typeof value === 'number') return value;
          if (!value || value === '') return 0;
          
          // Convert to string and remove commas, spaces, and other formatting
          const cleanValue = String(value).replace(/[,\s]/g, '');
          
          // Handle scientific notation and regular numbers
          const parsed = parseFloat(cleanValue);
          return isNaN(parsed) ? 0 : parsed;
        };

        // Validate required fields and date using actual Google Sheets column names
        const rowDate = new Date(rowData['date']);
        if (rowDate.toISOString().split('T')[0] === targetDateStr && rowData['account_name']) {
          const ppcSpend = parseNumber(rowData['sponsored_products_campaign__cost']);
          const ppcSales = parseNumber(rowData['sponsored_products_campaign__attributedsales14d']);
          
          // Get clicks and impressions with enhanced parsing
          const impressionsRaw = rowData['sponsored_products_campaign__impressions'];
          const clicksRaw = rowData['sponsored_products_campaign__clicks'];
          const impressions = parseNumber(impressionsRaw);
          const clicks = parseNumber(clicksRaw);
          
          // Comprehensive debug logging
          console.log('📊 Raw PPC Data:', {
            account: rowData['account_name'],
            date: targetDateStr,
            raw_clicks: clicksRaw,
            raw_impressions: impressionsRaw,
            parsed_clicks: clicks,
            parsed_impressions: impressions,
            raw_spend: rowData['sponsored_products_campaign__cost'],
            parsed_spend: ppcSpend,
            raw_sales: rowData['sponsored_products_campaign__attributedsales14d'],  
            parsed_sales: ppcSales
          });
          
          const acos = ppcSales > 0 ? (ppcSpend / ppcSales) * 100 : 0;
          const sales = parseFloat(rowData['Sales']) || 0; // This might need adjustment too
          const tacos = sales > 0 ? (ppcSpend / sales) * 100 : 0;
          const advertisingReliance = sales > 0 ? (ppcSales / sales) * 100 : 0;

          ppcRecords.push({
            record_date: targetDateStr,
            merchant_token: rowData['account_name'], // Using account_name as identifier for now
            account_name: rowData['account_name'] || '',
            ppc_account_name: rowData['account_name'] || '',
            ppc_spend: ppcSpend,
            ppc_sales: ppcSales,
            impressions: impressions,
            clicks: clicks,
            acos: acos,
            tacos: tacos,
            advertising_reliance: advertisingReliance,
            last_synced_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        }
      }
    }

    console.log(`✅ Validated ${salesRecords.length} sales records and ${ppcRecords.length} PPC records`);

    // Clear existing data for the target date
    console.log('🗑️ Clearing existing data for target date...');
    await Promise.all([
      supabase.from('perplexity_sales_data').delete().eq('record_date', targetDateStr),
      supabase.from('daily_ppc_data').delete().eq('record_date', targetDateStr)
    ]);

    let totalInserted = 0;
    const maxExecutionTime = 420000; // 7 minutes

    // Insert sales data with robust batch processing
    if (salesRecords.length > 0) {
      const salesBatchSize = 1000;
      console.log(`📦 Starting sales batch processing: ${salesRecords.length} records in batches of ${salesBatchSize}`);
      
      for (let i = 0; i < salesRecords.length; i += salesBatchSize) {
        // Check timeout
        if (Date.now() - startTime > maxExecutionTime) {
          console.log(`⏰ Sales processing timeout approaching`);
          break;
        }

        const batch = salesRecords.slice(i, i + salesBatchSize);
        const batchNum = Math.floor(i / salesBatchSize) + 1;
        const totalBatches = Math.ceil(salesRecords.length / salesBatchSize);
        
        console.log(`📦 Processing sales batch ${batchNum}/${totalBatches} (${batch.length} records)`);

        const { data: inserted, error } = await supabase
          .from('perplexity_sales_data')
          .insert(batch)
          .select();

        if (error) {
          // If duplicate key error, try upsert fallback
          if (error.message?.includes('duplicate key') || error.code === '23505') {
            console.log(`🔄 Duplicate keys detected, using upsert for sales batch ${batchNum}`);
            
            const { data: upserted, error: upsertError } = await supabase
              .from('perplexity_sales_data')
              .upsert(batch, { 
                onConflict: 'record_date,merchant_token',
                ignoreDuplicates: false 
              })
              .select();
              
            if (upsertError) {
              console.error(`❌ Sales batch ${batchNum} upsert error:`, upsertError);
              throw upsertError;
            }
            totalInserted += upserted?.length || 0;
          } else {
            console.error(`❌ Sales batch ${batchNum} error:`, error);
            throw error;
          }
        } else {
          totalInserted += inserted?.length || 0;
        }
        
        console.log(`✅ Sales batch ${batchNum}/${totalBatches} completed`);
        
        // Delay between batches
        if (i + salesBatchSize < salesRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Insert PPC data with robust batch processing
    if (ppcRecords.length > 0) {
      const ppcBatchSize = 1000;
      console.log(`📦 Starting PPC batch processing: ${ppcRecords.length} records in batches of ${ppcBatchSize}`);
      
      for (let i = 0; i < ppcRecords.length; i += ppcBatchSize) {
        // Check timeout
        if (Date.now() - startTime > maxExecutionTime) {
          console.log(`⏰ PPC processing timeout approaching`);
          break;
        }

        const batch = ppcRecords.slice(i, i + ppcBatchSize);
        const batchNum = Math.floor(i / ppcBatchSize) + 1;
        const totalBatches = Math.ceil(ppcRecords.length / ppcBatchSize);
        
        console.log(`📦 Processing PPC batch ${batchNum}/${totalBatches} (${batch.length} records)`);

        const { data: inserted, error } = await supabase
          .from('daily_ppc_data')
          .insert(batch)
          .select();

        if (error) {
          // If duplicate key error, try upsert fallback
          if (error.message?.includes('duplicate key') || error.code === '23505') {
            console.log(`🔄 Duplicate keys detected, using upsert for PPC batch ${batchNum}`);
            
            const { data: upserted, error: upsertError } = await supabase
              .from('daily_ppc_data')
              .upsert(batch, { 
                onConflict: 'record_date,merchant_token,ppc_account_name',
                ignoreDuplicates: false 
              })
              .select();
              
            if (upsertError) {
              console.error(`❌ PPC batch ${batchNum} upsert error:`, upsertError);
              throw upsertError;
            }
            totalInserted += upserted?.length || 0;
          } else {
            console.error(`❌ PPC batch ${batchNum} error:`, error);
            throw error;
          }
        } else {
          totalInserted += inserted?.length || 0;
        }
        
        console.log(`✅ PPC batch ${batchNum}/${totalBatches} completed`);
        
        // Delay between batches
        if (i + ppcBatchSize < ppcRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Update sync status
    await supabase
      .from('daily_sync_status')
      .upsert({
        sync_type: 'sales_ppc',
        sync_date: targetDateStr,
        status: 'completed',
        records_processed: totalInserted,
        sales_records: salesRecords.length,
        ppc_records: ppcRecords.length,
        last_run_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        error_message: null
      }, { onConflict: 'sync_type,sync_date' });

    console.log(`✅ Daily sales and PPC sync completed - banked ${totalInserted} total records`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily sales and PPC data synced successfully',
      data: {
        date: targetDateStr,
        salesRecords: salesRecords.length,
        ppcRecords: ppcRecords.length,
        totalRecords: totalInserted
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Error in daily sales/PPC sync:', error);

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
          sync_type: 'sales_ppc',
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