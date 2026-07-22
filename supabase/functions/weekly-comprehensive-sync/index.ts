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

  try {
    const requestBody = await req.json().catch(() => ({}));
    const daysBack = requestBody.days_back || 7;
    
    console.log(`Starting comprehensive data sync for past ${daysBack} days...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleSheetsApiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !googleSheetsApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate date range for past N days
    const dates = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    console.log(`Processing data for dates: ${dates.join(', ')}`);

    // Google Sheets configuration
    const sheets = {
      sales: { id: '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw', range: 'Sales Data!A:Z' },
      ppc: { id: '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw', range: 'PPC Data!A:Z' },
      campaigns: { id: '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw', range: 'PPC Campaigns!A:Z' },
      asin: { id: '1il1doajzBPxg5uO8BOPJNxtCt9w2JRGajL5XhWAIYC0', range: 'Sheet1!A:Z' },
      vendor: { id: '1il1doajzBPxg5uO8BOPJNxtCt9w2JRGajL5XhWAIYC0', range: 'Sheet1!A:Z' },
      inventory_fbm: { id: '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw', range: 'FBM Inventory!A:Z' },
      inventory_fba: { id: '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw', range: 'FBA Inventory!A:Z' },
      accounts: { id: '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw', range: 'Accounts Master!A:Z' }
    };

    const syncResults = {
      sales: 0,
      ppc: 0,
      campaigns: 0,
      asin: 0,
      vendor: 0,
      inventory: 0,
      accounts: 0,
      errors: []
    };

    // Sync Sales and PPC Data
    try {
      console.log('Fetching sales and PPC data...');
      const [salesResponse, ppcResponse] = await Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.sales.id}/values/${sheets.sales.range}?key=${googleSheetsApiKey}`),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.ppc.id}/values/${sheets.ppc.range}?key=${googleSheetsApiKey}`)
      ]);

      const [salesData, ppcData] = await Promise.all([
        salesResponse.json(),
        ppcResponse.json()
      ]);

      if (salesData.values && ppcData.values) {
        const salesHeaders = salesData.values[0];
        const ppcHeaders = ppcData.values[0];

        // Process sales and PPC data for each date
        for (const targetDate of dates) {
          // Clear existing data for the date
          await Promise.all([
            supabase.from('daily_sales_ppc_data').delete().eq('record_date', targetDate),
            supabase.from('daily_ppc_data').delete().eq('record_date', targetDate)
          ]);

          // Process sales data
          const salesRecords = [];
          for (let i = 1; i < salesData.values.length; i++) {
            const row = salesData.values[i];
            const rowData = {};
            salesHeaders.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });

            const rowDate = new Date(rowData['Date']);
            if (rowDate.toISOString().split('T')[0] === targetDate && rowData['Merchant Token']) {
              salesRecords.push({
                record_date: targetDate,
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

          // Process PPC data
          const ppcRecords = [];
          for (let i = 1; i < ppcData.values.length; i++) {
            const row = ppcData.values[i];
            const rowData = {};
            ppcHeaders.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });

            const rowDate = new Date(rowData['Date']);
            if (rowDate.toISOString().split('T')[0] === targetDate && rowData['Merchant Token']) {
              const spend = parseFloat(rowData['PPC Spend']) || 0;
              const sales = parseFloat(rowData['PPC Sales']) || 0;
              const acos = sales > 0 ? (spend / sales) * 100 : 0;

              ppcRecords.push({
                record_date: targetDate,
                merchant_token: rowData['Merchant Token'],
                ppc_account_name: rowData['PPC Account Name'] || '',
                account_name: rowData['Account Name'] || '',
                ppc_spend: spend,
                ppc_sales: sales,
                acos: acos,
                tacos: parseFloat(rowData['TACOS']) || 0,
                advertising_reliance: parseFloat(rowData['Advertising Reliance']) || 0,
                last_synced_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
            }
          }

          // Insert records in batches
          if (salesRecords.length > 0) {
            const { error } = await supabase.from('daily_sales_ppc_data').insert(salesRecords);
            if (error) throw error;
            syncResults.sales += salesRecords.length;
          }

          if (ppcRecords.length > 0) {
            const { error } = await supabase.from('daily_ppc_data').insert(ppcRecords);
            if (error) throw error;
            syncResults.ppc += ppcRecords.length;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing sales/PPC data:', error);
      syncResults.errors.push(`Sales/PPC: ${error.message}`);
    }

    // Sync Campaign Data
    try {
      console.log('Fetching campaign data...');
      const campaignResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.campaigns.id}/values/${sheets.campaigns.range}?key=${googleSheetsApiKey}`);
      const campaignData = await campaignResponse.json();

      if (campaignData.values) {
        const headers = campaignData.values[0];

        for (const targetDate of dates) {
          await supabase.from('daily_campaign_data').delete().eq('record_date', targetDate);

          const campaignRecords = [];
          for (let i = 1; i < campaignData.values.length; i++) {
            const row = campaignData.values[i];
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });

            const rowDate = new Date(rowData['Date']);
            if (rowDate.toISOString().split('T')[0] === targetDate && rowData['Merchant Token']) {
              const spend = parseFloat(rowData['Spend']) || 0;
              const sales = parseFloat(rowData['Sales']) || 0;
              const acos = sales > 0 ? (spend / sales) * 100 : 0;

              campaignRecords.push({
                record_date: targetDate,
                merchant_token: rowData['Merchant Token'],
                account_name: rowData['Account Name'] || '',
                campaign_name: rowData['Campaign Name'] || '',
                spend: spend,
                sales: sales,
                acos: acos,
                last_synced_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
            }
          }

          if (campaignRecords.length > 0) {
            const { error } = await supabase.from('daily_campaign_data').insert(campaignRecords);
            if (error) throw error;
            syncResults.campaigns += campaignRecords.length;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing campaign data:', error);
      syncResults.errors.push(`Campaigns: ${error.message}`);
    }

    // Sync ASIN Data
    try {
      console.log('Fetching ASIN data...');
      const asinResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.asin.id}/values/${sheets.asin.range}?key=${googleSheetsApiKey}`);
      const asinData = await asinResponse.json();

      if (asinData.values) {
        const headers = asinData.values[0];

        for (const targetDate of dates) {
          await supabase.from('daily_asin_data').delete().eq('record_date', targetDate);

          const asinRecords = [];
          for (let i = 1; i < asinData.values.length; i++) {
            const row = asinData.values[i];
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });

            const rowDate = new Date(rowData['Date']);
            if (rowDate.toISOString().split('T')[0] === targetDate && rowData['Merchant Token']) {
              asinRecords.push({
                record_date: targetDate,
                merchant_token: rowData['Merchant Token'],
                account_name: rowData['Account Name'] || '',
                parent_asin: rowData['Parent ASIN'] || '',
                child_asin: rowData['Child ASIN'] || '',
                product_title: rowData['Product Title'] || '',
                sales: parseFloat(rowData['Sales']) || 0,
                units_sold: parseFloat(rowData['Units Sold']) || 0,
                page_views: parseFloat(rowData['Page Views']) || 0,
                buy_box_percentage: parseFloat(rowData['Buy Box Percentage']) || 0,
                conversion_rate: parseFloat(rowData['Conversion Rate']) || 0,
                last_synced_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
            }
          }

          if (asinRecords.length > 0) {
            const { error } = await supabase.from('daily_asin_data').insert(asinRecords);
            if (error) throw error;
            syncResults.asin += asinRecords.length;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing ASIN data:', error);
      syncResults.errors.push(`ASIN: ${error.message}`);
    }

    // Sync Vendor Data
    try {
      console.log('Fetching vendor data...');
      const vendorResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.vendor.id}/values/${sheets.vendor.range}?key=${googleSheetsApiKey}`);
      const vendorData = await vendorResponse.json();

      if (vendorData.values) {
        const headers = vendorData.values[0];

        for (const targetDate of dates) {
          await supabase.from('daily_vendor_data').delete().eq('record_date', targetDate);

          const vendorRecords = [];
          for (let i = 1; i < vendorData.values.length; i++) {
            const row = vendorData.values[i];
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });

            const rowDate = new Date(rowData['Date']);
            if (rowDate.toISOString().split('T')[0] === targetDate && rowData['Merchant Token']) {
              vendorRecords.push({
                record_date: targetDate,
                merchant_token: rowData['Merchant Token'],
                account_name: rowData['Account Name'] || '',
                asin: rowData['ASIN'] || '',
                sales: parseFloat(rowData['Sales']) || 0,
                units_ordered: parseFloat(rowData['Units Ordered']) || 0,
                page_views: parseFloat(rowData['Page Views']) || 0,
                buy_box_percentage: parseFloat(rowData['Buy Box Percentage']) || 0,
                conversion_rate: parseFloat(rowData['Conversion Rate']) || 0,
                shipped_revenue_amount: parseFloat(rowData['Shipped Revenue Amount']) || 0,
                shipped_cogs_amount: parseFloat(rowData['Shipped COGS Amount']) || 0,
                last_synced_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
            }
          }

          if (vendorRecords.length > 0) {
            const { error } = await supabase.from('daily_vendor_data').insert(vendorRecords);
            if (error) throw error;
            syncResults.vendor += vendorRecords.length;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing vendor data:', error);
      syncResults.errors.push(`Vendor: ${error.message}`);
    }

    // Sync Inventory Data
    try {
      console.log('Fetching inventory data...');
      const [fbmResponse, fbaResponse] = await Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.inventory_fbm.id}/values/${sheets.inventory_fbm.range}?key=${googleSheetsApiKey}`),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.inventory_fba.id}/values/${sheets.inventory_fba.range}?key=${googleSheetsApiKey}`)
      ]);

      const [fbmData, fbaData] = await Promise.all([
        fbmResponse.json(),
        fbaResponse.json()
      ]);

      for (const targetDate of dates) {
        await supabase.from('daily_inventory_data').delete().eq('record_date', targetDate);

        const inventoryRecords = [];
        const processedSKUs = new Set();

        // Process FBA data first (higher priority)
        if (fbaData.values) {
          const headers = fbaData.values[0];
          for (let i = 1; i < fbaData.values.length; i++) {
            const row = fbaData.values[i];
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });

            const rowDate = new Date(rowData['Date']);
            if (rowDate.toISOString().split('T')[0] === targetDate && rowData['Merchant Token'] && rowData['SKU']) {
              const key = `${rowData['Merchant Token']}-${rowData['SKU']}-${rowData['ASIN']}`;
              processedSKUs.add(key);

              inventoryRecords.push({
                record_date: targetDate,
                merchant_token: rowData['Merchant Token'],
                account_name: rowData['Account Name'] || '',
                sku: rowData['SKU'],
                asin: rowData['ASIN'] || '',
                product_name: rowData['Product Name'] || '',
                quantity: parseFloat(rowData['Quantity']) || 0,
                price: parseFloat(rowData['Price']) || 0,
                fulfillment_type: 'FBA',
                last_synced_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
            }
          }
        }

        // Process FBM data (only if not already processed as FBA)
        if (fbmData.values) {
          const headers = fbmData.values[0];
          for (let i = 1; i < fbmData.values.length; i++) {
            const row = fbmData.values[i];
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index] || '';
            });

            const rowDate = new Date(rowData['Date']);
            if (rowDate.toISOString().split('T')[0] === targetDate && rowData['Merchant Token'] && rowData['SKU']) {
              const key = `${rowData['Merchant Token']}-${rowData['SKU']}-${rowData['ASIN']}`;
              
              if (!processedSKUs.has(key)) {
                inventoryRecords.push({
                  record_date: targetDate,
                  merchant_token: rowData['Merchant Token'],
                  account_name: rowData['Account Name'] || '',
                  sku: rowData['SKU'],
                  asin: rowData['ASIN'] || '',
                  product_name: rowData['Product Name'] || '',
                  quantity: parseFloat(rowData['Quantity']) || 0,
                  price: parseFloat(rowData['Price']) || 0,
                  fulfillment_type: 'FBM',
                  last_synced_at: new Date().toISOString(),
                  created_at: new Date().toISOString()
                });
              }
            }
          }
        }

        if (inventoryRecords.length > 0) {
          const { error } = await supabase.from('daily_inventory_data').insert(inventoryRecords);
          if (error) throw error;
          syncResults.inventory += inventoryRecords.length;
        }
      }
    } catch (error) {
      console.error('Error syncing inventory data:', error);
      syncResults.errors.push(`Inventory: ${error.message}`);
    }

    // Sync Accounts Data
    try {
      console.log('Fetching accounts data...');
      const accountsResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheets.accounts.id}/values/${sheets.accounts.range}?key=${googleSheetsApiKey}`);
      const accountsData = await accountsResponse.json();

      if (accountsData.values) {
        const headers = accountsData.values[0];
        const accountRecords = [];

        for (let i = 1; i < accountsData.values.length; i++) {
          const row = accountsData.values[i];
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] || '';
          });

          if (rowData['Merchant Token']) {
            accountRecords.push({
              merchant_token: rowData['Merchant Token'],
              account_name: rowData['Account Name'] || '',
              account_type: rowData['Account Type'] || '',
              ppc_account_name: rowData['PPC Account Name'] || '',
              seller_central_link: rowData['Seller Central Link'] || '',
              status: rowData['Status'] || 'active',
              is_starred: rowData['Is Starred'] === 'TRUE' || false,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            });
          }
        }

        if (accountRecords.length > 0) {
          const { error } = await supabase
            .from('accounts_master')
            .upsert(accountRecords, { onConflict: 'merchant_token' });
          if (error) throw error;
          syncResults.accounts += accountRecords.length;
        }
      }
    } catch (error) {
      console.error('Error syncing accounts data:', error);
      syncResults.errors.push(`Accounts: ${error.message}`);
    }

    // Update sync status
    const status = syncResults.errors.length > 0 ? 'completed_with_errors' : 'completed';
    const totalRecords = Object.values(syncResults).reduce((sum, val) => 
      typeof val === 'number' ? sum + val : sum, 0
    );

    await supabase
      .from('daily_sync_status')
      .upsert({
        sync_type: 'weekly_comprehensive',
        sync_date: new Date().toISOString().split('T')[0],
        status: status,
        records_processed: totalRecords,
        last_run_at: new Date().toISOString(),
        execution_time_ms: Date.now(),
        error_message: syncResults.errors.length > 0 ? syncResults.errors.join('; ') : null
      }, { onConflict: 'sync_type,sync_date' });

    console.log('Weekly comprehensive sync completed', syncResults);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Weekly comprehensive data sync completed',
        data: {
          dates_processed: dates,
          results: syncResults,
          total_records: totalRecords
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in weekly comprehensive sync:', error);

    // Log error to sync status
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabase
        .from('daily_sync_status')
        .upsert({
          sync_type: 'weekly_comprehensive',
          sync_date: new Date().toISOString().split('T')[0],
          status: 'failed',
          records_processed: 0,
          last_run_at: new Date().toISOString(),
          error_message: error.message
        }, { onConflict: 'sync_type,sync_date' });
    } catch (logError) {
      console.error('Failed to log error status:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});