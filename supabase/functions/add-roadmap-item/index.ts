import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface RoadmapItemRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'planned' | 'in_progress' | 'completed';
  estimated_completion?: string;
  is_public?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🛣️ AI Roadmap item handler started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      title, 
      description, 
      priority = 'medium',
      status = 'planned',
      estimated_completion,
      is_public = false 
    }: RoadmapItemRequest = await req.json();

    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`📝 Adding roadmap item: ${title}`);

    const itemData = {
      title: title.trim(),
      description: description?.trim() || null,
      priority,
      status,
      estimated_completion: estimated_completion || null,
      is_public,
      created_by: 'ai'
    };

    const { data, error } = await supabase
      .from('roadmap_items')
      .insert([itemData])
      .select()
      .single();

    if (error) {
      console.error("❌ Error inserting roadmap item:", error);
      throw error;
    }

    console.log("✅ Roadmap item created successfully:", data.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Roadmap item "${title}" has been added successfully`,
        item: data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("❌ Error in add-roadmap-item handler:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to add roadmap item",
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);