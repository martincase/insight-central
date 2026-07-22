import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🕐 Daily Inventory Sync started at:', new Date().toISOString());

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Google Sheets API key
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')
    if (!googleSheetsApiKey) {
      throw new Error('GOOGLE_SHEETS_API_KEY not found in environment variables')
    }

    // Google Sheets configuration
    const SHEET_ID = '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw'
    const FBM_RANGE = 'Inventory V2!A:Z'
    const FBA_RANGE = 'FBA Inventory!A:Z'
    
    // New FBM Inventory sheet configuration
    const NEW_FBM_SHEET_ID = '1euLB020nTjg8xdDgB9oAEaRPed7kIpSUHjxuybpGVbw'
    const NEW_FBM_RANGE = 'Sheet1!A:Z'
    
    // Use current date for syncing
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recordDate = yesterday.toISOString().split('T')[0]
    
    console.log(`[INVENTORY] Syncing data for date: ${yesterday.toISOString()}`);
    console.log(`📅 Syncing inventory data for date: ${recordDate}`);

    // Fetch data from both Google Sheets
    const fbmUrl = `https://sheets.googleapis.com/v4/spreadsheets/${NEW_FBM_SHEET_ID}/values/${NEW_FBM_RANGE}?key=${googleSheetsApiKey}`
    const fbaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${FBA_RANGE}?key=${googleSheetsApiKey}`
    
    console.log('📦 Fetching FBM inventory data from new sheet:', NEW_FBM_SHEET_ID)
    console.log('📦 Fetching FBA inventory data from existing sheet:', SHEET_ID)
    
    const [fbmResponse, fbaResponse] = await Promise.all([
      fetch(fbmUrl),
      fetch(fbaUrl)
    ])
    
    if (!fbmResponse.ok) {
      throw new Error(`Failed to fetch FBM data: ${fbmResponse.status} ${fbmResponse.statusText}`)
    }
    
    if (!fbaResponse.ok) {
      throw new Error(`Failed to fetch FBA data: ${fbaResponse.status} ${fbaResponse.statusText}`)
    }

    const [fbmData, fbaData] = await Promise.all([
      fbmResponse.json(),
      fbaResponse.json()
    ])
    
    const fbmRows = fbmData.values || []
    const fbaRows = fbaData.values || []
    
    console.log(`📦 Fetched ${fbmRows.length} FBM rows and ${fbaRows.length} FBA rows from Google Sheets`)
    
    if (fbmRows.length <= 1 && fbaRows.length <= 1) {
      console.log('⚠️ No inventory data found in sheets');
      
      // Update sync status with warning
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'inventory',
          sync_date: recordDate,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No data found in Google Sheets'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No inventory data found to sync',
        processed: 0,
        recordDate: recordDate 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Merge the datasets and track which rows came from which source
    const rows = []
    const rowSources = [] // Track whether each row is from FBM or FBA
    
    // Add FBM data
    for (let i = 0; i < fbmRows.length; i++) {
      rows.push(fbmRows[i])
      rowSources.push(i === 0 ? 'header' : 'fbm')
    }
    
    // Add FBA data (skip FBA headers)
    if (fbaRows.length > 1) {
      for (let i = 1; i < fbaRows.length; i++) {
        rows.push(fbaRows[i])
        rowSources.push('fba')
      }
    }
    
    console.log(`📦 Total merged rows: ${rows.length} (FBM: ${fbmRows.length}, FBA: ${fbaRows.length - 1})`)

    // Parse headers to find column indices
    const headers = rows[0]
    console.log('📦 Headers:', headers)
    
    const columnMapping = {
      date: headers.findIndex((h: string) => h && h.toLowerCase().includes('date')),
      accountName: headers.findIndex((h: string) => h === 'account_name'),
      quantity: headers.findIndex((h: string) => 
        h === 'merchant_listings_all_data__quantity' || h === 'restock_inventory_recommendations_report__available'
      ),
      asin: headers.findIndex((h: string) => 
        h === 'merchant_listings_all_data__asin1' || h === 'asin' || h === 'restock_inventory_recommendations_report__asin'
      ),
      productName: headers.findIndex((h: string) => 
        h === 'merchant_listings_all_data__item_name' || h === 'product-name'
      ),
      sku: headers.findIndex((h: string) => 
        h === 'merchant_listings_all_data__seller_sku' || h === 'sku'
      ),
      price: headers.findIndex((h: string) => 
        h === 'merchant_listings_all_data__price' || h === 'your-price'
      ),
      fulfillmentChannel: headers.findIndex((h: string) => 
        h === 'merchant_listings_all_data__fulfillment_channel' || h === 'fulfillment-channel'
      ),
    }
    
    console.log('📦 Column mapping:', columnMapping)

    // Check if we have required columns
    if (columnMapping.accountName === -1 || columnMapping.asin === -1 || columnMapping.sku === -1) {
      throw new Error('Required columns not found in Google Sheets data')
    }

    // Clear existing data for this date
    console.log(`🗑️ Clearing existing inventory data for ${recordDate}...`)
    const { error: deleteError } = await supabase
      .from('daily_inventory_data')
      .delete()
      .eq('record_date', recordDate)
    
    if (deleteError) {
      console.error('❌ Error clearing existing data:', deleteError)
      throw deleteError
    }

    // Process and collect all inventory data first
    const rawInventoryRecords = []
    let processedCount = 0
    let skippedCount = 0

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const rowSource = rowSources[i]
      
      if (!row || row.length === 0) {
        skippedCount++
        continue
      }

      const accountName = row[columnMapping.accountName] || ''
      const asin = row[columnMapping.asin] || ''
      const sku = row[columnMapping.sku] || ''
      
      // Skip rows without essential data
      if (!accountName || !asin || !sku) {
        skippedCount++
        continue
      }

      const quantity = parseFloat(row[columnMapping.quantity] || '0') || 0
      const price = parseFloat(row[columnMapping.price] || '0') || 0
      const productName = row[columnMapping.productName] || ''
      
      // Determine fulfillment type based on data source
      let fulfillmentType = ''
      
      if (rowSource === 'fba') {
        // If row comes from FBA sheet, mark as FBA regardless of quantity
        fulfillmentType = 'FBA'
      } else {
        // For FBM data, check the fulfillment channel column
        fulfillmentType = row[columnMapping.fulfillmentChannel] || 'FBM'
        
        // If fulfillment channel is AFN (Amazon Fulfillment Network), it's FBA
        if (fulfillmentType === 'AFN') {
          fulfillmentType = 'FBA'
        }
      }

      const inventoryRecord = {
        record_date: recordDate,
        merchant_token: accountName,
        account_name: accountName,
        sku: sku.trim(),
        asin: asin.trim(),
        product_name: productName.trim(),
        quantity: quantity,
        price: price,
        fulfillment_type: fulfillmentType,
        row_source: rowSource, // Track source for prioritization
        created_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      }

      rawInventoryRecords.push(inventoryRecord)
      processedCount++
    }

    console.log(`📦 Collected ${rawInventoryRecords.length} raw records`)

    // Deduplicate and prioritize FBA over FBM for same SKU (same as existing logic)
    const inventoryMap = new Map()
    let fbaOverriddenCount = 0

    for (const record of rawInventoryRecords) {
      const key = `${record.merchant_token}_${record.sku}_${record.asin}`
      const existingRecord = inventoryMap.get(key)

      if (!existingRecord) {
        // First record for this SKU
        const finalRecord = { ...record }
        delete finalRecord.row_source // Remove temporary field
        inventoryMap.set(key, finalRecord)
      } else {
        // Duplicate SKU found - prioritize FBA over FBM
        if (record.row_source === 'fba' && existingRecord.fulfillment_type !== 'FBA') {
          console.log(`🔄 FBA overriding FBM for SKU ${record.sku}: quantity ${existingRecord.quantity} -> ${record.quantity}`)
          const finalRecord = { ...record }
          delete finalRecord.row_source // Remove temporary field
          inventoryMap.set(key, finalRecord)
          fbaOverriddenCount++
        } else if (record.row_source === 'fbm' && existingRecord.fulfillment_type === 'FBA') {
          // Keep existing FBA record, ignore FBM duplicate
          console.log(`⏭️ Keeping FBA record over FBM for SKU ${record.sku}`)
        } else {
          // Same fulfillment type or FBM overriding FBM - keep latest
          const finalRecord = { ...record }
          delete finalRecord.row_source // Remove temporary field
          inventoryMap.set(key, finalRecord)
        }
      }
    }

    const inventoryRecords = Array.from(inventoryMap.values())
    console.log(`📦 Final deduplicated records: ${inventoryRecords.length} (FBA overrides: ${fbaOverriddenCount})`)

    if (inventoryRecords.length === 0) {
      console.log('⚠️ No valid inventory records to insert')
      
      // Update sync status
      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'inventory',
          sync_date: recordDate,
          status: 'completed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          error_message: 'No valid inventory records found'
        }, { onConflict: 'sync_type,sync_date' });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No valid inventory data found',
        processed: 0,
        recordDate: recordDate
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert records with robust batch processing (enhanced like other functions)
    const batchSize = 1000
    const maxExecutionTime = 420000; // 7 minutes
    let insertedCount = 0
    
    console.log(`📦 Starting inventory batch processing: ${inventoryRecords.length} total records in batches of ${batchSize}`)
    
    for (let i = 0; i < inventoryRecords.length; i += batchSize) {
      // Check timeout
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`⏰ Inventory processing timeout approaching, processed ${insertedCount} of ${inventoryRecords.length} records`);
        break;
      }

      const batch = inventoryRecords.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(inventoryRecords.length / batchSize);
      
      console.log(`📤 Processing inventory batch ${batchNum}/${totalBatches}: ${batch.length} records`)
      
      const { data: upserted, error: insertError } = await supabase
        .from('daily_inventory_data')
        .upsert(batch, {
          onConflict: 'record_date,merchant_token,sku,asin'
        })
        .select();
      
      if (insertError) {
        console.error(`❌ Inventory batch ${batchNum} error:`, insertError)
        throw insertError
      }
      
      insertedCount += upserted?.length || 0;
      console.log(`✅ Inventory batch ${batchNum}/${totalBatches}: ${batch.length} records processed (${insertedCount}/${inventoryRecords.length} total)`);
      
      // Delay between batches to prevent CPU overload
      if (i + batchSize < inventoryRecords.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update sync status
    await supabase
      .from('daily_sync_status')
      .upsert({
        sync_type: 'inventory',
        sync_date: recordDate,
        status: 'completed',
        records_processed: insertedCount,
        last_run_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        error_message: null
      }, { onConflict: 'sync_type,sync_date' });

    console.log(`✅ Daily inventory sync completed - banked ${insertedCount} inventory records for ${recordDate}`)

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully synced inventory data for ${recordDate}`,
      recordDate: recordDate,
      totalFetched: rows.length - 1,
      processed: processedCount,
      inserted: insertedCount,
      skipped: skippedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Daily inventory sync error:', error)
    
    // Log error to sync status
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recordDate = yesterday.toISOString().split('T')[0];

      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'inventory',
          sync_date: recordDate,
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
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
