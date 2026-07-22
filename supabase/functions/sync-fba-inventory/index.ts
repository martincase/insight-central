import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WINDSOR_BASE_URL = 'https://connectors.windsor.ai/amazon_sp'
const WINDSOR_FIELDS = [
  'fba_myi_unsuppressed_inventory_data__afn_fulfillable_quantity',
  'fba_myi_unsuppressed_inventory_data__asin',
  'fba_myi_unsuppressed_inventory_data__product_name',
  'fba_myi_unsuppressed_inventory_data__sku',
].join(',')

const ACCOUNTS = [
  'A3K5KN6RHD3NG3-GB',  // AirCraft Home
  'A2FPP5HIYZWZ94-GB',  // BBB Drinks
  'A1YKJ60SEFL7SY-GB',  // Dragonfly
  'ADUDP6CKYBZG8-GB',   // Innovation
  'A3KFXD5036MA8L-GB',  // Lockabox
  'A340H4GQL8YSKQ-GB',  // Mahi Naturals
  'AJC1S5WVZH91M-GB',   // Nua Fertility
  'A1Q0PIUH3T4FB-AU',   // Suu Balm Australia
  'A1IG3P4X3GAZ97-GB',  // THEYE
  'A3R7FAYWFJ2B3U-US',  // Workwear Depot US
  'A3SSSDG0ONKZCU-GB',  // Workwear Depot UK
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🕐 FBA Inventory Sync started at:', new Date().toISOString())

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const windsorApiKey = Deno.env.get('WINDSOR_API_KEY')
    if (!windsorApiKey) {
      throw new Error('WINDSOR_API_KEY not found in environment variables')
    }

    const recordDate = new Date().toISOString().split('T')[0]

    // Process accounts in parallel
    const results = await Promise.allSettled(ACCOUNTS.map(async (accountId) => {
      console.log(`🚀 [${accountId}] Starting Windsor fetch...`)

      const url = `${WINDSOR_BASE_URL}?api_key=${windsorApiKey}&date_preset=last_7d&fields=${WINDSOR_FIELDS}&select_accounts=${accountId}`

      let response
      try {
        response = await fetch(url)
        if (!response.ok) {
          const body = await response.text()
          console.error(`❌ [${accountId}] Windsor API error: ${response.status} - ${body}`)
          return { accountId, error: `Windsor ${response.status}`, records: 0 }
        }
        console.log(`✅ [${accountId}] Windsor fetch successful`)
      } catch (fetchErr) {
        console.error(`❌ [${accountId}] Windsor fetch failed:`, fetchErr)
        return { accountId, error: String(fetchErr), records: 0 }
      }

      const json = await response.json()
      const rows = json.data || []
      console.log(`📦 [${accountId}] Windsor returned ${rows.length} rows`)

      if (rows.length === 0) {
        return { accountId, error: null, records: 0 }
      }

      const records = rows
        .filter((row: any) => row.fba_myi_unsuppressed_inventory_data__sku)
        .map((row: any) => ({
          record_date: recordDate,
          account_name: accountId,
          sku: row.fba_myi_unsuppressed_inventory_data__sku || '',
          asin: row.fba_myi_unsuppressed_inventory_data__asin || '',
          product_name: row.fba_myi_unsuppressed_inventory_data__product_name || '',
          fulfillable_quantity: parseInt(row.fba_myi_unsuppressed_inventory_data__afn_fulfillable_quantity || '0', 10) || 0,
          condition_type: '',
          inbound_working_quantity: 0,
          inbound_shipped_quantity: 0,
          inbound_receiving_quantity: 0,
          reserved_quantity: 0,
          total_quantity: parseInt(row.fba_myi_unsuppressed_inventory_data__afn_fulfillable_quantity || '0', 10) || 0,
          price: 0,
        }))

      console.log(`📦 [${accountId}] Parsed ${records.length} valid records, starting upsert...`)

      const batchSize = 1000
      let insertedCount = 0

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        const { data: upserted, error: upsertError } = await supabase
          .from('fba_inventory_data')
          .upsert(batch, { onConflict: 'account_name,sku,record_date' })
          .select()

        if (upsertError) {
          console.error(`❌ [${accountId}] Upsert error:`, upsertError)
          return { accountId, error: upsertError.message, records: insertedCount }
        }
        insertedCount += upserted?.length || 0
      }

      console.log(`✅ [${accountId}] Upserted ${insertedCount} records`)
      return { accountId, error: null, records: insertedCount }
    }))

    // Summarize
    const summary: Record<string, any> = {}
    let totalInserted = 0
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        summary[r.value.accountId] = { records: r.value.records, error: r.value.error }
        totalInserted += r.value.records
      } else {
        console.error('❌ Unhandled rejection:', r.reason)
      }
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ FBA Inventory sync completed in ${elapsed}s - ${totalInserted} total records`)

    return new Response(JSON.stringify({
      success: true,
      message: `Synced FBA inventory for ${recordDate}`,
      recordDate,
      totalInserted,
      accountResults: summary,
      elapsedSeconds: elapsed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (generalError) {
    const errorMessage = String(generalError?.message || generalError)
    console.error('❌ FBA Inventory sync fatal error:', errorMessage)
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
