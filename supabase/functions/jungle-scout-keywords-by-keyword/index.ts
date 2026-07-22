import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const MARKETPLACE_MAP: Record<string, string> = {
  us: 'us', uk: 'uk', de: 'de', fr: 'fr', it: 'it', es: 'es',
  ca: 'ca', in: 'in', mx: 'mx', jp: 'jp',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    // Support both "keyword" (KeywordExpansionTool) and "search_term" (FullResearchPipeline)
    const keyword = body.keyword || body.search_term
    const marketplace = body.marketplace || 'uk'
    const accountName = body.account_name

    if (!keyword) {
      return new Response(JSON.stringify({ error: 'keyword or search_term is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jsApiKey = Deno.env.get('JUNGLE_SCOUT_API_KEY')
    if (!jsApiKey) {
      throw new Error('JUNGLE_SCOUT_API_KEY secret not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const country = MARKETPLACE_MAP[marketplace.toLowerCase()] || 'uk'

    console.log(`🔍 Fetching keywords by keyword: "${keyword}" in ${country} for ${accountName}`)

    // Call Jungle Scout Keywords by Keyword API
    const jsUrl = `https://developer.junglescout.com/api/keywords/keywords_by_keyword_query?marketplace=${country}&page[size]=100`

    const jsResponse = await fetch(jsUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.junglescout.v1+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `${jsApiKey}`,
        'X-API-Type': 'junglescout',
      },
      body: JSON.stringify({
        data: {
          type: 'keywords_by_keyword_query',
          attributes: {
            search_terms: keyword,
          },
        },
      }),
    })

    if (!jsResponse.ok) {
      const errText = await jsResponse.text()
      console.error(`❌ Jungle Scout API error ${jsResponse.status}: ${errText}`)
      throw new Error(`Jungle Scout API returned ${jsResponse.status}: ${errText}`)
    }

    const jsData = await jsResponse.json()
    const keywords = jsData?.data || []

    console.log(`✅ Got ${keywords.length} keywords from Jungle Scout`)

    // Track API usage
    await supabase.from('jungle_scout_api_usage').insert({
      account_name: accountName || 'unknown',
      endpoint: 'keywords_by_keyword',
      credits_used: 1,
    })

    if (keywords.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Map and upsert results
    const rows = keywords.map((kw: any) => {
      const attrs = kw.attributes || {}
      return {
        keyword: attrs.name || kw.id || '',
        seed_keyword: keyword,
        country,
        account_name: accountName,
        monthly_search_volume_exact: attrs.monthly_search_volume_exact ?? null,
        monthly_search_volume_broad: attrs.monthly_search_volume_broad ?? null,
        monthly_trend: attrs.monthly_trend ?? null,
        quarterly_trend: attrs.quarterly_trend ?? null,
        ppc_bid_exact: attrs.ppc_bid_exact ?? null,
        ppc_bid_broad: attrs.ppc_bid_broad ?? null,
        sp_brand_ad_bid: attrs.sp_brand_ad_bid ?? null,
        ease_of_ranking_score: attrs.ease_of_ranking_score ?? null,
        relevancy_score: attrs.relevancy_score ?? null,
        organic_product_count: attrs.organic_product_count ?? null,
        sponsored_product_count: attrs.sponsored_product_count ?? null,
        dominant_category: attrs.dominant_category ?? null,
        recommended_promotions: attrs.recommended_promotions ?? null,
        last_pulled_at: new Date().toISOString(),
      }
    }).filter((r: any) => r.keyword)

    // Delete existing results for this seed_keyword + account + country, then insert fresh
    await supabase
      .from('jungle_scout_keywords_by_keyword')
      .delete()
      .eq('seed_keyword', keyword)
      .eq('account_name', accountName)
      .eq('country', country)

    const { error: insertError } = await supabase
      .from('jungle_scout_keywords_by_keyword')
      .insert(rows)

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      throw new Error(`Failed to store keywords: ${insertError.message}`)
    }

    console.log(`✅ Stored ${rows.length} keywords for "${keyword}"`)

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('❌ Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
