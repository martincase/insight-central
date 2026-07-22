import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { session_id, account_name } = await req.json()

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Get session info
    const { data: session, error: sessionError } = await supabase
      .from('jungle_scout_research_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message}`)
    }

    // 2. Get relevance scores for this session
    const { data: scoredKeywords, error: scoresError } = await supabase
      .from('jungle_scout_keyword_relevance_scores')
      .select('*')
      .eq('session_id', session_id)

    if (scoresError) {
      throw new Error(`Failed to fetch scored keywords: ${scoresError.message}`)
    }

    if (!scoredKeywords || scoredKeywords.length === 0) {
      return new Response(JSON.stringify({ message: 'No scored keywords found. Run relevance scoring first.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Get current PPC keywords/bids for this account
    const resolvedAccount = account_name || session.account_name
    const { data: currentTargets } = await supabase
      .from('amazon_api_targets_config')
      .select('keyword_expression, bid, match_type, state')
      .eq('account_name', resolvedAccount)
      .eq('state', 'ENABLED')

    const currentKeywordMap = new Map<string, { bid: number; match_type: string }>()
    if (currentTargets) {
      for (const t of currentTargets) {
        if (t.keyword_expression) {
          currentKeywordMap.set(t.keyword_expression.toLowerCase(), {
            bid: t.bid ?? 0,
            match_type: t.match_type ?? 'unknown',
          })
        }
      }
    }

    // 4. Analyze gaps
    const gapResults = scoredKeywords.map((kw) => {
      const kwLower = kw.keyword.toLowerCase()
      const existing = currentKeywordMap.get(kwLower)
      const relevance = kw.relevance_score ?? 0
      const searchVol = kw.search_volume ?? 0

      let gap_type: string
      let recommended_action: string
      let current_bid: number | null = null
      let priority_score: number

      if (!existing) {
        gap_type = 'missing'
        recommended_action = relevance >= 70
          ? `Add as new keyword target. High relevance (${relevance}).`
          : `Consider adding — moderate relevance (${relevance}).`
        priority_score = Math.round(relevance * 0.6 + Math.min(searchVol / 100, 40))
      } else {
        current_bid = existing.bid
        if (relevance >= 80 && existing.bid < 0.5) {
          gap_type = 'underbid'
          recommended_action = `Increase bid from £${existing.bid.toFixed(2)}. High relevance keyword.`
          priority_score = Math.round(relevance * 0.5 + 20)
        } else if (relevance < 40 && existing.bid > 1.0) {
          gap_type = 'overbid'
          recommended_action = `Consider reducing bid from £${existing.bid.toFixed(2)}. Low relevance (${relevance}).`
          priority_score = Math.round((100 - relevance) * 0.3 + existing.bid * 10)
        } else {
          gap_type = 'opportunity'
          recommended_action = `Well positioned. Relevance: ${relevance}, Bid: £${existing.bid.toFixed(2)}.`
          priority_score = Math.round(relevance * 0.3)
        }
      }

      return {
        session_id,
        keyword: kw.keyword,
        gap_type,
        relevance_score: relevance,
        search_volume: searchVol,
        current_bid,
        recommended_action,
        priority_score,
      }
    })

    // 5. Delete old results for this session, then insert new
    await supabase
      .from('jungle_scout_ppc_gap_analysis_results')
      .delete()
      .eq('session_id', session_id)

    const { error: insertError } = await supabase
      .from('jungle_scout_ppc_gap_analysis_results')
      .insert(gapResults)

    if (insertError) {
      throw new Error(`Failed to insert gap results: ${insertError.message}`)
    }

    return new Response(JSON.stringify({ success: true, results_count: gapResults.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
