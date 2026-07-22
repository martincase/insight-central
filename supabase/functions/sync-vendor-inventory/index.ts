import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VENDOR_ACCOUNTS = [
  'amzn1.vg.2072811-GB',
  'amzn1.vg.6672602-GB',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('🚀 Starting vendor inventory sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const windsorApiKey = Deno.env.get('WINDSOR_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    if (!windsorApiKey) {
      throw new Error('Missing WINDSOR_API_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const accountsParam = VENDOR_ACCOUNTS.join(',');

    // Step 1: Fetch inventory data from Windsor (inventory report fields only - cannot mix reports)
    const inventoryUrl = `https://connectors.windsor.ai/amazon_vendor?api_key=${windsorApiKey}&date_preset=last_7d&fields=date,account_name,account_id,asin,sellableOnHandInventoryUnits,sellableOnHandInventoryCost-amount,netReceivedInventoryUnits,openPurchaseOrderUnits,procurableProductOutOfStockRate,sellThroughRate,averageVendorLeadTimeDays,receiveFillRate,unfilledCustomerOrderedUnits&accounts=${accountsParam}`;

    console.log('📊 Fetching vendor inventory data from Windsor...');
    const invResponse = await fetch(inventoryUrl);
    if (!invResponse.ok) {
      const errText = await invResponse.text();
      throw new Error(`Windsor inventory API error ${invResponse.status}: ${errText}`);
    }
    const invData = await invResponse.json();
    const invRows = invData?.data || [];
    console.log(`📦 Received ${invRows.length} inventory rows from Windsor`);

    // Step 2: Try SP-API for product titles (if credentials available)
    const titleMap = new Map<string, string>();
    const spAccessToken = Deno.env.get('AMAZON_SP_ACCESS_TOKEN');
    
    if (spAccessToken) {
      console.log('🔑 SP-API credentials found, fetching product titles...');
      // Collect unique ASINs
      const allAsins = new Set<string>();
      for (const row of invRows) {
        const asin = row['asin'];
        if (asin) allAsins.add(asin);
      }
      const asinList = [...allAsins];
      console.log(`📝 ${asinList.length} unique ASINs to look up`);

      // Batch in groups of 20 (SP-API limit)
      const batchSize = 20;
      for (let i = 0; i < asinList.length; i += batchSize) {
        const batch = asinList.slice(i, i + batchSize);
        try {
          const spUrl = `https://sellingpartnerapi-eu.amazon.com/catalog/2022-04-01/items?marketplaceIds=A1F83G8C2ARO7P&includedData=summaries&identifiersType=ASIN&identifiers=${batch.join(',')}`;
          const spResp = await fetch(spUrl, {
            headers: {
              'x-amz-access-token': spAccessToken,
              'Content-Type': 'application/json',
            },
          });
          if (spResp.ok) {
            const spData = await spResp.json();
            const items = spData?.items || [];
            for (const item of items) {
              const asin = item.asin;
              const name = item.summaries?.[0]?.itemName;
              if (asin && name) titleMap.set(asin, name);
            }
            console.log(`✅ SP-API batch ${Math.floor(i / batchSize) + 1}: got ${items.length} items`);
          } else {
            console.warn(`⚠️ SP-API batch failed (${spResp.status}): ${await spResp.text()}`);
          }
        } catch (spErr) {
          console.warn(`⚠️ SP-API batch error (non-fatal):`, spErr.message);
        }
      }
      console.log(`📝 SP-API title map: ${titleMap.size} titles`);
    } else {
      console.log('ℹ️ No AMAZON_SP_ACCESS_TOKEN - will use Windsor fallback fields for titles');
    }

    // Step 3: Build upsert records, using Windsor fallback title fields if SP-API not available
    const today = new Date().toISOString().split('T')[0];
    const records = [];

    for (const row of invRows) {
      const accountName = row.account_name || '';
      const asin = row['asin'] || '';
      if (!accountName || !asin) continue;

      const recordDate = row.date ? new Date(row.date).toISOString().split('T')[0] : today;

      // Title priority: SP-API > null (Windsor inventory report has no title fields)
      const productTitle = titleMap.get(asin) || null;

      records.push({
        record_date: recordDate,
        account_name: accountName,
        account_id: row.account_id || accountName,
        asin,
        marketplace_country: 'GB',
        sellable_on_hand_units: parseFloat(row['sellableOnHandInventoryUnits']) || 0,
        sellable_on_hand_cost: parseFloat(row['sellableOnHandInventoryCost-amount']) || 0,
        unsellable_on_hand_units: 0,
        unhealthy_inventory_units: 0,
        open_purchase_order_units: parseFloat(row['openPurchaseOrderUnits']) || 0,
        unfilled_customer_ordered_units: parseFloat(row['unfilledCustomerOrderedUnits']) || 0,
        procurable_product_out_of_stock_rate: parseFloat(row['procurableProductOutOfStockRate']) || 0,
        sell_through_rate: parseFloat(row['sellThroughRate']) || 0,
        average_vendor_lead_time_days: parseFloat(row['averageVendorLeadTimeDays']) || null,
        net_received_inventory_units: parseFloat(row['netReceivedInventoryUnits']) || 0,
        vendor_confirmation_rate: null,
        receive_fill_rate: parseFloat(row['receiveFillRate']) || null,
        product_title: productTitle,
        synced_at: new Date().toISOString(),
      });
    }

    // Deduplicate by (record_date, account_id, asin)
    const seen = new Set<string>();
    const uniqueRecords = records.filter(r => {
      const key = `${r.record_date}_${r.account_id}_${r.asin}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`📊 ${records.length} total → ${uniqueRecords.length} unique records`);

    // Step 4: Upsert in batches
    const upsertBatchSize = 500;
    let totalUpserted = 0;

    for (let i = 0; i < uniqueRecords.length; i += upsertBatchSize) {
      const batch = uniqueRecords.slice(i, i + upsertBatchSize);
      const batchNum = Math.floor(i / upsertBatchSize) + 1;

      const { error: upsertErr } = await supabase
        .from('vendor_inventory_data')
        .upsert(batch, {
          onConflict: 'record_date,account_id,asin',
          ignoreDuplicates: false,
        });

      if (upsertErr) {
        console.error(`❌ Batch ${batchNum} upsert error:`, upsertErr.message);
      } else {
        totalUpserted += batch.length;
        console.log(`✅ Batch ${batchNum}: ${batch.length} records upserted`);
      }
    }

    // Step 5: Backfill product_title from SP-API titleMap
    if (titleMap.size > 0) {
      console.log('🔄 Backfilling product_title from SP-API...');
      let backfilled = 0;
      for (const [asin, title] of titleMap) {
        const { error: updateErr } = await supabase
          .from('vendor_inventory_data')
          .update({ product_title: title })
          .is('product_title', null)
          .eq('asin', asin);
        if (!updateErr) backfilled++;
      }
      console.log(`✅ SP-API backfilled titles for ${backfilled} ASINs`);
    }

    // Step 6: Fetch product titles from Windsor vendor sales report (separate API call)
    console.log('📊 Fetching product titles from Windsor vendor sales report...');
    let salesTitleCount = 0;
    try {
      const salesTitleUrl = `https://connectors.windsor.ai/amazon_vendor?api_key=${windsorApiKey}&date_preset=last_30d&fields=date,account_name,asin,productTitle&accounts=${accountsParam}`;
      const salesResp = await fetch(salesTitleUrl);
      if (!salesResp.ok) {
        const salesErrText = await salesResp.text();
        console.warn(`⚠️ Windsor sales report API error ${salesResp.status}: ${salesErrText}`);
      } else {
        const salesData = await salesResp.json();
        const salesRows = salesData?.data || [];
        console.log(`📦 Received ${salesRows.length} sales report rows for title lookup`);

        // Build a deduplicated map of asin+account -> title
        const salesTitleMap = new Map<string, { asin: string; account_name: string; title: string }>();
        for (const row of salesRows) {
          const asin = row['asin'];
          const title = row['productTitle'];
          const acct = row.account_name;
          if (asin && title && acct) {
            salesTitleMap.set(`${acct}_${asin}`, { asin, account_name: acct, title });
          }
        }
        console.log(`📝 ${salesTitleMap.size} unique ASIN/account title pairs from sales report`);

        // Batch update: set product_title WHERE asin matches AND product_title IS NULL
        for (const entry of salesTitleMap.values()) {
          const { error: titleUpdateErr } = await supabase
            .from('vendor_inventory_data')
            .update({ product_title: entry.title })
            .eq('asin', entry.asin)
            .eq('account_name', entry.account_name)
            .is('product_title', null);
          if (!titleUpdateErr) salesTitleCount++;
        }
        console.log(`✅ Windsor sales report: updated titles for ${salesTitleCount} ASIN/account pairs`);
      }
    } catch (salesTitleErr) {
      console.warn('⚠️ Windsor sales report title fetch error (non-fatal):', salesTitleErr.message);
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ Vendor inventory sync completed in ${elapsed}ms — ${totalUpserted} records upserted, ${titleMap.size} SP-API titles, ${salesTitleCount} Windsor sales titles`);

    return new Response(JSON.stringify({
      success: true,
      records_upserted: totalUpserted,
      sp_api_titles_mapped: titleMap.size,
      windsor_sales_titles_mapped: salesTitleCount,
      execution_time_ms: elapsed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (fetchError) {
    console.error('❌ Vendor inventory sync error:', fetchError.message);
    return new Response(JSON.stringify({
      success: false,
      error: fetchError.message,
      execution_time_ms: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
