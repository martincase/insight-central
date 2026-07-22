import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert Amazon Performance Analyst working for Martin Case, an Amazon agency. You have the account's REAL data below. Always reference actual figures from the data provided. Never say you don't have data - if the data is provided below, use it. Give concise, data-driven answers.

Key guidelines:
- You are analysing data ONLY for the account specified. Never reference data from any other account.
- Use specific numbers and percentages from the REAL data provided
- Highlight trends, anomalies, and actionable insights
- When discussing PPC, reference ACOS, TACOS, CPC, CTR, and ROAS
- When discussing sales, reference revenue, units sold, conversion rates, and Buy Box percentage
- Format responses with markdown for readability (bold key numbers, use bullet points)
- Keep responses focused and under 300 words unless the user asks for detail
- Compare recent performance to earlier periods when possible
- Flag any concerning drops or impressive gains`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, account_name, merchant_token } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let contextParts: string[] = [];

    if (account_name || merchant_token) {
      // Resolve account info from accounts_master
      let resolvedMerchantToken = merchant_token;
      let resolvedAccountName = account_name;
      let apiAccountName: string | null = null;
      let ppcAccountName: string | null = null;
      let ppcSellerName: string | null = null;

      // Look up account master with STRICT exact matching - never cross accounts
      let accountMaster = null;
      
      if (account_name) {
        const { data } = await supabase
          .from("accounts_master")
          .select("account_name, merchant_token, api_account_name, ppc_account_name, ppc_sellername")
          .eq("account_name", account_name)
          .limit(1)
          .maybeSingle();
        accountMaster = data;
      }
      
      // Fallback: try merchant_token only if account_name lookup failed
      if (!accountMaster && merchant_token) {
        const { data } = await supabase
          .from("accounts_master")
          .select("account_name, merchant_token, api_account_name, ppc_account_name, ppc_sellername")
          .eq("merchant_token", merchant_token)
          .limit(1)
          .maybeSingle();
        accountMaster = data;
      }

      if (!accountMaster) {
        contextParts.push(`⚠️ Account "${account_name || merchant_token}" not found in accounts_master. Cannot retrieve data.`);
      } else {
        resolvedMerchantToken = accountMaster.merchant_token;
        resolvedAccountName = accountMaster.account_name;
        apiAccountName = accountMaster.api_account_name;
        ppcAccountName = accountMaster.ppc_account_name;
        ppcSellerName = accountMaster.ppc_sellername;

        contextParts.push(`Account: ${resolvedAccountName} (Merchant Token: ${resolvedMerchantToken})`);

        // Build all queries in parallel using the right identifier for each table
        const salesAccountId = resolvedMerchantToken;
        const ppcIdentifier = ppcAccountName || resolvedAccountName;
        const apiIdentifier = apiAccountName || resolvedAccountName;

        const [
          { data: salesData },
          { data: ppcData },
          { data: campaignData },
          { data: searchTerms },
          { data: buyBoxAlerts },
          { data: brandAnalytics },
          { data: asinData },
        ] = await Promise.all([
          supabase
            .from("daily_sales_data")
            .select("record_date, ordered_product_sales_amount, units_ordered, browser_pageviews, buybox_percentage, unit_session_percentage")
            .eq("account_name", salesAccountId)
            .order("record_date", { ascending: false })
            .limit(30),
          supabase
            .from("daily_ppc_data")
            .select("record_date, ppc_spend, ppc_sales, acos, tacos, impressions, clicks")
            .eq("account_name", resolvedAccountName)
            .order("record_date", { ascending: false })
            .limit(30),
          supabase
            .from("amazon_api_campaigns_performance")
            .select("campaign_name, spend, sales_7d, acos_7d, impressions, clicks, date")
            .eq("account_name", apiIdentifier)
            .order("date", { ascending: false })
            .limit(30),
          supabase
            .from("amazon_api_search_terms_performance")
            .select("search_term, keyword, match_type, impressions, clicks, spend, sales_7d, acos_7d, orders_7d")
            .eq("account_name", apiIdentifier)
            .order("spend", { ascending: false })
            .limit(30),
          supabase
            .from("buy_box_alerts")
            .select("asin, detection_date, previous_percentage, current_percentage, percentage_drop, severity, alert_message")
            .eq("account_name", resolvedAccountName)
            .order("detection_date", { ascending: false })
            .limit(10),
          supabase
            .from("python_keyword_master")
            .select("keyword, search_query_volume, impressions_brand_share_pct, clicks_brand_share_pct, has_ba, has_ppc")
            .eq("brand", resolvedAccountName)
            .eq("has_ba", "Yes")
            .order("search_query_volume", { ascending: false })
            .limit(20),
          supabase
            .from("daily_asin_data")
            .select("child_asin, ordered_product_sales_amount, units_ordered, browser_pageviews, buybox_percentage, unit_session_percentage, record_date")
            .eq("account_name", salesAccountId)
            .order("record_date", { ascending: false })
            .limit(50),
        ]);

        if (salesData?.length) contextParts.push(`## Daily Sales Performance (last ${salesData.length} days)\n${JSON.stringify(salesData, null, 0)}`);
        if (ppcData?.length) contextParts.push(`## Daily PPC Performance (last ${ppcData.length} days)\n${JSON.stringify(ppcData, null, 0)}`);
        if (campaignData?.length) contextParts.push(`## Campaign Performance (recent)\n${JSON.stringify(campaignData.slice(0, 15), null, 0)}`);
        if (searchTerms?.length) contextParts.push(`## Top Search Terms by Spend\n${JSON.stringify(searchTerms, null, 0)}`);
        if (buyBoxAlerts?.length) contextParts.push(`## Recent Buy Box Alerts\n${JSON.stringify(buyBoxAlerts, null, 0)}`);
        if (brandAnalytics?.length) contextParts.push(`## Brand Analytics Keywords\n${JSON.stringify(brandAnalytics, null, 0)}`);
        if (asinData?.length) contextParts.push(`## ASIN Level Performance (recent)\n${JSON.stringify(asinData.slice(0, 20), null, 0)}`);

        if (!salesData?.length && !ppcData?.length && !campaignData?.length) {
          contextParts.push(`\n⚠️ No data found for ${resolvedAccountName}. Tried identifiers: sales="${salesAccountId}", ppc="${ppcIdentifier}", api="${apiIdentifier}". The account may not have synced data yet.`);
        }
      }
    }

    const dataContext = contextParts.length > 0
      ? `\n\nHere is the REAL data for this account:\n\n${contextParts.join("\n\n")}`
      : "\n\nNo account was selected. Ask the user to select an account first so you can analyse their real data.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + dataContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-analyst error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
