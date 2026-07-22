export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      account_change_marker: {
        Row: {
          account_name: string
          change_notes: string | null
          created_at: string | null
          created_by: string | null
          event_date: string
          event_label: string
          id: string
          merchant_token: string
        }
        Insert: {
          account_name: string
          change_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          event_date: string
          event_label: string
          id?: string
          merchant_token: string
        }
        Update: {
          account_name?: string
          change_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          event_date?: string
          event_label?: string
          id?: string
          merchant_token?: string
        }
        Relationships: []
      }
      account_health_events: {
        Row: {
          account_name: string
          alerted: boolean
          event_time: string | null
          id: number
          marketplace_id: string
          new_status: string
          notification_id: string | null
          previous_status: string | null
          raw: Json | null
          received_at: string
          selling_partner_id: string | null
        }
        Insert: {
          account_name: string
          alerted?: boolean
          event_time?: string | null
          id?: never
          marketplace_id: string
          new_status: string
          notification_id?: string | null
          previous_status?: string | null
          raw?: Json | null
          received_at?: string
          selling_partner_id?: string | null
        }
        Update: {
          account_name?: string
          alerted?: boolean
          event_time?: string | null
          id?: never
          marketplace_id?: string
          new_status?: string
          notification_id?: string | null
          previous_status?: string | null
          raw?: Json | null
          received_at?: string
          selling_partner_id?: string | null
        }
        Relationships: []
      }
      account_health_report_jobs: {
        Row: {
          account_name: string
          completed_at: string | null
          detail: string | null
          id: number
          region: string | null
          report_id: string | null
          requested_at: string
          status: string
        }
        Insert: {
          account_name: string
          completed_at?: string | null
          detail?: string | null
          id?: never
          region?: string | null
          report_id?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          account_name?: string
          completed_at?: string | null
          detail?: string | null
          id?: never
          region?: string | null
          report_id?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      account_health_status: {
        Row: {
          account_name: string
          changed_at: string
          current_status: string
          marketplace_id: string
          previous_status: string | null
          selling_partner_id: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          changed_at?: string
          current_status: string
          marketplace_id: string
          previous_status?: string | null
          selling_partner_id?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          changed_at?: string
          current_status?: string
          marketplace_id?: string
          previous_status?: string | null
          selling_partner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      account_tags: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          merchant_token: string
          starts_at: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          merchant_token: string
          starts_at?: string
          tag: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          merchant_token?: string
          starts_at?: string
          tag?: string
        }
        Relationships: []
      }
      account_users: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_master: {
        Row: {
          account_name: string
          account_type: string | null
          alert_config: Json | null
          api_account_name: string | null
          auto_paused_at: string | null
          consecutive_empty_days: number
          created_at: string
          id: string
          is_starred: boolean | null
          last_nonempty_date: string | null
          merchant_token: string
          ppc_account_name: string | null
          ppc_sellername: string | null
          profile_id: number | null
          python_brand_name: string | null
          seller_central_link: string | null
          share_code: string | null
          status: string | null
          target_acos: number
          updated_at: string
        }
        Insert: {
          account_name: string
          account_type?: string | null
          alert_config?: Json | null
          api_account_name?: string | null
          auto_paused_at?: string | null
          consecutive_empty_days?: number
          created_at?: string
          id?: string
          is_starred?: boolean | null
          last_nonempty_date?: string | null
          merchant_token: string
          ppc_account_name?: string | null
          ppc_sellername?: string | null
          profile_id?: number | null
          python_brand_name?: string | null
          seller_central_link?: string | null
          share_code?: string | null
          status?: string | null
          target_acos?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_type?: string | null
          alert_config?: Json | null
          api_account_name?: string | null
          auto_paused_at?: string | null
          consecutive_empty_days?: number
          created_at?: string
          id?: string
          is_starred?: boolean | null
          last_nonempty_date?: string | null
          merchant_token?: string
          ppc_account_name?: string | null
          ppc_sellername?: string | null
          profile_id?: number | null
          python_brand_name?: string | null
          seller_central_link?: string | null
          share_code?: string | null
          status?: string | null
          target_acos?: number
          updated_at?: string
        }
        Relationships: []
      }
      accounts_master_backup: {
        Row: {
          account_name: string
          account_type: string | null
          backed_up_at: string
          backup_date: string
          id: string
          is_starred: boolean | null
          merchant_token: string
          original_created_at: string
          original_id: string
          original_updated_at: string
          ppc_account_name: string | null
          seller_central_link: string | null
          status: string | null
        }
        Insert: {
          account_name: string
          account_type?: string | null
          backed_up_at?: string
          backup_date?: string
          id?: string
          is_starred?: boolean | null
          merchant_token: string
          original_created_at: string
          original_id: string
          original_updated_at: string
          ppc_account_name?: string | null
          seller_central_link?: string | null
          status?: string | null
        }
        Update: {
          account_name?: string
          account_type?: string | null
          backed_up_at?: string
          backup_date?: string
          id?: string
          is_starred?: boolean | null
          merchant_token?: string
          original_created_at?: string
          original_id?: string
          original_updated_at?: string
          ppc_account_name?: string | null
          seller_central_link?: string | null
          status?: string | null
        }
        Relationships: []
      }
      ai_advisor_log: {
        Row: {
          account_name: string
          action_data: Json | null
          action_type: string | null
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string | null
        }
        Insert: {
          account_name: string
          action_data?: Json | null
          action_type?: string | null
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id?: string | null
        }
        Update: {
          account_name?: string
          action_data?: Json | null
          action_type?: string | null
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string | null
        }
        Relationships: []
      }
      ai_crawler_hits: {
        Row: {
          bot: string | null
          client_id: number | null
          domain: string | null
          engine: string | null
          hit_at: string
          id: number
          ip: string | null
          path: string | null
          purpose: string | null
          user_agent: string | null
        }
        Insert: {
          bot?: string | null
          client_id?: number | null
          domain?: string | null
          engine?: string | null
          hit_at?: string
          id?: number
          ip?: string | null
          path?: string | null
          purpose?: string | null
          user_agent?: string | null
        }
        Update: {
          bot?: string | null
          client_id?: number | null
          domain?: string | null
          engine?: string | null
          hit_at?: string
          id?: number
          ip?: string | null
          path?: string | null
          purpose?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_crawler_hits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_crawler_sites: {
        Row: {
          client_id: number
          domain: string
        }
        Insert: {
          client_id: number
          domain: string
        }
        Update: {
          client_id?: number
          domain?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_crawler_sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rank_annotations: {
        Row: {
          client_id: number
          created_at: string
          id: number
          label: string
          note: string | null
          occurred_on: string
        }
        Insert: {
          client_id?: number
          created_at?: string
          id?: never
          label: string
          note?: string | null
          occurred_on: string
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: never
          label?: string
          note?: string | null
          occurred_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_annotations_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rank_clients: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      ai_rank_config: {
        Row: {
          alert_email: string
          alerts_enabled: boolean
          brand_aliases: Json
          business_descriptor: string | null
          chat_model: string
          client_id: number
          id: number
          known_competitors: Json
          maps_brand: string
          maps_locations: Json
          target_domain: string
          updated_at: string
        }
        Insert: {
          alert_email?: string
          alerts_enabled?: boolean
          brand_aliases: Json
          business_descriptor?: string | null
          chat_model?: string
          client_id?: number
          id?: number
          known_competitors: Json
          maps_brand?: string
          maps_locations?: Json
          target_domain?: string
          updated_at?: string
        }
        Update: {
          alert_email?: string
          alerts_enabled?: boolean
          brand_aliases?: Json
          business_descriptor?: string | null
          chat_model?: string
          client_id?: number
          id?: number
          known_competitors?: Json
          maps_brand?: string
          maps_locations?: Json
          target_domain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_config_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rank_queries: {
        Row: {
          client_id: number
          created_at: string
          id: number
          intent_group: string
          is_active: boolean
          query_text: string
          search_volume: number | null
          serp_keyword: string | null
          serp_maps: boolean
          sort_order: number
          tracking_tag: string
          weight: number
        }
        Insert: {
          client_id?: number
          created_at?: string
          id?: never
          intent_group?: string
          is_active?: boolean
          query_text: string
          search_volume?: number | null
          serp_keyword?: string | null
          serp_maps?: boolean
          sort_order?: number
          tracking_tag: string
          weight?: number
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: never
          intent_group?: string
          is_active?: boolean
          query_text?: string
          search_volume?: number | null
          serp_keyword?: string | null
          serp_maps?: boolean
          sort_order?: number
          tracking_tag?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_queries_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rank_query_suggestions: {
        Row: {
          client_id: number
          created_at: string
          id: number
          rationale: string | null
          status: string
          suggested_intent: string | null
          suggested_query: string | null
          suggested_serp_keyword: string | null
          suggested_tag: string | null
        }
        Insert: {
          client_id?: number
          created_at?: string
          id?: never
          rationale?: string | null
          status?: string
          suggested_intent?: string | null
          suggested_query?: string | null
          suggested_serp_keyword?: string | null
          suggested_tag?: string | null
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: never
          rationale?: string | null
          status?: string
          suggested_intent?: string | null
          suggested_query?: string | null
          suggested_serp_keyword?: string | null
          suggested_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_query_suggestions_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rank_recommendations: {
        Row: {
          brief: Json | null
          client_id: number
          competitors: Json
          created_at: string
          id: number
          priority: number | null
          query_id: number | null
          rationale: string | null
          recommendation: string | null
          run_id: number | null
          status: string
          tracking_tag: string | null
        }
        Insert: {
          brief?: Json | null
          client_id?: number
          competitors?: Json
          created_at?: string
          id?: never
          priority?: number | null
          query_id?: number | null
          rationale?: string | null
          recommendation?: string | null
          run_id?: number | null
          status?: string
          tracking_tag?: string | null
        }
        Update: {
          brief?: Json | null
          client_id?: number
          competitors?: Json
          created_at?: string
          id?: never
          priority?: number | null
          query_id?: number | null
          rationale?: string | null
          recommendation?: string | null
          run_id?: number | null
          status?: string
          tracking_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_recommendations_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rank_results: {
        Row: {
          answer_excerpt: string | null
          brand_mentioned: boolean
          brand_rank: number | null
          citations: Json
          cited: boolean
          client_id: number
          competitors: Json
          created_at: string
          descriptors: Json
          error: string | null
          evidence: string | null
          grounded: boolean
          id: number
          intent_group: string | null
          model: string
          model_name: string | null
          named_in_answer: boolean
          query_id: number | null
          raw_response: Json | null
          repeat_index: number
          run_id: number
          sentiment: string | null
          status: string
          tracking_tag: string | null
        }
        Insert: {
          answer_excerpt?: string | null
          brand_mentioned?: boolean
          brand_rank?: number | null
          citations?: Json
          cited?: boolean
          client_id?: number
          competitors?: Json
          created_at?: string
          descriptors?: Json
          error?: string | null
          evidence?: string | null
          grounded?: boolean
          id?: never
          intent_group?: string | null
          model: string
          model_name?: string | null
          named_in_answer?: boolean
          query_id?: number | null
          raw_response?: Json | null
          repeat_index?: number
          run_id: number
          sentiment?: string | null
          status?: string
          tracking_tag?: string | null
        }
        Update: {
          answer_excerpt?: string | null
          brand_mentioned?: boolean
          brand_rank?: number | null
          citations?: Json
          cited?: boolean
          client_id?: number
          competitors?: Json
          created_at?: string
          descriptors?: Json
          error?: string | null
          evidence?: string | null
          grounded?: boolean
          id?: never
          intent_group?: string | null
          model?: string
          model_name?: string | null
          named_in_answer?: boolean
          query_id?: number | null
          raw_response?: Json | null
          repeat_index?: number
          run_id?: number
          sentiment?: string | null
          status?: string
          tracking_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_weight"
            referencedColumns: ["query_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_score"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_score"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_score_weighted"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_totals"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_sentiment"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_trend"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_competitor_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_competitor_query_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_serp_query_history"
            referencedColumns: ["run_id"]
          },
        ]
      }
      ai_rank_runs: {
        Row: {
          client_id: number
          cost_usd: number
          failed_calls: number
          finished_at: string | null
          id: number
          models: string[]
          notes: string | null
          ok_calls: number
          repeats: number
          started_at: string
          status: string
          total_calls: number
          trigger: string
        }
        Insert: {
          client_id?: number
          cost_usd?: number
          failed_calls?: number
          finished_at?: string | null
          id?: never
          models?: string[]
          notes?: string | null
          ok_calls?: number
          repeats?: number
          started_at?: string
          status?: string
          total_calls?: number
          trigger?: string
        }
        Update: {
          client_id?: number
          cost_usd?: number
          failed_calls?: number
          finished_at?: string | null
          id?: never
          models?: string[]
          notes?: string | null
          ok_calls?: number
          repeats?: number
          started_at?: string
          status?: string
          total_calls?: number
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_runs_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_backfill_targets: {
        Row: {
          amazon_report_id: string | null
          created_at: string | null
          id: number
          marketplace: string
          merchant_token: string
          note: string | null
          record_date: string
          region: string
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amazon_report_id?: string | null
          created_at?: string | null
          id?: number
          marketplace: string
          merchant_token: string
          note?: string | null
          record_date: string
          region?: string
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amazon_report_id?: string | null
          created_at?: string | null
          id?: number
          marketplace?: string
          merchant_token?: string
          note?: string | null
          record_date?: string
          region?: string
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      aircraft_buybox_watch: {
        Row: {
          account_name: string
          asin: string
          breached: boolean
          buy_box_percentage: number | null
          created_at: string | null
          emailed_at: string | null
          id: string
          marketplace: string
          record_date: string
          severity: string | null
          threshold: number
          updated_at: string | null
        }
        Insert: {
          account_name: string
          asin: string
          breached?: boolean
          buy_box_percentage?: number | null
          created_at?: string | null
          emailed_at?: string | null
          id?: string
          marketplace: string
          record_date: string
          severity?: string | null
          threshold?: number
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          asin?: string
          breached?: boolean
          buy_box_percentage?: number | null
          created_at?: string | null
          emailed_at?: string | null
          id?: string
          marketplace?: string
          record_date?: string
          severity?: string | null
          threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      aircraft_monthly_targets: {
        Row: {
          amazon_report_id: string | null
          id: number
          marketplace: string
          merchant_token: string
          month_end: string
          month_start: string
          note: string | null
          region: string
          report_doc_id: string | null
          rows_upserted: number | null
          status: string
          updated_at: string | null
          year_month: string
        }
        Insert: {
          amazon_report_id?: string | null
          id?: number
          marketplace: string
          merchant_token: string
          month_end: string
          month_start: string
          note?: string | null
          region?: string
          report_doc_id?: string | null
          rows_upserted?: number | null
          status?: string
          updated_at?: string | null
          year_month: string
        }
        Update: {
          amazon_report_id?: string | null
          id?: number
          marketplace?: string
          merchant_token?: string
          month_end?: string
          month_start?: string
          note?: string | null
          region?: string
          report_doc_id?: string | null
          rows_upserted?: number | null
          status?: string
          updated_at?: string | null
          year_month?: string
        }
        Relationships: []
      }
      alert_email_config: {
        Row: {
          created_at: string
          email_address: string
          enabled: boolean | null
          id: string
          notification_preferences: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_address: string
          enabled?: boolean | null
          id?: string
          notification_preferences?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_address?: string
          enabled?: boolean | null
          id?: string
          notification_preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      amazon_api_ad_groups_config: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_group_id: number
          ad_product: string | null
          campaign_id: number | null
          country_code: string | null
          created_at_amazon: string | null
          default_bid: number | null
          delivery_reasons: string | null
          delivery_status: string | null
          last_updated_amazon: string | null
          name: string | null
          profile_id: number
          pulled_at: string | null
          state: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id: number
          ad_product?: string | null
          campaign_id?: number | null
          country_code?: string | null
          created_at_amazon?: string | null
          default_bid?: number | null
          delivery_reasons?: string | null
          delivery_status?: string | null
          last_updated_amazon?: string | null
          name?: string | null
          profile_id: number
          pulled_at?: string | null
          state?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: number
          ad_product?: string | null
          campaign_id?: number | null
          country_code?: string | null
          created_at_amazon?: string | null
          default_bid?: number | null
          delivery_reasons?: string | null
          delivery_status?: string | null
          last_updated_amazon?: string | null
          name?: string | null
          profile_id?: number
          pulled_at?: string | null
          state?: string | null
        }
        Relationships: []
      }
      amazon_api_ad_groups_performance: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_group_id: number
          ad_group_name: string | null
          campaign_id: number | null
          clicks: number | null
          country_code: string | null
          cpc: number | null
          ctr: number | null
          date: string
          impressions: number | null
          orders_7d: number | null
          profile_id: number
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          spend: number | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id: number
          ad_group_name?: string | null
          campaign_id?: number | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date: string
          impressions?: number | null
          orders_7d?: number | null
          profile_id: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id?: number
          ad_group_name?: string | null
          campaign_id?: number | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date?: string
          impressions?: number | null
          orders_7d?: number | null
          profile_id?: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
        }
        Relationships: []
      }
      amazon_api_ads_config: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_group_id: number | null
          ad_id: number
          ad_product: string | null
          ad_type: string | null
          asin: string | null
          campaign_id: number | null
          country_code: string | null
          created_at_amazon: string | null
          delivery_reason: string | null
          delivery_status: string | null
          last_updated_amazon: string | null
          profile_id: number
          pulled_at: string | null
          sku: string | null
          state: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: number | null
          ad_id: number
          ad_product?: string | null
          ad_type?: string | null
          asin?: string | null
          campaign_id?: number | null
          country_code?: string | null
          created_at_amazon?: string | null
          delivery_reason?: string | null
          delivery_status?: string | null
          last_updated_amazon?: string | null
          profile_id: number
          pulled_at?: string | null
          sku?: string | null
          state?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: number | null
          ad_id?: number
          ad_product?: string | null
          ad_type?: string | null
          asin?: string | null
          campaign_id?: number | null
          country_code?: string | null
          created_at_amazon?: string | null
          delivery_reason?: string | null
          delivery_status?: string | null
          last_updated_amazon?: string | null
          profile_id?: number
          pulled_at?: string | null
          sku?: string | null
          state?: string | null
        }
        Relationships: []
      }
      amazon_api_ads_performance: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_group_id: number | null
          ad_id: number
          asin: string | null
          campaign_id: number | null
          clicks: number | null
          country_code: string | null
          cpc: number | null
          ctr: number | null
          date: string
          impressions: number | null
          orders_7d: number | null
          profile_id: number
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          sku: string | null
          spend: number | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id?: number | null
          ad_id: number
          asin?: string | null
          campaign_id?: number | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date: string
          impressions?: number | null
          orders_7d?: number | null
          profile_id: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          sku?: string | null
          spend?: number | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id?: number | null
          ad_id?: number
          asin?: string | null
          campaign_id?: number | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date?: string
          impressions?: number | null
          orders_7d?: number | null
          profile_id?: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          sku?: string | null
          spend?: number | null
        }
        Relationships: []
      }
      amazon_api_advertised_product_performance: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_group_id: string | null
          ad_id: string | null
          advertised_asin: string | null
          advertised_sku: string | null
          campaign_id: string | null
          clicks: number | null
          country_code: string | null
          cpc: number | null
          created_at: string | null
          ctr: number | null
          date: string | null
          id: number
          impressions: number | null
          orders_7d: number | null
          profile_id: number | null
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          spend: number | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id?: string | null
          ad_id?: string | null
          advertised_asin?: string | null
          advertised_sku?: string | null
          campaign_id?: string | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string | null
          id?: number
          impressions?: number | null
          orders_7d?: number | null
          profile_id?: number | null
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id?: string | null
          ad_id?: string | null
          advertised_asin?: string | null
          advertised_sku?: string | null
          campaign_id?: string | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string | null
          id?: number
          impressions?: number | null
          orders_7d?: number | null
          profile_id?: number | null
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
        }
        Relationships: []
      }
      amazon_api_campaigns_config: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_product: string | null
          bid_strategy: string | null
          brand_entity_id: string | null
          budget: number | null
          budget_period: string | null
          budget_type: string | null
          campaign_id: number
          cost_type: string | null
          country_code: string | null
          created_at_amazon: string | null
          currency: string | null
          delivery_reasons: string | null
          delivery_status: string | null
          end_date: string | null
          last_updated_amazon: string | null
          name: string | null
          placement_adjustments: string | null
          portfolio_id: string | null
          profile_id: number
          pulled_at: string | null
          rule_amount: number | null
          start_date: string | null
          state: string | null
          tags: string | null
          targeting: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          ad_product?: string | null
          bid_strategy?: string | null
          brand_entity_id?: string | null
          budget?: number | null
          budget_period?: string | null
          budget_type?: string | null
          campaign_id: number
          cost_type?: string | null
          country_code?: string | null
          created_at_amazon?: string | null
          currency?: string | null
          delivery_reasons?: string | null
          delivery_status?: string | null
          end_date?: string | null
          last_updated_amazon?: string | null
          name?: string | null
          placement_adjustments?: string | null
          portfolio_id?: string | null
          profile_id: number
          pulled_at?: string | null
          rule_amount?: number | null
          start_date?: string | null
          state?: string | null
          tags?: string | null
          targeting?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          ad_product?: string | null
          bid_strategy?: string | null
          brand_entity_id?: string | null
          budget?: number | null
          budget_period?: string | null
          budget_type?: string | null
          campaign_id?: number
          cost_type?: string | null
          country_code?: string | null
          created_at_amazon?: string | null
          currency?: string | null
          delivery_reasons?: string | null
          delivery_status?: string | null
          end_date?: string | null
          last_updated_amazon?: string | null
          name?: string | null
          placement_adjustments?: string | null
          portfolio_id?: string | null
          profile_id?: number
          pulled_at?: string | null
          rule_amount?: number | null
          start_date?: string | null
          state?: string | null
          tags?: string | null
          targeting?: string | null
        }
        Relationships: []
      }
      amazon_api_campaigns_performance: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          campaign_budget: number | null
          campaign_id: number
          campaign_name: string | null
          campaign_status: string | null
          clicks: number | null
          country_code: string | null
          cpc: number | null
          ctr: number | null
          date: string
          impressions: number | null
          orders_7d: number | null
          profile_id: number
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          spend: number | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          campaign_budget?: number | null
          campaign_id: number
          campaign_name?: string | null
          campaign_status?: string | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date: string
          impressions?: number | null
          orders_7d?: number | null
          profile_id: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          campaign_budget?: number | null
          campaign_id?: number
          campaign_name?: string | null
          campaign_status?: string | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date?: string
          impressions?: number | null
          orders_7d?: number | null
          profile_id?: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
        }
        Relationships: []
      }
      amazon_api_hourly_pending: {
        Row: {
          account_name: string | null
          amazon_report_id: string
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          profile_id: number
          report_date: string
          report_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          amazon_report_id: string
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          profile_id: number
          report_date: string
          report_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          amazon_report_id?: string
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          profile_id?: number
          report_date?: string
          report_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      amazon_api_hourly_sp: {
        Row: {
          account_name: string | null
          advertised_asin: string
          campaign_id: number
          clicks: number | null
          cost: number | null
          date: string
          hour: number
          impressions: number | null
          orders: number | null
          profile_id: number
          pulled_at: string | null
          sales: number | null
        }
        Insert: {
          account_name?: string | null
          advertised_asin?: string
          campaign_id: number
          clicks?: number | null
          cost?: number | null
          date: string
          hour: number
          impressions?: number | null
          orders?: number | null
          profile_id: number
          pulled_at?: string | null
          sales?: number | null
        }
        Update: {
          account_name?: string | null
          advertised_asin?: string
          campaign_id?: number
          clicks?: number | null
          cost?: number | null
          date?: string
          hour?: number
          impressions?: number | null
          orders?: number | null
          profile_id?: number
          pulled_at?: string | null
          sales?: number | null
        }
        Relationships: []
      }
      amazon_api_pending_reports: {
        Row: {
          account_id: string | null
          account_name: string | null
          amazon_report_id: string | null
          attempts: number | null
          country_code: string | null
          created_at: string | null
          date_end: string | null
          date_start: string | null
          download_url: string | null
          error_message: string | null
          id: string
          profile_id: number
          report_type: string
          status: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          amazon_report_id?: string | null
          attempts?: number | null
          country_code?: string | null
          created_at?: string | null
          date_end?: string | null
          date_start?: string | null
          download_url?: string | null
          error_message?: string | null
          id?: string
          profile_id: number
          report_type: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          amazon_report_id?: string | null
          attempts?: number | null
          country_code?: string | null
          created_at?: string | null
          date_end?: string | null
          date_start?: string | null
          download_url?: string | null
          error_message?: string | null
          id?: string
          profile_id?: number
          report_type?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      amazon_api_placement_performance: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          country_code: string | null
          cpc: number | null
          ctr: number | null
          date: string | null
          id: number
          impressions: number | null
          orders_7d: number | null
          placement_classification: string | null
          profile_id: number | null
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          spend: number | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date?: string | null
          id?: number
          impressions?: number | null
          orders_7d?: number | null
          placement_classification?: string | null
          profile_id?: number | null
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date?: string | null
          id?: number
          impressions?: number | null
          orders_7d?: number | null
          placement_classification?: string | null
          profile_id?: number | null
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
        }
        Relationships: []
      }
      amazon_api_profiles: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_type: string | null
          active: boolean
          country_code: string | null
          created_at: string | null
          currency_code: string | null
          daily_budget: number | null
          marketplace_string_id: string | null
          profile_id: number
          pulled_at: string | null
          timezone: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          account_type?: string | null
          active?: boolean
          country_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          daily_budget?: number | null
          marketplace_string_id?: string | null
          profile_id: number
          pulled_at?: string | null
          timezone?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          account_type?: string | null
          active?: boolean
          country_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          daily_budget?: number | null
          marketplace_string_id?: string | null
          profile_id?: number
          pulled_at?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      amazon_api_purchased_product_performance: {
        Row: {
          account_name: string | null
          ad_group_id: string | null
          advertised_asin: string | null
          campaign_id: string | null
          clicks: number | null
          cost: number | null
          created_at: string | null
          date: string | null
          id: number
          impressions: number | null
          keyword: string | null
          keyword_id: string | null
          keyword_type: string | null
          match_type: string | null
          profile_id: number | null
          purchased_asin: string | null
          purchases_14d: number | null
          purchases_1d: number | null
          purchases_30d: number | null
          purchases_7d: number | null
          sales_14d: number | null
          sales_1d: number | null
          sales_30d: number | null
          sales_7d: number | null
          units_sold_clicks_14d: number | null
          units_sold_clicks_1d: number | null
          units_sold_clicks_30d: number | null
          units_sold_clicks_7d: number | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: string | null
          advertised_asin?: string | null
          campaign_id?: string | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          keyword?: string | null
          keyword_id?: string | null
          keyword_type?: string | null
          match_type?: string | null
          profile_id?: number | null
          purchased_asin?: string | null
          purchases_14d?: number | null
          purchases_1d?: number | null
          purchases_30d?: number | null
          purchases_7d?: number | null
          sales_14d?: number | null
          sales_1d?: number | null
          sales_30d?: number | null
          sales_7d?: number | null
          units_sold_clicks_14d?: number | null
          units_sold_clicks_1d?: number | null
          units_sold_clicks_30d?: number | null
          units_sold_clicks_7d?: number | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: string | null
          advertised_asin?: string | null
          campaign_id?: string | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          keyword?: string | null
          keyword_id?: string | null
          keyword_type?: string | null
          match_type?: string | null
          profile_id?: number | null
          purchased_asin?: string | null
          purchases_14d?: number | null
          purchases_1d?: number | null
          purchases_30d?: number | null
          purchases_7d?: number | null
          sales_14d?: number | null
          sales_1d?: number | null
          sales_30d?: number | null
          sales_7d?: number | null
          units_sold_clicks_14d?: number | null
          units_sold_clicks_1d?: number | null
          units_sold_clicks_30d?: number | null
          units_sold_clicks_7d?: number | null
        }
        Relationships: []
      }
      amazon_api_sb_ad_groups_performance: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          ad_group_name: string | null
          campaign_id: number | null
          campaign_name: string | null
          clicks: number | null
          cost: number | null
          created_at: string | null
          date: string | null
          id: number
          impressions: number | null
          profile_id: number | null
          purchases_14d: number | null
          sales_14d: number | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          ad_group_name?: string | null
          campaign_id?: number | null
          campaign_name?: string | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          ad_group_name?: string | null
          campaign_id?: number | null
          campaign_name?: string | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
        }
        Relationships: []
      }
      amazon_api_sb_campaigns_performance: {
        Row: {
          account_name: string | null
          campaign_budget_amount: number | null
          campaign_budget_currency_code: string | null
          campaign_id: number | null
          campaign_name: string | null
          campaign_status: string | null
          click_through_rate: number | null
          clicks: number | null
          cost: number | null
          cost_per_click: number | null
          created_at: string | null
          data_source: string | null
          date: string | null
          id: number
          impressions: number | null
          new_to_brand_purchases_14d: number | null
          new_to_brand_sales_14d: number | null
          profile_id: number | null
          purchases_14d: number | null
          sales_14d: number | null
          units_sold_14d: number | null
        }
        Insert: {
          account_name?: string | null
          campaign_budget_amount?: number | null
          campaign_budget_currency_code?: string | null
          campaign_id?: number | null
          campaign_name?: string | null
          campaign_status?: string | null
          click_through_rate?: number | null
          clicks?: number | null
          cost?: number | null
          cost_per_click?: number | null
          created_at?: string | null
          data_source?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          new_to_brand_purchases_14d?: number | null
          new_to_brand_sales_14d?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          units_sold_14d?: number | null
        }
        Update: {
          account_name?: string | null
          campaign_budget_amount?: number | null
          campaign_budget_currency_code?: string | null
          campaign_id?: number | null
          campaign_name?: string | null
          campaign_status?: string | null
          click_through_rate?: number | null
          clicks?: number | null
          cost?: number | null
          cost_per_click?: number | null
          created_at?: string | null
          data_source?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          new_to_brand_purchases_14d?: number | null
          new_to_brand_sales_14d?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          units_sold_14d?: number | null
        }
        Relationships: []
      }
      amazon_api_sb_legacy_campaigns: {
        Row: {
          account_name: string | null
          campaign_id: string
          campaign_name: string | null
          created_at: string | null
          id: string
          is_legacy: boolean | null
          migrated: boolean | null
          notes: string | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          campaign_id: string
          campaign_name?: string | null
          created_at?: string | null
          id?: string
          is_legacy?: boolean | null
          migrated?: boolean | null
          notes?: string | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          campaign_id?: string
          campaign_name?: string | null
          created_at?: string | null
          id?: string
          is_legacy?: boolean | null
          migrated?: boolean | null
          notes?: string | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      amazon_api_sb_purchased_product_performance: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          campaign_id: number | null
          created_at: string | null
          date: string | null
          id: number
          new_to_brand_purchases_14d: number | null
          new_to_brand_sales_14d: number | null
          new_to_brand_units_sold_14d: number | null
          orders_14d: number | null
          product_category: string | null
          product_name: string | null
          profile_id: number | null
          purchased_asin: string | null
          sales_14d: number | null
          units_sold_14d: number | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          new_to_brand_purchases_14d?: number | null
          new_to_brand_sales_14d?: number | null
          new_to_brand_units_sold_14d?: number | null
          orders_14d?: number | null
          product_category?: string | null
          product_name?: string | null
          profile_id?: number | null
          purchased_asin?: string | null
          sales_14d?: number | null
          units_sold_14d?: number | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          new_to_brand_purchases_14d?: number | null
          new_to_brand_sales_14d?: number | null
          new_to_brand_units_sold_14d?: number | null
          orders_14d?: number | null
          product_category?: string | null
          product_name?: string | null
          profile_id?: number | null
          purchased_asin?: string | null
          sales_14d?: number | null
          units_sold_14d?: number | null
        }
        Relationships: []
      }
      amazon_api_sb_search_terms_performance: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          campaign_id: number | null
          clicks: number | null
          cost: number | null
          created_at: string | null
          date: string | null
          id: number
          impressions: number | null
          keyword: string | null
          keyword_id: number | null
          match_type: string | null
          profile_id: number | null
          purchases_14d: number | null
          sales_14d: number | null
          search_term: string | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          keyword?: string | null
          keyword_id?: number | null
          match_type?: string | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          search_term?: string | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          keyword?: string | null
          keyword_id?: number | null
          match_type?: string | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          search_term?: string | null
        }
        Relationships: []
      }
      amazon_api_sb_targets_performance: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          campaign_id: number | null
          clicks: number | null
          cost: number | null
          cost_per_click: number | null
          created_at: string | null
          date: string | null
          id: number
          impressions: number | null
          keyword: string | null
          keyword_id: string | null
          match_type: string | null
          profile_id: number | null
          purchases_14d: number | null
          sales_14d: number | null
          target_id: number | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          cost_per_click?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          keyword?: string | null
          keyword_id?: string | null
          match_type?: string | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          target_id?: number | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          cost_per_click?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          keyword?: string | null
          keyword_id?: string | null
          match_type?: string | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          target_id?: number | null
        }
        Relationships: []
      }
      amazon_api_sd_ad_groups_performance: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          ad_group_name: string | null
          campaign_id: number | null
          clicks: number | null
          cost: number | null
          created_at: string | null
          date: string | null
          id: number
          impressions: number | null
          profile_id: number | null
          purchases_14d: number | null
          sales_14d: number | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          ad_group_name?: string | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          ad_group_name?: string | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
        }
        Relationships: []
      }
      amazon_api_sd_advertised_product_performance: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          ad_id: number | null
          advertised_asin: string | null
          campaign_id: number | null
          clicks: number | null
          cost: number | null
          created_at: string | null
          date: string | null
          id: number
          impressions: number | null
          profile_id: number | null
          purchases_14d: number | null
          sales_14d: number | null
          units_sold_14d: number | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          ad_id?: number | null
          advertised_asin?: string | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          units_sold_14d?: number | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          ad_id?: number | null
          advertised_asin?: string | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          units_sold_14d?: number | null
        }
        Relationships: []
      }
      amazon_api_sd_campaigns_performance: {
        Row: {
          account_name: string | null
          campaign_budget_amount: number | null
          campaign_budget_currency_code: string | null
          campaign_id: number | null
          campaign_name: string | null
          campaign_status: string | null
          click_through_rate: number | null
          clicks: number | null
          cost: number | null
          cost_per_click: number | null
          created_at: string | null
          date: string | null
          id: number
          impressions: number | null
          profile_id: number | null
          purchases_14d: number | null
          sales_14d: number | null
          units_sold_14d: number | null
        }
        Insert: {
          account_name?: string | null
          campaign_budget_amount?: number | null
          campaign_budget_currency_code?: string | null
          campaign_id?: number | null
          campaign_name?: string | null
          campaign_status?: string | null
          click_through_rate?: number | null
          clicks?: number | null
          cost?: number | null
          cost_per_click?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          units_sold_14d?: number | null
        }
        Update: {
          account_name?: string | null
          campaign_budget_amount?: number | null
          campaign_budget_currency_code?: string | null
          campaign_id?: number | null
          campaign_name?: string | null
          campaign_status?: string | null
          click_through_rate?: number | null
          clicks?: number | null
          cost?: number | null
          cost_per_click?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          units_sold_14d?: number | null
        }
        Relationships: []
      }
      amazon_api_sd_targets_performance: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          campaign_id: number | null
          clicks: number | null
          cost: number | null
          cost_per_click: number | null
          created_at: string | null
          date: string | null
          id: number
          impressions: number | null
          profile_id: number | null
          purchases_14d: number | null
          sales_14d: number | null
          target_id: number | null
          targeting_expression: string | null
          targeting_text: string | null
          targeting_type: string | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          cost_per_click?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          target_id?: number | null
          targeting_expression?: string | null
          targeting_text?: string | null
          targeting_type?: string | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number | null
          clicks?: number | null
          cost?: number | null
          cost_per_click?: number | null
          created_at?: string | null
          date?: string | null
          id?: number
          impressions?: number | null
          profile_id?: number | null
          purchases_14d?: number | null
          sales_14d?: number | null
          target_id?: number | null
          targeting_expression?: string | null
          targeting_text?: string | null
          targeting_type?: string | null
        }
        Relationships: []
      }
      amazon_api_search_terms_performance: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_group_id: number
          ad_group_name: string | null
          ad_keyword_status: string | null
          campaign_id: number | null
          campaign_name: string | null
          clicks: number | null
          country_code: string | null
          cpc: number | null
          ctr: number | null
          date_end: string
          date_start: string
          impressions: number | null
          keyword: string | null
          keyword_id: number
          keyword_type: string | null
          match_type: string | null
          orders_7d: number | null
          portfolio_id: number | null
          profile_id: number
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          search_term: string
          spend: number | null
          targeting: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id: number
          ad_group_name?: string | null
          ad_keyword_status?: string | null
          campaign_id?: number | null
          campaign_name?: string | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date_end: string
          date_start: string
          impressions?: number | null
          keyword?: string | null
          keyword_id: number
          keyword_type?: string | null
          match_type?: string | null
          orders_7d?: number | null
          portfolio_id?: number | null
          profile_id: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          search_term: string
          spend?: number | null
          targeting?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id?: number
          ad_group_name?: string | null
          ad_keyword_status?: string | null
          campaign_id?: number | null
          campaign_name?: string | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date_end?: string
          date_start?: string
          impressions?: number | null
          keyword?: string | null
          keyword_id?: number
          keyword_type?: string | null
          match_type?: string | null
          orders_7d?: number | null
          portfolio_id?: number | null
          profile_id?: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          search_term?: string
          spend?: number | null
          targeting?: string | null
        }
        Relationships: []
      }
      amazon_api_targets_config: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_group_id: number | null
          ad_product: string | null
          bid: number | null
          campaign_id: number | null
          country_code: string | null
          created_at_amazon: string | null
          delivery_reasons: string | null
          delivery_status: string | null
          keyword_expression: string | null
          last_updated_amazon: string | null
          match_type: string | null
          negative: boolean | null
          profile_id: number
          pulled_at: string | null
          state: string | null
          target_id: number
          target_type: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: number | null
          ad_product?: string | null
          bid?: number | null
          campaign_id?: number | null
          country_code?: string | null
          created_at_amazon?: string | null
          delivery_reasons?: string | null
          delivery_status?: string | null
          keyword_expression?: string | null
          last_updated_amazon?: string | null
          match_type?: string | null
          negative?: boolean | null
          profile_id: number
          pulled_at?: string | null
          state?: string | null
          target_id: number
          target_type?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: number | null
          ad_product?: string | null
          bid?: number | null
          campaign_id?: number | null
          country_code?: string | null
          created_at_amazon?: string | null
          delivery_reasons?: string | null
          delivery_status?: string | null
          keyword_expression?: string | null
          last_updated_amazon?: string | null
          match_type?: string | null
          negative?: boolean | null
          profile_id?: number
          pulled_at?: string | null
          state?: string | null
          target_id?: number
          target_type?: string | null
        }
        Relationships: []
      }
      amazon_api_targets_performance: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_group_id: number | null
          ad_keyword_status: string | null
          campaign_id: number | null
          clicks: number | null
          country_code: string | null
          cpc: number | null
          ctr: number | null
          date: string
          impressions: number | null
          keyword: string | null
          keyword_bid: number | null
          keyword_type: string | null
          match_type: string | null
          orders_7d: number | null
          profile_id: number
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          spend: number | null
          target_id: number
          targeting: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id?: number | null
          ad_keyword_status?: string | null
          campaign_id?: number | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date: string
          impressions?: number | null
          keyword?: string | null
          keyword_bid?: number | null
          keyword_type?: string | null
          match_type?: string | null
          orders_7d?: number | null
          profile_id: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
          target_id: number
          targeting?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          acos_7d?: number | null
          ad_group_id?: number | null
          ad_keyword_status?: string | null
          campaign_id?: number | null
          clicks?: number | null
          country_code?: string | null
          cpc?: number | null
          ctr?: number | null
          date?: string
          impressions?: number | null
          keyword?: string | null
          keyword_bid?: number | null
          keyword_type?: string | null
          match_type?: string | null
          orders_7d?: number | null
          profile_id?: number
          pulled_at?: string | null
          roas_7d?: number | null
          sales_7d?: number | null
          spend?: number | null
          target_id?: number
          targeting?: string | null
        }
        Relationships: []
      }
      amazon_categories: {
        Row: {
          amazon_domain: string | null
          category_id: string
          category_label: string
          created_at: string | null
          id: string
          parent_category: string | null
        }
        Insert: {
          amazon_domain?: string | null
          category_id: string
          category_label: string
          created_at?: string | null
          id?: string
          parent_category?: string | null
        }
        Update: {
          amazon_domain?: string | null
          category_id?: string
          category_label?: string
          created_at?: string | null
          id?: string
          parent_category?: string | null
        }
        Relationships: []
      }
      amazon_marketplaces: {
        Row: {
          capital_lat: number | null
          capital_lon: number | null
          capital_name: string | null
          country_code: string
          country_name: string
          currency: string
          domain: string
          marketplace_id: string
          region: string
          sort_order: number
        }
        Insert: {
          capital_lat?: number | null
          capital_lon?: number | null
          capital_name?: string | null
          country_code: string
          country_name: string
          currency: string
          domain: string
          marketplace_id: string
          region: string
          sort_order?: number
        }
        Update: {
          capital_lat?: number | null
          capital_lon?: number | null
          capital_name?: string | null
          country_code?: string
          country_name?: string
          currency?: string
          domain?: string
          marketplace_id?: string
          region?: string
          sort_order?: number
        }
        Relationships: []
      }
      apex_asin_runs: {
        Row: {
          asin: string
          brand_url: string | null
          created_at: string
          error: string | null
          id: string
          marketplace: string
          result: Json | null
          stage_status: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          asin: string
          brand_url?: string | null
          created_at?: string
          error?: string | null
          id?: string
          marketplace?: string
          result?: Json | null
          stage_status?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          asin?: string
          brand_url?: string | null
          created_at?: string
          error?: string | null
          id?: string
          marketplace?: string
          result?: Json | null
          stage_status?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      apex_brand_data: {
        Row: {
          asin: string
          brand: string | null
          brand_story: string | null
          certifications: string | null
          materials: string | null
          updated_at: string
          website_source: string | null
        }
        Insert: {
          asin: string
          brand?: string | null
          brand_story?: string | null
          certifications?: string | null
          materials?: string | null
          updated_at?: string
          website_source?: string | null
        }
        Update: {
          asin?: string
          brand?: string | null
          brand_story?: string | null
          certifications?: string | null
          materials?: string | null
          updated_at?: string
          website_source?: string | null
        }
        Relationships: []
      }
      apex_keywords: {
        Row: {
          asin: string
          created_at: string
          id: string
          keyword: string
          marketplace: string
          relevance_score: number | null
          search_volume: number | null
          source: string | null
          tier: string | null
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          keyword: string
          marketplace?: string
          relevance_score?: number | null
          search_volume?: number | null
          source?: string | null
          tier?: string | null
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          keyword?: string
          marketplace?: string
          relevance_score?: number | null
          search_volume?: number | null
          source?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      apex_listing_pushes: {
        Row: {
          account: string | null
          amazon_http: number | null
          amazon_response: Json | null
          asin: string | null
          created_at: string | null
          created_by: string | null
          id: string
          issues: Json | null
          job_id: string | null
          listing_type: string | null
          marketplace_id: string | null
          mode: string | null
          patched_attributes: Json | null
          product_type: string | null
          request_payload: Json | null
          run_id: string | null
          sku: string | null
          status: string | null
          submission_id: string | null
        }
        Insert: {
          account?: string | null
          amazon_http?: number | null
          amazon_response?: Json | null
          asin?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          issues?: Json | null
          job_id?: string | null
          listing_type?: string | null
          marketplace_id?: string | null
          mode?: string | null
          patched_attributes?: Json | null
          product_type?: string | null
          request_payload?: Json | null
          run_id?: string | null
          sku?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Update: {
          account?: string | null
          amazon_http?: number | null
          amazon_response?: Json | null
          asin?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          issues?: Json | null
          job_id?: string | null
          listing_type?: string | null
          marketplace_id?: string | null
          mode?: string | null
          patched_attributes?: Json | null
          product_type?: string | null
          request_payload?: Json | null
          run_id?: string | null
          sku?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Relationships: []
      }
      apex_model_calls: {
        Row: {
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input_tokens: number | null
          job_id: string | null
          model: string | null
          output_tokens: number | null
          pipeline: string
          provider: string
          request_payload: Json | null
          response_payload: Json | null
          run_id: string | null
          stage: string
          status: string
          system_prompt: string | null
          user_prompt: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_tokens?: number | null
          job_id?: string | null
          model?: string | null
          output_tokens?: number | null
          pipeline: string
          provider: string
          request_payload?: Json | null
          response_payload?: Json | null
          run_id?: string | null
          stage: string
          status?: string
          system_prompt?: string | null
          user_prompt?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_tokens?: number | null
          job_id?: string | null
          model?: string | null
          output_tokens?: number | null
          pipeline?: string
          provider?: string
          request_payload?: Json | null
          response_payload?: Json | null
          run_id?: string | null
          stage?: string
          status?: string
          system_prompt?: string | null
          user_prompt?: string | null
        }
        Relationships: []
      }
      apex_pipeline_jobs: {
        Row: {
          brand_guidelines: Json | null
          chatgpt_opinion: Json | null
          claude_model: string | null
          claude_output: Json | null
          claude_prompt: string | null
          completed_at: string | null
          created_at: string | null
          deliverables: Json | null
          error_message: string | null
          gemini_opinion: Json | null
          id: string
          input_prompt: string | null
          manus_output: Json | null
          manus_prompt: string | null
          manus_task_id: string | null
          metadata: Json | null
          pipeline_options: Json | null
          sheet_data: Json | null
          sheet_name: string | null
          spreadsheet_id: string | null
          status: string
          updated_at: string | null
          usage_summary: Json | null
          workflow_type: string
        }
        Insert: {
          brand_guidelines?: Json | null
          chatgpt_opinion?: Json | null
          claude_model?: string | null
          claude_output?: Json | null
          claude_prompt?: string | null
          completed_at?: string | null
          created_at?: string | null
          deliverables?: Json | null
          error_message?: string | null
          gemini_opinion?: Json | null
          id?: string
          input_prompt?: string | null
          manus_output?: Json | null
          manus_prompt?: string | null
          manus_task_id?: string | null
          metadata?: Json | null
          pipeline_options?: Json | null
          sheet_data?: Json | null
          sheet_name?: string | null
          spreadsheet_id?: string | null
          status?: string
          updated_at?: string | null
          usage_summary?: Json | null
          workflow_type?: string
        }
        Update: {
          brand_guidelines?: Json | null
          chatgpt_opinion?: Json | null
          claude_model?: string | null
          claude_output?: Json | null
          claude_prompt?: string | null
          completed_at?: string | null
          created_at?: string | null
          deliverables?: Json | null
          error_message?: string | null
          gemini_opinion?: Json | null
          id?: string
          input_prompt?: string | null
          manus_output?: Json | null
          manus_prompt?: string | null
          manus_task_id?: string | null
          metadata?: Json | null
          pipeline_options?: Json | null
          sheet_data?: Json | null
          sheet_name?: string | null
          spreadsheet_id?: string | null
          status?: string
          updated_at?: string | null
          usage_summary?: Json | null
          workflow_type?: string
        }
        Relationships: []
      }
      apex_pipeline_logs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          message: string | null
          payload: Json | null
          status: string
          step: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          message?: string | null
          payload?: Json | null
          status: string
          step: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          message?: string | null
          payload?: Json | null
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "apex_pipeline_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "apex_pipeline_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      apex_prompts: {
        Row: {
          content: string
          default_content: string
          description: string | null
          is_active: boolean
          key: string
          label: string
          model: string | null
          provider: string
          role: string
          sort: number
          stage: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          content: string
          default_content: string
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          model?: string | null
          provider: string
          role?: string
          sort?: number
          stage: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          content?: string
          default_content?: string
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          model?: string | null
          provider?: string
          role?: string
          sort?: number
          stage?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: []
      }
      apex_reviews: {
        Row: {
          asin: string
          body: string | null
          helpful_count: number | null
          id: string
          marketplace: string
          rating: number | null
          scraped_at: string | null
          sentiment: string | null
          title: string | null
          verified: boolean | null
        }
        Insert: {
          asin: string
          body?: string | null
          helpful_count?: number | null
          id?: string
          marketplace?: string
          rating?: number | null
          scraped_at?: string | null
          sentiment?: string | null
          title?: string | null
          verified?: boolean | null
        }
        Update: {
          asin?: string
          body?: string | null
          helpful_count?: number | null
          id?: string
          marketplace?: string
          rating?: number | null
          scraped_at?: string | null
          sentiment?: string | null
          title?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      apex_skill_files: {
        Row: {
          content: string
          created_at: string | null
          filename: string
          id: string
          skill_name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          filename: string
          id?: string
          skill_name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          filename?: string
          id?: string
          skill_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      asin_cost_prices: {
        Row: {
          asin: string
          brand: string
          cost_price: number
          id: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          asin: string
          brand: string
          cost_price?: number
          id?: never
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          asin?: string
          brand?: string
          cost_price?: number
          id?: never
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      asin_monthly: {
        Row: {
          buy_box_pct: number | null
          child_asin: string
          id: number
          merchant_token: string
          page_views: number | null
          parent_asin: string | null
          sales: number | null
          unit_session_pct: number | null
          units: number | null
          updated_at: string | null
          year_month: string
        }
        Insert: {
          buy_box_pct?: number | null
          child_asin: string
          id?: number
          merchant_token: string
          page_views?: number | null
          parent_asin?: string | null
          sales?: number | null
          unit_session_pct?: number | null
          units?: number | null
          updated_at?: string | null
          year_month: string
        }
        Update: {
          buy_box_pct?: number | null
          child_asin?: string
          id?: number
          merchant_token?: string
          page_views?: number | null
          parent_asin?: string | null
          sales?: number | null
          unit_session_pct?: number | null
          units?: number | null
          updated_at?: string | null
          year_month?: string
        }
        Relationships: []
      }
      asin_st_queue: {
        Row: {
          amazon_report_id: string | null
          attempts: number
          created_at: string
          error: string | null
          id: number
          marketplace: string
          merchant_token: string
          record_date: string
          region: string
          rows_upserted: number | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amazon_report_id?: string | null
          attempts?: number
          created_at?: string
          error?: string | null
          id?: never
          marketplace: string
          merchant_token: string
          record_date: string
          region: string
          rows_upserted?: number | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amazon_report_id?: string | null
          attempts?: number
          created_at?: string
          error?: string | null
          id?: never
          marketplace?: string
          merchant_token?: string
          record_date?: string
          region?: string
          rows_upserted?: number | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ba_demographics: {
        Row: {
          account_name: string
          customer_share: number | null
          dimension: string
          dimension_value: string
          id: number
          marketplace_id: string
          period_end: string
          period_start: string
          period_type: string
          pulled_at: string
          raw: Json | null
          sales_amount: number | null
          selling_partner_id: string
          unique_customers: number | null
        }
        Insert: {
          account_name: string
          customer_share?: number | null
          dimension: string
          dimension_value: string
          id?: number
          marketplace_id: string
          period_end: string
          period_start: string
          period_type?: string
          pulled_at?: string
          raw?: Json | null
          sales_amount?: number | null
          selling_partner_id: string
          unique_customers?: number | null
        }
        Update: {
          account_name?: string
          customer_share?: number | null
          dimension?: string
          dimension_value?: string
          id?: number
          marketplace_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          pulled_at?: string
          raw?: Json | null
          sales_amount?: number | null
          selling_partner_id?: string
          unique_customers?: number | null
        }
        Relationships: []
      }
      ba_fin_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      ba_fin_jobs: {
        Row: {
          account_name: string
          amazon_report_id: string | null
          amazon_report_type: string | null
          asin_key: string | null
          attempts: number
          created_at: string
          dest_table: string
          document_id: string | null
          id: number
          last_error: string | null
          marketplace_id: string
          mechanism: string
          next_action_at: string
          options: Json
          period_end: string | null
          period_start: string | null
          period_type: string | null
          query_id: string | null
          region: string | null
          report_type: string
          rows_upserted: number | null
          selling_partner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          amazon_report_id?: string | null
          amazon_report_type?: string | null
          asin_key?: string | null
          attempts?: number
          created_at?: string
          dest_table: string
          document_id?: string | null
          id?: number
          last_error?: string | null
          marketplace_id: string
          mechanism: string
          next_action_at?: string
          options?: Json
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          query_id?: string | null
          region?: string | null
          report_type: string
          rows_upserted?: number | null
          selling_partner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          amazon_report_id?: string | null
          amazon_report_type?: string | null
          asin_key?: string | null
          attempts?: number
          created_at?: string
          dest_table?: string
          document_id?: string | null
          id?: number
          last_error?: string | null
          marketplace_id?: string
          mechanism?: string
          next_action_at?: string
          options?: Json
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          query_id?: string | null
          region?: string | null
          report_type?: string
          rows_upserted?: number | null
          selling_partner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ba_market_basket: {
        Row: {
          account_name: string
          also_bought_asin: string
          also_bought_title: string | null
          asin: string
          combination_rate: number | null
          id: number
          marketplace_id: string
          period_end: string
          period_start: string
          period_type: string
          pulled_at: string
          rank_position: number | null
          raw: Json | null
          selling_partner_id: string
        }
        Insert: {
          account_name: string
          also_bought_asin: string
          also_bought_title?: string | null
          asin: string
          combination_rate?: number | null
          id?: number
          marketplace_id: string
          period_end: string
          period_start: string
          period_type?: string
          pulled_at?: string
          rank_position?: number | null
          raw?: Json | null
          selling_partner_id: string
        }
        Update: {
          account_name?: string
          also_bought_asin?: string
          also_bought_title?: string | null
          asin?: string
          combination_rate?: number | null
          id?: number
          marketplace_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          pulled_at?: string
          rank_position?: number | null
          raw?: Json | null
          selling_partner_id?: string
        }
        Relationships: []
      }
      ba_repeat_purchase: {
        Row: {
          account_name: string
          asin: string
          id: number
          marketplace_id: string
          orders: number | null
          period_end: string
          period_start: string
          period_type: string
          pulled_at: string
          raw: Json | null
          repeat_customer_rate: number | null
          repeat_customers: number | null
          repeat_sales_amount: number | null
          repeat_sales_share: number | null
          selling_partner_id: string
          unique_customers: number | null
        }
        Insert: {
          account_name: string
          asin?: string
          id?: number
          marketplace_id: string
          orders?: number | null
          period_end: string
          period_start: string
          period_type?: string
          pulled_at?: string
          raw?: Json | null
          repeat_customer_rate?: number | null
          repeat_customers?: number | null
          repeat_sales_amount?: number | null
          repeat_sales_share?: number | null
          selling_partner_id: string
          unique_customers?: number | null
        }
        Update: {
          account_name?: string
          asin?: string
          id?: number
          marketplace_id?: string
          orders?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          pulled_at?: string
          raw?: Json | null
          repeat_customer_rate?: number | null
          repeat_customers?: number | null
          repeat_sales_amount?: number | null
          repeat_sales_share?: number | null
          selling_partner_id?: string
          unique_customers?: number | null
        }
        Relationships: []
      }
      ba_search_catalog_performance: {
        Row: {
          account_name: string
          asin: string
          cart_add_rate: number | null
          cart_adds: number | null
          click_through_rate: number | null
          clicks: number | null
          id: number
          impressions: number | null
          marketplace_id: string
          period_end: string
          period_start: string
          period_type: string
          pulled_at: string
          purchase_rate: number | null
          purchases: number | null
          raw: Json | null
          selling_partner_id: string
        }
        Insert: {
          account_name: string
          asin: string
          cart_add_rate?: number | null
          cart_adds?: number | null
          click_through_rate?: number | null
          clicks?: number | null
          id?: number
          impressions?: number | null
          marketplace_id: string
          period_end: string
          period_start: string
          period_type?: string
          pulled_at?: string
          purchase_rate?: number | null
          purchases?: number | null
          raw?: Json | null
          selling_partner_id: string
        }
        Update: {
          account_name?: string
          asin?: string
          cart_add_rate?: number | null
          cart_adds?: number | null
          click_through_rate?: number | null
          clicks?: number | null
          id?: number
          impressions?: number | null
          marketplace_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          pulled_at?: string
          purchase_rate?: number | null
          purchases?: number | null
          raw?: Json | null
          selling_partner_id?: string
        }
        Relationships: []
      }
      ba_search_query_performance: {
        Row: {
          account_name: string
          asin: string
          cart_add_rate: number | null
          cart_adds_brand_share: number | null
          cart_adds_total: number | null
          click_rate: number | null
          clicks_brand_count: number | null
          clicks_brand_share: number | null
          clicks_total: number | null
          grain: string
          id: number
          impressions_brand_count: number | null
          impressions_brand_share: number | null
          impressions_total: number | null
          marketplace_id: string
          median_click_price: number | null
          period_end: string
          period_start: string
          period_type: string
          pulled_at: string
          purchase_rate: number | null
          purchases_brand_share: number | null
          purchases_total: number | null
          raw: Json | null
          search_query: string
          search_query_score: number | null
          search_query_volume: number | null
          selling_partner_id: string
        }
        Insert: {
          account_name: string
          asin?: string
          cart_add_rate?: number | null
          cart_adds_brand_share?: number | null
          cart_adds_total?: number | null
          click_rate?: number | null
          clicks_brand_count?: number | null
          clicks_brand_share?: number | null
          clicks_total?: number | null
          grain?: string
          id?: number
          impressions_brand_count?: number | null
          impressions_brand_share?: number | null
          impressions_total?: number | null
          marketplace_id: string
          median_click_price?: number | null
          period_end: string
          period_start: string
          period_type?: string
          pulled_at?: string
          purchase_rate?: number | null
          purchases_brand_share?: number | null
          purchases_total?: number | null
          raw?: Json | null
          search_query: string
          search_query_score?: number | null
          search_query_volume?: number | null
          selling_partner_id: string
        }
        Update: {
          account_name?: string
          asin?: string
          cart_add_rate?: number | null
          cart_adds_brand_share?: number | null
          cart_adds_total?: number | null
          click_rate?: number | null
          clicks_brand_count?: number | null
          clicks_brand_share?: number | null
          clicks_total?: number | null
          grain?: string
          id?: number
          impressions_brand_count?: number | null
          impressions_brand_share?: number | null
          impressions_total?: number | null
          marketplace_id?: string
          median_click_price?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          pulled_at?: string
          purchase_rate?: number | null
          purchases_brand_share?: number | null
          purchases_total?: number | null
          raw?: Json | null
          search_query?: string
          search_query_score?: number | null
          search_query_volume?: number | null
          selling_partner_id?: string
        }
        Relationships: []
      }
      ba_top_search_terms: {
        Row: {
          account_name: string
          click_share: number | null
          clicked_asin: string | null
          clicked_title: string | null
          conversion_share: number | null
          id: number
          marketplace_id: string
          period_end: string
          period_start: string
          period_type: string
          pulled_at: string
          rank_position: number
          raw: Json | null
          search_frequency_rank: number | null
          search_term: string
          selling_partner_id: string
        }
        Insert: {
          account_name: string
          click_share?: number | null
          clicked_asin?: string | null
          clicked_title?: string | null
          conversion_share?: number | null
          id?: number
          marketplace_id: string
          period_end: string
          period_start: string
          period_type?: string
          pulled_at?: string
          rank_position: number
          raw?: Json | null
          search_frequency_rank?: number | null
          search_term: string
          selling_partner_id: string
        }
        Update: {
          account_name?: string
          click_share?: number | null
          clicked_asin?: string | null
          clicked_title?: string | null
          conversion_share?: number | null
          id?: number
          marketplace_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          pulled_at?: string
          rank_position?: number
          raw?: Json | null
          search_frequency_rank?: number | null
          search_term?: string
          selling_partner_id?: string
        }
        Relationships: []
      }
      bello_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          model: string | null
          role: string
          sequence: number
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          role: string
          sequence: number
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string | null
          role?: string
          sequence?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bello_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bello_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bello_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bello_executions: {
        Row: {
          completed_at: string | null
          context: Json | null
          error: string | null
          id: string
          node_logs: Json | null
          started_at: string | null
          status: string | null
          trigger_payload: Json | null
          triggered_by: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          error?: string | null
          id?: string
          node_logs?: Json | null
          started_at?: string | null
          status?: string | null
          trigger_payload?: Json | null
          triggered_by?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          error?: string | null
          id?: string
          node_logs?: Json | null
          started_at?: string | null
          status?: string | null
          trigger_payload?: Json | null
          triggered_by?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bello_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "bello_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      bello_node_types: {
        Row: {
          category: string
          config_schema: Json | null
          created_at: string | null
          description: string | null
          edge_function: string | null
          icon: string | null
          id: string
          label: string
        }
        Insert: {
          category: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          edge_function?: string | null
          icon?: string | null
          id: string
          label: string
        }
        Update: {
          category?: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          edge_function?: string | null
          icon?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      bello_workflows: {
        Row: {
          created_at: string | null
          description: string | null
          edges: Json
          id: string
          is_active: boolean | null
          name: string
          nodes: Json
          tags: string[] | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          viewport: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean | null
          name: string
          nodes?: Json
          tags?: string[] | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          viewport?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          nodes?: Json
          tags?: string[] | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          viewport?: Json | null
        }
        Relationships: []
      }
      bestseller_benchmarks: {
        Row: {
          avg_revenue: number | null
          avg_units: number | null
          category_id: string
          config_id: string | null
          created_at: string | null
          id: string
          max_revenue: number | null
          max_units: number | null
          median_revenue: number | null
          median_units: number | null
          min_revenue: number | null
          min_units: number | null
          snapshot_date: string
          summary_text: string | null
        }
        Insert: {
          avg_revenue?: number | null
          avg_units?: number | null
          category_id: string
          config_id?: string | null
          created_at?: string | null
          id?: string
          max_revenue?: number | null
          max_units?: number | null
          median_revenue?: number | null
          median_units?: number | null
          min_revenue?: number | null
          min_units?: number | null
          snapshot_date: string
          summary_text?: string | null
        }
        Update: {
          avg_revenue?: number | null
          avg_units?: number | null
          category_id?: string
          config_id?: string | null
          created_at?: string | null
          id?: string
          max_revenue?: number | null
          max_units?: number | null
          median_revenue?: number | null
          median_units?: number | null
          min_revenue?: number | null
          min_units?: number | null
          snapshot_date?: string
          summary_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bestseller_benchmarks_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "bestseller_config"
            referencedColumns: ["id"]
          },
        ]
      }
      bestseller_config: {
        Row: {
          account_id: string | null
          amazon_domain: string | null
          brand_name: string
          category_id: string
          category_label: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          list_type: string | null
          marketplace: string | null
          schedule: string | null
          sub_brand: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amazon_domain?: string | null
          brand_name: string
          category_id: string
          category_label?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          list_type?: string | null
          marketplace?: string | null
          schedule?: string | null
          sub_brand?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amazon_domain?: string | null
          brand_name?: string
          category_id?: string
          category_label?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          list_type?: string | null
          marketplace?: string | null
          schedule?: string | null
          sub_brand?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bestseller_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      bestseller_snapshots: {
        Row: {
          amazon_domain: string | null
          asin: string
          brand_name: string | null
          category_id: string | null
          config_id: string | null
          created_at: string | null
          id: string
          js_buy_box_owner: string | null
          js_estimated_revenue: number | null
          js_estimated_units: number | null
          js_fulfillment: string | null
          js_seller_count: number | null
          price: number | null
          price_currency: string | null
          rank: number | null
          rating: number | null
          reviews: number | null
          snapshot_date: string | null
          thumbnail: string | null
          title: string | null
        }
        Insert: {
          amazon_domain?: string | null
          asin: string
          brand_name?: string | null
          category_id?: string | null
          config_id?: string | null
          created_at?: string | null
          id?: string
          js_buy_box_owner?: string | null
          js_estimated_revenue?: number | null
          js_estimated_units?: number | null
          js_fulfillment?: string | null
          js_seller_count?: number | null
          price?: number | null
          price_currency?: string | null
          rank?: number | null
          rating?: number | null
          reviews?: number | null
          snapshot_date?: string | null
          thumbnail?: string | null
          title?: string | null
        }
        Update: {
          amazon_domain?: string | null
          asin?: string
          brand_name?: string | null
          category_id?: string | null
          config_id?: string | null
          created_at?: string | null
          id?: string
          js_buy_box_owner?: string | null
          js_estimated_revenue?: number | null
          js_estimated_units?: number | null
          js_fulfillment?: string | null
          js_seller_count?: number | null
          price?: number | null
          price_currency?: string | null
          rank?: number | null
          rating?: number | null
          reviews?: number | null
          snapshot_date?: string | null
          thumbnail?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bestseller_snapshots_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "bestseller_config"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_days: {
        Row: {
          blocked_date: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      brand_marketplaces: {
        Row: {
          added_at: string
          brand_name: string
          country_code: string
          currency: string
          enabled: boolean
          id: string
          is_primary: boolean
          marketplace_id: string
          region: string
          sales_account_key: string
          selling_partner_id: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          brand_name: string
          country_code: string
          currency: string
          enabled?: boolean
          id?: string
          is_primary?: boolean
          marketplace_id: string
          region: string
          sales_account_key: string
          selling_partner_id: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          brand_name?: string
          country_code?: string
          currency?: string
          enabled?: boolean
          id?: string
          is_primary?: boolean
          marketplace_id?: string
          region?: string
          sales_account_key?: string
          selling_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_marketplaces_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "amazon_marketplaces"
            referencedColumns: ["marketplace_id"]
          },
        ]
      }
      budget_imports: {
        Row: {
          column_mapping: Json | null
          confidence: number | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          detected_layout: Json | null
          fiscal_year: number | null
          id: string
          proposed_lines: Json | null
          raw_grid: Json | null
          selling_partner_id: string | null
          source_file_name: string | null
          source_file_path: string | null
          status: string
          version_id: string | null
          warnings: Json | null
        }
        Insert: {
          column_mapping?: Json | null
          confidence?: number | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          detected_layout?: Json | null
          fiscal_year?: number | null
          id?: string
          proposed_lines?: Json | null
          raw_grid?: Json | null
          selling_partner_id?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          status?: string
          version_id?: string | null
          warnings?: Json | null
        }
        Update: {
          column_mapping?: Json | null
          confidence?: number | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          detected_layout?: Json | null
          fiscal_year?: number | null
          id?: string
          proposed_lines?: Json | null
          raw_grid?: Json | null
          selling_partner_id?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          status?: string
          version_id?: string | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_imports_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          amount: number
          country_code: string | null
          created_at: string
          currency: string
          grain: string
          id: string
          metric: string
          period_month: string
          period_start: string | null
          scope_level: string
          selling_partner_id: string
          version_id: string
        }
        Insert: {
          amount?: number
          country_code?: string | null
          created_at?: string
          currency?: string
          grain?: string
          id?: string
          metric: string
          period_month: string
          period_start?: string | null
          scope_level: string
          selling_partner_id: string
          version_id: string
        }
        Update: {
          amount?: number
          country_code?: string | null
          created_at?: string
          currency?: string
          grain?: string
          id?: string
          metric?: string
          period_month?: string
          period_start?: string | null
          scope_level?: string
          selling_partner_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_mapping_templates: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          label: string | null
          last_used_at: string | null
          mapping: Json
          selling_partner_id: string | null
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          mapping: Json
          selling_partner_id?: string | null
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          mapping?: Json
          selling_partner_id?: string | null
        }
        Relationships: []
      }
      budget_versions: {
        Row: {
          activated_at: string | null
          brand_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          fiscal_year: number
          id: string
          label: string
          notes: string | null
          selling_partner_id: string
          source_file_name: string | null
          source_file_path: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          brand_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fiscal_year: number
          id?: string
          label: string
          notes?: string | null
          selling_partner_id: string
          source_file_name?: string | null
          source_file_path?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          brand_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fiscal_year?: number
          id?: string
          label?: string
          notes?: string | null
          selling_partner_id?: string
          source_file_name?: string | null
          source_file_path?: string | null
          status?: string
        }
        Relationships: []
      }
      buy_box_alerts: {
        Row: {
          account_name: string
          acknowledged_at: string | null
          alert_message: string | null
          asin: string
          consecutive_days_at_zero: number | null
          created_at: string | null
          current_percentage: number
          detection_date: string
          id: string
          notified_at: string | null
          percentage_drop: number | null
          previous_percentage: number | null
          product_title: string | null
          resolved_at: string | null
          severity: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          acknowledged_at?: string | null
          alert_message?: string | null
          asin: string
          consecutive_days_at_zero?: number | null
          created_at?: string | null
          current_percentage: number
          detection_date: string
          id?: string
          notified_at?: string | null
          percentage_drop?: number | null
          previous_percentage?: number | null
          product_title?: string | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          acknowledged_at?: string | null
          alert_message?: string | null
          asin?: string
          consecutive_days_at_zero?: number | null
          created_at?: string | null
          current_percentage?: number
          detection_date?: string
          id?: string
          notified_at?: string | null
          percentage_drop?: number | null
          previous_percentage?: number | null
          product_title?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      catalog_content_export: {
        Row: {
          account_name: string
          asin: string
          attributes: Json | null
          brand: string | null
          bullet_points: Json | null
          child_asins: string[] | null
          classifications: Json | null
          description: string | null
          dimensions: Json | null
          fetched_at: string
          found: boolean
          identifiers: Json | null
          images: Json | null
          marketplace_id: string
          parent_asin: string | null
          parent_title: string | null
          product_type: string | null
          relationships: Json | null
          sales_ranks: Json | null
          title: string | null
          variation_theme: string | null
          vendor_details: Json | null
        }
        Insert: {
          account_name: string
          asin: string
          attributes?: Json | null
          brand?: string | null
          bullet_points?: Json | null
          child_asins?: string[] | null
          classifications?: Json | null
          description?: string | null
          dimensions?: Json | null
          fetched_at?: string
          found?: boolean
          identifiers?: Json | null
          images?: Json | null
          marketplace_id: string
          parent_asin?: string | null
          parent_title?: string | null
          product_type?: string | null
          relationships?: Json | null
          sales_ranks?: Json | null
          title?: string | null
          variation_theme?: string | null
          vendor_details?: Json | null
        }
        Update: {
          account_name?: string
          asin?: string
          attributes?: Json | null
          brand?: string | null
          bullet_points?: Json | null
          child_asins?: string[] | null
          classifications?: Json | null
          description?: string | null
          dimensions?: Json | null
          fetched_at?: string
          found?: boolean
          identifiers?: Json | null
          images?: Json | null
          marketplace_id?: string
          parent_asin?: string | null
          parent_title?: string | null
          product_type?: string | null
          relationships?: Json | null
          sales_ranks?: Json | null
          title?: string | null
          variation_theme?: string | null
          vendor_details?: Json | null
        }
        Relationships: []
      }
      catalog_export_asins: {
        Row: {
          account_name: string
          added_at: string
          asin: string
          enqueued: boolean
          marketplace_id: string
        }
        Insert: {
          account_name: string
          added_at?: string
          asin: string
          enqueued?: boolean
          marketplace_id: string
        }
        Update: {
          account_name?: string
          added_at?: string
          asin?: string
          enqueued?: boolean
          marketplace_id?: string
        }
        Relationships: []
      }
      catalog_export_jobs: {
        Row: {
          account_name: string
          asins: string[]
          attempts: number
          id: number
          last_error: string | null
          marketplace_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          asins: string[]
          attempts?: number
          id?: never
          last_error?: string | null
          marketplace_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          asins?: string[]
          attempts?: number
          id?: never
          last_error?: string | null
          marketplace_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_parent_titles: {
        Row: {
          fetched_at: string
          found: boolean | null
          marketplace_id: string
          parent_asin: string
          title: string | null
        }
        Insert: {
          fetched_at?: string
          found?: boolean | null
          marketplace_id?: string
          parent_asin: string
          title?: string | null
        }
        Update: {
          fetched_at?: string
          found?: boolean | null
          marketplace_id?: string
          parent_asin?: string
          title?: string | null
        }
        Relationships: []
      }
      ChatGPT_API_keyword_relevance: {
        Row: {
          account_name: string | null
          asin: string
          created_at: string | null
          id: number
          jungle_scout_rank: number | null
          keyword: string
          model_used: string | null
          reasoning: string | null
          relevance_label: string | null
          relevance_score: number | null
          search_volume: number | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          asin: string
          created_at?: string | null
          id?: number
          jungle_scout_rank?: number | null
          keyword: string
          model_used?: string | null
          reasoning?: string | null
          relevance_label?: string | null
          relevance_score?: number | null
          search_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          asin?: string
          created_at?: string | null
          id?: number
          jungle_scout_rank?: number | null
          keyword?: string
          model_used?: string | null
          reasoning?: string | null
          relevance_label?: string | null
          relevance_score?: number | null
          search_volume?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chatgpt_api_relevance_scores: {
        Row: {
          asin: string
          created_at: string | null
          id: string
          keyword: string
          model_used: string | null
          original_tier: string | null
          pass_fail: string | null
          product_brand: string | null
          product_category: string | null
          product_title: string | null
          reasoning: string | null
          relevance_label: string
          relevance_score: number
          search_volume: number | null
          updated_at: string | null
        }
        Insert: {
          asin: string
          created_at?: string | null
          id?: string
          keyword: string
          model_used?: string | null
          original_tier?: string | null
          pass_fail?: string | null
          product_brand?: string | null
          product_category?: string | null
          product_title?: string | null
          reasoning?: string | null
          relevance_label: string
          relevance_score: number
          search_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          asin?: string
          created_at?: string | null
          id?: string
          keyword?: string
          model_used?: string | null
          original_tier?: string | null
          pass_fail?: string | null
          product_brand?: string | null
          product_category?: string | null
          product_title?: string | null
          reasoning?: string | null
          relevance_label?: string
          relevance_score?: number
          search_volume?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chatgpt_api_review_sentiment: {
        Row: {
          asin: string
          avg_rating: number | null
          competitor_comparisons: Json | null
          copywriting_angles: Json | null
          created_at: string | null
          example_quotes: Json | null
          id: string
          model_used: string | null
          negative_themes: Json | null
          overall_sentiment: string | null
          positive_themes: Json | null
          product_brand: string | null
          product_title: string | null
          review_count: number | null
          searchapi_query: string | null
          sentiment_summary: string | null
          standout_features: Json | null
          star_distribution: Json | null
          unmet_needs: Json | null
        }
        Insert: {
          asin: string
          avg_rating?: number | null
          competitor_comparisons?: Json | null
          copywriting_angles?: Json | null
          created_at?: string | null
          example_quotes?: Json | null
          id?: string
          model_used?: string | null
          negative_themes?: Json | null
          overall_sentiment?: string | null
          positive_themes?: Json | null
          product_brand?: string | null
          product_title?: string | null
          review_count?: number | null
          searchapi_query?: string | null
          sentiment_summary?: string | null
          standout_features?: Json | null
          star_distribution?: Json | null
          unmet_needs?: Json | null
        }
        Update: {
          asin?: string
          avg_rating?: number | null
          competitor_comparisons?: Json | null
          copywriting_angles?: Json | null
          created_at?: string | null
          example_quotes?: Json | null
          id?: string
          model_used?: string | null
          negative_themes?: Json | null
          overall_sentiment?: string | null
          positive_themes?: Json | null
          product_brand?: string | null
          product_title?: string | null
          review_count?: number | null
          searchapi_query?: string | null
          sentiment_summary?: string | null
          standout_features?: Json | null
          star_distribution?: Json | null
          unmet_needs?: Json | null
        }
        Relationships: []
      }
      client_brand_guidelines: {
        Row: {
          account_name: string
          brand_name: string
          created_at: string | null
          guidelines_json: Json
          id: number
          notes: string | null
          updated_at: string | null
          version: number
        }
        Insert: {
          account_name: string
          brand_name: string
          created_at?: string | null
          guidelines_json: Json
          id?: number
          notes?: string | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          account_name?: string
          brand_name?: string
          created_at?: string | null
          guidelines_json?: Json
          id?: number
          notes?: string | null
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      client_contacts: {
        Row: {
          client_name: string
          contact_email: string
          contact_name: string | null
          created_at: string | null
          id: string
          role: string | null
        }
        Insert: {
          client_name: string
          contact_email: string
          contact_name?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
        }
        Update: {
          client_name?: string
          contact_email?: string
          contact_name?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      client_email_label_map: {
        Row: {
          client_name: string
          enabled: boolean
          gmail_label: string
        }
        Insert: {
          client_name: string
          enabled?: boolean
          gmail_label: string
        }
        Update: {
          client_name?: string
          enabled?: boolean
          gmail_label?: string
        }
        Relationships: []
      }
      client_email_status: {
        Row: {
          awaiting_reply_count: number
          client_name: string
          gmail_label: string | null
          last_sender: string | null
          last_subject: string | null
          oldest_waiting_at: string | null
          samples: Json
          updated_at: string
        }
        Insert: {
          awaiting_reply_count?: number
          client_name: string
          gmail_label?: string | null
          last_sender?: string | null
          last_subject?: string | null
          oldest_waiting_at?: string | null
          samples?: Json
          updated_at?: string
        }
        Update: {
          awaiting_reply_count?: number
          client_name?: string
          gmail_label?: string | null
          last_sender?: string | null
          last_subject?: string | null
          oldest_waiting_at?: string | null
          samples?: Json
          updated_at?: string
        }
        Relationships: []
      }
      client_email_whitelist: {
        Row: {
          account_id: string
          approved_email: string
          created_at: string | null
          id: string
        }
        Insert: {
          account_id: string
          approved_email: string
          created_at?: string | null
          id?: string
        }
        Update: {
          account_id?: string
          approved_email?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_email_whitelist_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feature_visibility: {
        Row: {
          created_at: string | null
          disabled_message_type: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled_message_type?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled_message_type?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      client_knowledge: {
        Row: {
          client_name: string
          profile_markdown: string | null
          updated_at: string
        }
        Insert: {
          client_name: string
          profile_markdown?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string
          profile_markdown?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_links: {
        Row: {
          client_name: string
          created_at: string | null
          dashboard_url: string
          id: number
        }
        Insert: {
          client_name: string
          created_at?: string | null
          dashboard_url: string
          id?: number
        }
        Update: {
          client_name?: string
          created_at?: string | null
          dashboard_url?: string
          id?: number
        }
        Relationships: []
      }
      client_threshold_alerts: {
        Row: {
          account_name: string
          alert_type: string
          client_email: string
          created_at: string
          detection_date: string
          id: string
          merchant_token: string
          message: string
          metadata: Json | null
          metric_value: number
          notified_at: string | null
          status: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          account_name: string
          alert_type: string
          client_email: string
          created_at?: string
          detection_date?: string
          id?: string
          merchant_token: string
          message: string
          metadata?: Json | null
          metric_value: number
          notified_at?: string | null
          status?: string
          threshold_value: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          alert_type?: string
          client_email?: string
          created_at?: string
          detection_date?: string
          id?: string
          merchant_token?: string
          message?: string
          metadata?: Json | null
          metric_value?: number
          notified_at?: string | null
          status?: string
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      competitor_bid_recommendations: {
        Row: {
          ad_group_id: string | null
          ad_group_name: string | null
          applied_at: string | null
          campaign_id: string | null
          campaign_name: string | null
          confidence: number | null
          created_at: string
          current_bid: number | null
          expires_at: string | null
          id: string
          is_sunshine_managed: boolean | null
          keyword: string
          keyword_status: string | null
          push_status: string | null
          reason: string
          recommended_bid: number | null
          status: string
          sunshine_last_action_at: string | null
          sunshine_last_bid: number | null
          watchlist_id: string
        }
        Insert: {
          ad_group_id?: string | null
          ad_group_name?: string | null
          applied_at?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          confidence?: number | null
          created_at?: string
          current_bid?: number | null
          expires_at?: string | null
          id?: string
          is_sunshine_managed?: boolean | null
          keyword: string
          keyword_status?: string | null
          push_status?: string | null
          reason: string
          recommended_bid?: number | null
          status?: string
          sunshine_last_action_at?: string | null
          sunshine_last_bid?: number | null
          watchlist_id: string
        }
        Update: {
          ad_group_id?: string | null
          ad_group_name?: string | null
          applied_at?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          confidence?: number | null
          created_at?: string
          current_bid?: number | null
          expires_at?: string | null
          id?: string
          is_sunshine_managed?: boolean | null
          keyword?: string
          keyword_status?: string | null
          push_status?: string | null
          reason?: string
          recommended_bid?: number | null
          status?: string
          sunshine_last_action_at?: string | null
          sunshine_last_bid?: number | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_bid_recommendations_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_cpi_scores: {
        Row: {
          calculated_at: string
          cpi_tier: string | null
          estimated_cpi: number | null
          estimated_impressions: number | null
          id: string
          keyword: string
          our_organic_rank: number | null
          our_sponsored_rank: number | null
          search_volume: number | null
          watchlist_id: string
        }
        Insert: {
          calculated_at?: string
          cpi_tier?: string | null
          estimated_cpi?: number | null
          estimated_impressions?: number | null
          id?: string
          keyword: string
          our_organic_rank?: number | null
          our_sponsored_rank?: number | null
          search_volume?: number | null
          watchlist_id: string
        }
        Update: {
          calculated_at?: string
          cpi_tier?: string | null
          estimated_cpi?: number | null
          estimated_impressions?: number | null
          id?: string
          keyword?: string
          our_organic_rank?: number | null
          our_sponsored_rank?: number | null
          search_volume?: number | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_cpi_scores_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_events: {
        Row: {
          acknowledged: boolean
          asin: string
          detected_at: string
          event_type: string
          id: string
          keyword: string | null
          new_value: Json | null
          old_value: Json | null
          severity: string
          watchlist_id: string
        }
        Insert: {
          acknowledged?: boolean
          asin: string
          detected_at?: string
          event_type: string
          id?: string
          keyword?: string | null
          new_value?: Json | null
          old_value?: Json | null
          severity?: string
          watchlist_id: string
        }
        Update: {
          acknowledged?: boolean
          asin?: string
          detected_at?: string
          event_type?: string
          id?: string
          keyword?: string | null
          new_value?: Json | null
          old_value?: Json | null
          severity?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_events_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_keyword_gaps: {
        Row: {
          competitor_asin: string
          competitor_organic_rank: number | null
          detected_at: string
          gap_type: string
          id: string
          keyword: string
          our_organic_rank: number | null
          priority: string
          search_volume: number | null
          watchlist_id: string
        }
        Insert: {
          competitor_asin: string
          competitor_organic_rank?: number | null
          detected_at?: string
          gap_type: string
          id?: string
          keyword: string
          our_organic_rank?: number | null
          priority?: string
          search_volume?: number | null
          watchlist_id: string
        }
        Update: {
          competitor_asin?: string
          competitor_organic_rank?: number | null
          detected_at?: string
          gap_type?: string
          id?: string
          keyword?: string
          our_organic_rank?: number | null
          priority?: string
          search_volume?: number | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_keyword_gaps_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_keyword_tracking: {
        Row: {
          best_competitor_asin: string | null
          best_competitor_organic_rank: number | null
          created_at: string
          id: string
          keyword: string
          opportunity_score: number | null
          our_organic_rank: number | null
          our_sponsored_rank: number | null
          search_volume: number | null
          tracked_date: string
          watchlist_id: string
        }
        Insert: {
          best_competitor_asin?: string | null
          best_competitor_organic_rank?: number | null
          created_at?: string
          id?: string
          keyword: string
          opportunity_score?: number | null
          our_organic_rank?: number | null
          our_sponsored_rank?: number | null
          search_volume?: number | null
          tracked_date?: string
          watchlist_id: string
        }
        Update: {
          best_competitor_asin?: string | null
          best_competitor_organic_rank?: number | null
          created_at?: string
          id?: string
          keyword?: string
          opportunity_score?: number | null
          our_organic_rank?: number | null
          our_sponsored_rank?: number | null
          search_volume?: number | null
          tracked_date?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_keyword_tracking_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_scan_log: {
        Row: {
          api_tokens_used: number
          asins_scanned: string[]
          completed_at: string | null
          error_message: string | null
          id: string
          keywords_found: number
          scan_type: string
          started_at: string
          status: string
          watchlist_id: string
        }
        Insert: {
          api_tokens_used?: number
          asins_scanned?: string[]
          completed_at?: string | null
          error_message?: string | null
          id?: string
          keywords_found?: number
          scan_type?: string
          started_at?: string
          status?: string
          watchlist_id: string
        }
        Update: {
          api_tokens_used?: number
          asins_scanned?: string[]
          completed_at?: string | null
          error_message?: string | null
          id?: string
          keywords_found?: number
          scan_type?: string
          started_at?: string
          status?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_scan_log_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_snapshots: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_competitor: boolean
          keyword: string
          keyword_sales: number | null
          organic_rank: number | null
          relevancy_score: number | null
          search_volume: number | null
          snapshot_date: string
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_competitor?: boolean
          keyword: string
          keyword_sales?: number | null
          organic_rank?: number | null
          relevancy_score?: number | null
          search_volume?: number | null
          snapshot_date?: string
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_competitor?: boolean
          keyword?: string
          keyword_sales?: number | null
          organic_rank?: number | null
          relevancy_score?: number | null
          search_volume?: number | null
          snapshot_date?: string
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_snapshots_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_sniper_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          id: string
          is_active: boolean
          rule_name: string
          trigger_config: Json
          trigger_type: string
          watchlist_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          rule_name: string
          trigger_config?: Json
          trigger_type: string
          watchlist_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          rule_name?: string
          trigger_config?: Json
          trigger_type?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_sniper_rules_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_watchlists: {
        Row: {
          account_id: string
          auto_approve: boolean | null
          auto_approve_max_change_pct: number | null
          auto_approve_min_confidence: number | null
          competitor_asins: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          our_asin: string
          scan_tier: string
          updated_at: string
        }
        Insert: {
          account_id: string
          auto_approve?: boolean | null
          auto_approve_max_change_pct?: number | null
          auto_approve_min_confidence?: number | null
          competitor_asins?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          our_asin: string
          scan_tier?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          auto_approve?: boolean | null
          auto_approve_max_change_pct?: number | null
          auto_approve_min_confidence?: number | null
          competitor_asins?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          our_asin?: string
          scan_tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_watchlists_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      content_schedule: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          client_name: string
          content_type: string | null
          created_at: string | null
          id: string
          marketplace: string | null
          notes: string | null
          product_type: string
          scheduled_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          client_name: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          marketplace?: string | null
          notes?: string | null
          product_type?: string
          scheduled_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          client_name?: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          marketplace?: string | null
          notes?: string | null
          product_type?: string
          scheduled_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      content_tracker: {
        Row: {
          asin: string | null
          client_id: string | null
          client_name: string
          completed_by: string | null
          content_type: string
          created_at: string | null
          date_completed: string | null
          id: string
          marketplace: string
          notes: string | null
          product_type: string
          status: string
        }
        Insert: {
          asin?: string | null
          client_id?: string | null
          client_name: string
          completed_by?: string | null
          content_type?: string
          created_at?: string | null
          date_completed?: string | null
          id?: string
          marketplace?: string
          notes?: string | null
          product_type?: string
          status?: string
        }
        Update: {
          asin?: string | null
          client_id?: string | null
          client_name?: string
          completed_by?: string | null
          content_type?: string
          created_at?: string | null
          date_completed?: string | null
          id?: string
          marketplace?: string
          notes?: string | null
          product_type?: string
          status?: string
        }
        Relationships: []
      }
      country_weather_daily: {
        Row: {
          country_code: string
          precip_mm: number | null
          record_date: string
          sunshine_hours: number | null
          temp_max: number | null
          temp_mean: number | null
          temp_min: number | null
          updated_at: string
          weather_code: number | null
        }
        Insert: {
          country_code: string
          precip_mm?: number | null
          record_date: string
          sunshine_hours?: number | null
          temp_max?: number | null
          temp_mean?: number | null
          temp_min?: number | null
          updated_at?: string
          weather_code?: number | null
        }
        Update: {
          country_code?: string
          precip_mm?: number | null
          record_date?: string
          sunshine_hours?: number | null
          temp_max?: number | null
          temp_mean?: number | null
          temp_min?: number | null
          updated_at?: string
          weather_code?: number | null
        }
        Relationships: []
      }
      daily_asin_data: {
        Row: {
          account_name: string | null
          buy_box_percentage: number | null
          child_asin: string | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          merchant_token: string
          page_views: number | null
          parent_asin: string | null
          product_title: string | null
          record_date: string
          sales: number | null
          units_sold: number | null
        }
        Insert: {
          account_name?: string | null
          buy_box_percentage?: number | null
          child_asin?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token: string
          page_views?: number | null
          parent_asin?: string | null
          product_title?: string | null
          record_date: string
          sales?: number | null
          units_sold?: number | null
        }
        Update: {
          account_name?: string | null
          buy_box_percentage?: number | null
          child_asin?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token?: string
          page_views?: number | null
          parent_asin?: string | null
          product_title?: string | null
          record_date?: string
          sales?: number | null
          units_sold?: number | null
        }
        Relationships: []
      }
      daily_asin_data_backup: {
        Row: {
          account_name: string | null
          backed_up_at: string
          backup_date: string
          buy_box_percentage: number | null
          child_asin: string | null
          conversion_rate: number | null
          id: string
          merchant_token: string
          original_created_at: string | null
          original_id: string
          page_views: number | null
          parent_asin: string | null
          product_title: string | null
          record_date: string
          sales: number | null
          units_sold: number | null
        }
        Insert: {
          account_name?: string | null
          backed_up_at?: string
          backup_date?: string
          buy_box_percentage?: number | null
          child_asin?: string | null
          conversion_rate?: number | null
          id?: string
          merchant_token: string
          original_created_at?: string | null
          original_id: string
          page_views?: number | null
          parent_asin?: string | null
          product_title?: string | null
          record_date: string
          sales?: number | null
          units_sold?: number | null
        }
        Update: {
          account_name?: string | null
          backed_up_at?: string
          backup_date?: string
          buy_box_percentage?: number | null
          child_asin?: string | null
          conversion_rate?: number | null
          id?: string
          merchant_token?: string
          original_created_at?: string | null
          original_id?: string
          page_views?: number | null
          parent_asin?: string | null
          product_title?: string | null
          record_date?: string
          sales?: number | null
          units_sold?: number | null
        }
        Relationships: []
      }
      daily_asin_empty_days: {
        Row: {
          attempts: number
          confirmed_at: string
          merchant_token: string
          record_date: string
        }
        Insert: {
          attempts?: number
          confirmed_at?: string
          merchant_token: string
          record_date: string
        }
        Update: {
          attempts?: number
          confirmed_at?: string
          merchant_token?: string
          record_date?: string
        }
        Relationships: []
      }
      daily_campaign_data: {
        Row: {
          account_name: string | null
          acos: number | null
          alert_message: string | null
          alert_type: string | null
          campaign_name: string
          created_at: string | null
          id: string
          last_synced_at: string | null
          merchant_token: string
          record_date: string
          sales: number | null
          spend: number | null
        }
        Insert: {
          account_name?: string | null
          acos?: number | null
          alert_message?: string | null
          alert_type?: string | null
          campaign_name: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token: string
          record_date: string
          sales?: number | null
          spend?: number | null
        }
        Update: {
          account_name?: string | null
          acos?: number | null
          alert_message?: string | null
          alert_type?: string | null
          campaign_name?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token?: string
          record_date?: string
          sales?: number | null
          spend?: number | null
        }
        Relationships: []
      }
      daily_campaign_data_backup: {
        Row: {
          account_name: string | null
          acos: number | null
          alert_message: string | null
          alert_type: string | null
          backed_up_at: string
          backup_date: string
          campaign_name: string
          id: string
          merchant_token: string
          original_created_at: string | null
          original_id: string
          record_date: string
          sales: number | null
          spend: number | null
        }
        Insert: {
          account_name?: string | null
          acos?: number | null
          alert_message?: string | null
          alert_type?: string | null
          backed_up_at?: string
          backup_date?: string
          campaign_name: string
          id?: string
          merchant_token: string
          original_created_at?: string | null
          original_id: string
          record_date: string
          sales?: number | null
          spend?: number | null
        }
        Update: {
          account_name?: string | null
          acos?: number | null
          alert_message?: string | null
          alert_type?: string | null
          backed_up_at?: string
          backup_date?: string
          campaign_name?: string
          id?: string
          merchant_token?: string
          original_created_at?: string | null
          original_id?: string
          record_date?: string
          sales?: number | null
          spend?: number | null
        }
        Relationships: []
      }
      daily_inventory_data: {
        Row: {
          account_name: string | null
          asin: string
          created_at: string | null
          fulfillment_type: string | null
          id: string
          last_synced_at: string | null
          merchant_token: string
          price: number | null
          product_name: string | null
          quantity: number | null
          record_date: string
          sku: string
        }
        Insert: {
          account_name?: string | null
          asin: string
          created_at?: string | null
          fulfillment_type?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token: string
          price?: number | null
          product_name?: string | null
          quantity?: number | null
          record_date: string
          sku: string
        }
        Update: {
          account_name?: string | null
          asin?: string
          created_at?: string | null
          fulfillment_type?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token?: string
          price?: number | null
          product_name?: string | null
          quantity?: number | null
          record_date?: string
          sku?: string
        }
        Relationships: []
      }
      daily_inventory_data_backup: {
        Row: {
          account_name: string | null
          asin: string
          backed_up_at: string | null
          backup_date: string
          fulfillment_type: string | null
          id: string
          merchant_token: string
          original_created_at: string | null
          original_id: string
          price: number | null
          product_name: string | null
          quantity: number | null
          record_date: string
          sku: string
        }
        Insert: {
          account_name?: string | null
          asin: string
          backed_up_at?: string | null
          backup_date?: string
          fulfillment_type?: string | null
          id?: string
          merchant_token: string
          original_created_at?: string | null
          original_id: string
          price?: number | null
          product_name?: string | null
          quantity?: number | null
          record_date: string
          sku: string
        }
        Update: {
          account_name?: string | null
          asin?: string
          backed_up_at?: string | null
          backup_date?: string
          fulfillment_type?: string | null
          id?: string
          merchant_token?: string
          original_created_at?: string | null
          original_id?: string
          price?: number | null
          product_name?: string | null
          quantity?: number | null
          record_date?: string
          sku?: string
        }
        Relationships: []
      }
      daily_pipeline_health: {
        Row: {
          check_name: string
          checked_at: string
          details: Json | null
          status: string
        }
        Insert: {
          check_name: string
          checked_at?: string
          details?: Json | null
          status: string
        }
        Update: {
          check_name?: string
          checked_at?: string
          details?: Json | null
          status?: string
        }
        Relationships: []
      }
      daily_ppc_data: {
        Row: {
          account_name: string | null
          acos: number | null
          advertising_reliance: number | null
          clicks: number | null
          created_at: string | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          merchant_token: string
          ppc_account_name: string
          ppc_sales: number | null
          ppc_spend: number | null
          record_date: string
          tacos: number | null
        }
        Insert: {
          account_name?: string | null
          acos?: number | null
          advertising_reliance?: number | null
          clicks?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          merchant_token: string
          ppc_account_name: string
          ppc_sales?: number | null
          ppc_spend?: number | null
          record_date: string
          tacos?: number | null
        }
        Update: {
          account_name?: string | null
          acos?: number | null
          advertising_reliance?: number | null
          clicks?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          merchant_token?: string
          ppc_account_name?: string
          ppc_sales?: number | null
          ppc_spend?: number | null
          record_date?: string
          tacos?: number | null
        }
        Relationships: []
      }
      daily_sales_ppc_data: {
        Row: {
          account_name: string | null
          buy_box_percentage: number | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          merchant_token: string
          page_views: number | null
          record_date: string
          sales: number | null
          units_ordered: number | null
        }
        Insert: {
          account_name?: string | null
          buy_box_percentage?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token: string
          page_views?: number | null
          record_date: string
          sales?: number | null
          units_ordered?: number | null
        }
        Update: {
          account_name?: string | null
          buy_box_percentage?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token?: string
          page_views?: number | null
          record_date?: string
          sales?: number | null
          units_ordered?: number | null
        }
        Relationships: []
      }
      daily_sales_ppc_data_backup: {
        Row: {
          account_name: string | null
          acos: number | null
          advertising_reliance: number | null
          backed_up_at: string
          backup_date: string
          buy_box_percentage: number | null
          conversion_rate: number | null
          id: string
          merchant_token: string
          original_created_at: string | null
          original_id: string
          page_views: number | null
          ppc_sales: number | null
          ppc_spend: number | null
          record_date: string
          sales: number | null
          tacos: number | null
          units_ordered: number | null
        }
        Insert: {
          account_name?: string | null
          acos?: number | null
          advertising_reliance?: number | null
          backed_up_at?: string
          backup_date?: string
          buy_box_percentage?: number | null
          conversion_rate?: number | null
          id?: string
          merchant_token: string
          original_created_at?: string | null
          original_id: string
          page_views?: number | null
          ppc_sales?: number | null
          ppc_spend?: number | null
          record_date: string
          sales?: number | null
          tacos?: number | null
          units_ordered?: number | null
        }
        Update: {
          account_name?: string | null
          acos?: number | null
          advertising_reliance?: number | null
          backed_up_at?: string
          backup_date?: string
          buy_box_percentage?: number | null
          conversion_rate?: number | null
          id?: string
          merchant_token?: string
          original_created_at?: string | null
          original_id?: string
          page_views?: number | null
          ppc_sales?: number | null
          ppc_spend?: number | null
          record_date?: string
          sales?: number | null
          tacos?: number | null
          units_ordered?: number | null
        }
        Relationships: []
      }
      daily_sync_status: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          last_run_at: string
          ppc_records: number | null
          records_processed: number | null
          sales_records: number | null
          status: string
          sync_date: string
          sync_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          last_run_at?: string
          ppc_records?: number | null
          records_processed?: number | null
          sales_records?: number | null
          status?: string
          sync_date: string
          sync_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          last_run_at?: string
          ppc_records?: number | null
          records_processed?: number | null
          sales_records?: number | null
          status?: string
          sync_date?: string
          sync_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_vendor_data: {
        Row: {
          account_name: string | null
          asin: string | null
          buy_box_percentage: number | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          merchant_token: string
          page_views: number | null
          record_date: string
          sales: number | null
          shipped_cogs_amount: number | null
          shipped_cogs_currency: string | null
          shipped_revenue: number | null
          shipped_revenue_amount: number | null
          shipped_revenue_currency: string | null
          shipped_units: number | null
          units_ordered: number | null
        }
        Insert: {
          account_name?: string | null
          asin?: string | null
          buy_box_percentage?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token: string
          page_views?: number | null
          record_date: string
          sales?: number | null
          shipped_cogs_amount?: number | null
          shipped_cogs_currency?: string | null
          shipped_revenue?: number | null
          shipped_revenue_amount?: number | null
          shipped_revenue_currency?: string | null
          shipped_units?: number | null
          units_ordered?: number | null
        }
        Update: {
          account_name?: string | null
          asin?: string | null
          buy_box_percentage?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          merchant_token?: string
          page_views?: number | null
          record_date?: string
          sales?: number | null
          shipped_cogs_amount?: number | null
          shipped_cogs_currency?: string | null
          shipped_revenue?: number | null
          shipped_revenue_amount?: number | null
          shipped_revenue_currency?: string | null
          shipped_units?: number | null
          units_ordered?: number | null
        }
        Relationships: []
      }
      dashboard_addons: {
        Row: {
          addon_key: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          selling_partner_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          addon_key: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          selling_partner_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          addon_key?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          selling_partner_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_events: {
        Row: {
          color: string
          country_code: string | null
          created_at: string
          end_date: string
          event_type: string
          id: string
          name: string
          notes: string | null
          start_date: string
        }
        Insert: {
          color?: string
          country_code?: string | null
          created_at?: string
          end_date: string
          event_type?: string
          id?: string
          name: string
          notes?: string | null
          start_date: string
        }
        Update: {
          color?: string
          country_code?: string | null
          created_at?: string
          end_date?: string
          event_type?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
        }
        Relationships: []
      }
      data_gap_alerts: {
        Row: {
          account_name: string
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          hours_since_update: number | null
          id: string
          last_data_date: string | null
          merchant_token: string | null
          message: string
          metadata: Json | null
          notified_at: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          hours_since_update?: number | null
          id?: string
          last_data_date?: string | null
          merchant_token?: string | null
          message: string
          metadata?: Json | null
          notified_at?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          hours_since_update?: number | null
          id?: string
          last_data_date?: string | null
          merchant_token?: string | null
          message?: string
          metadata?: Json | null
          notified_at?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      edge_function_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time: string | null
          function_name: string
          id: number
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time?: string | null
          function_name: string
          id?: number
          status: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time?: string | null
          function_name?: string
          id?: number
          status?: string
        }
        Relationships: []
      }
      email_monitor_log: {
        Row: {
          action_taken: string | null
          client_name: string | null
          draft_id: string | null
          id: string
          intent: string | null
          message_id: string
          processed_at: string | null
          summary: string | null
          thread_id: string
        }
        Insert: {
          action_taken?: string | null
          client_name?: string | null
          draft_id?: string | null
          id?: string
          intent?: string | null
          message_id: string
          processed_at?: string | null
          summary?: string | null
          thread_id: string
        }
        Update: {
          action_taken?: string | null
          client_name?: string | null
          draft_id?: string | null
          id?: string
          intent?: string | null
          message_id?: string
          processed_at?: string | null
          summary?: string | null
          thread_id?: string
        }
        Relationships: []
      }
      fathom_action_items: {
        Row: {
          account_name: string | null
          ai_allocated_at: string | null
          ai_allocation_reason: string | null
          ai_focus_bucket: string | null
          ai_focus_rank: number | null
          ai_focus_reason: string | null
          ai_focused_at: string | null
          assignee_email: string | null
          assignee_name: string | null
          assignee_team: string | null
          category: string | null
          completed: boolean | null
          description: string | null
          due_date: string | null
          email_link: string | null
          focus_surfaced_count: number
          google_completed_pushed: boolean
          google_task_id: string | null
          google_tasklist_id: string | null
          id: number
          listing_job_id: string | null
          meeting_id: string | null
          meeting_title: string | null
          priority: string | null
          received_at: string | null
          recording_playback_url: string | null
          recording_timestamp: string | null
          reviewed_at: string | null
          source: string | null
          synced_at: string | null
          task_notes: string | null
          user_generated: boolean | null
        }
        Insert: {
          account_name?: string | null
          ai_allocated_at?: string | null
          ai_allocation_reason?: string | null
          ai_focus_bucket?: string | null
          ai_focus_rank?: number | null
          ai_focus_reason?: string | null
          ai_focused_at?: string | null
          assignee_email?: string | null
          assignee_name?: string | null
          assignee_team?: string | null
          category?: string | null
          completed?: boolean | null
          description?: string | null
          due_date?: string | null
          email_link?: string | null
          focus_surfaced_count?: number
          google_completed_pushed?: boolean
          google_task_id?: string | null
          google_tasklist_id?: string | null
          id?: number
          listing_job_id?: string | null
          meeting_id?: string | null
          meeting_title?: string | null
          priority?: string | null
          received_at?: string | null
          recording_playback_url?: string | null
          recording_timestamp?: string | null
          reviewed_at?: string | null
          source?: string | null
          synced_at?: string | null
          task_notes?: string | null
          user_generated?: boolean | null
        }
        Update: {
          account_name?: string | null
          ai_allocated_at?: string | null
          ai_allocation_reason?: string | null
          ai_focus_bucket?: string | null
          ai_focus_rank?: number | null
          ai_focus_reason?: string | null
          ai_focused_at?: string | null
          assignee_email?: string | null
          assignee_name?: string | null
          assignee_team?: string | null
          category?: string | null
          completed?: boolean | null
          description?: string | null
          due_date?: string | null
          email_link?: string | null
          focus_surfaced_count?: number
          google_completed_pushed?: boolean
          google_task_id?: string | null
          google_tasklist_id?: string | null
          id?: number
          listing_job_id?: string | null
          meeting_id?: string | null
          meeting_title?: string | null
          priority?: string | null
          received_at?: string | null
          recording_playback_url?: string | null
          recording_timestamp?: string | null
          reviewed_at?: string | null
          source?: string | null
          synced_at?: string | null
          task_notes?: string | null
          user_generated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fathom_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "fathom_meetings"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      fathom_client_mapping: {
        Row: {
          account_name: string
          id: number
          match_pattern: string
        }
        Insert: {
          account_name: string
          id?: number
          match_pattern: string
        }
        Update: {
          account_name?: string
          id?: number
          match_pattern?: string
        }
        Relationships: []
      }
      fathom_domain_client_map: {
        Row: {
          account_name: string
          created_at: string
          email_domain: string
        }
        Insert: {
          account_name: string
          created_at?: string
          email_domain: string
        }
        Update: {
          account_name?: string
          created_at?: string
          email_domain?: string
        }
        Relationships: []
      }
      fathom_meeting_client_map: {
        Row: {
          account_name: string
          created_at: string | null
          id: number
          meeting_title: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          created_at?: string | null
          id?: never
          meeting_title: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          created_at?: string | null
          id?: never
          meeting_title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fathom_meetings: {
        Row: {
          account_name: string | null
          calendar_invitees: Json | null
          calendar_invitees_domains_type: string | null
          client_email_domain: string | null
          created_at: string | null
          crm_matches: Json | null
          fathom_url: string | null
          id: number
          meeting_id: string
          meeting_title: string | null
          recorded_by: Json | null
          recording_end_time: string | null
          recording_id: number | null
          recording_start_time: string | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          share_url: string | null
          summary_markdown: string | null
          summary_template: string | null
          synced_at: string | null
          title: string | null
          transcript: Json | null
          transcript_language: string | null
        }
        Insert: {
          account_name?: string | null
          calendar_invitees?: Json | null
          calendar_invitees_domains_type?: string | null
          client_email_domain?: string | null
          created_at?: string | null
          crm_matches?: Json | null
          fathom_url?: string | null
          id?: number
          meeting_id: string
          meeting_title?: string | null
          recorded_by?: Json | null
          recording_end_time?: string | null
          recording_id?: number | null
          recording_start_time?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          share_url?: string | null
          summary_markdown?: string | null
          summary_template?: string | null
          synced_at?: string | null
          title?: string | null
          transcript?: Json | null
          transcript_language?: string | null
        }
        Update: {
          account_name?: string | null
          calendar_invitees?: Json | null
          calendar_invitees_domains_type?: string | null
          client_email_domain?: string | null
          created_at?: string | null
          crm_matches?: Json | null
          fathom_url?: string | null
          id?: number
          meeting_id?: string
          meeting_title?: string | null
          recorded_by?: Json | null
          recording_end_time?: string | null
          recording_id?: number | null
          recording_start_time?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          share_url?: string | null
          summary_markdown?: string | null
          summary_template?: string | null
          synced_at?: string | null
          title?: string | null
          transcript?: Json | null
          transcript_language?: string | null
        }
        Relationships: []
      }
      fathom_person_client_map: {
        Row: {
          account_name: string
          created_at: string
          email_address: string
          updated_at: string
        }
        Insert: {
          account_name: string
          created_at?: string
          email_address: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          created_at?: string
          email_address?: string
          updated_at?: string
        }
        Relationships: []
      }
      fathom_sync_status: {
        Row: {
          action_items_upserted: number | null
          error_message: string | null
          id: number
          last_run_at: string | null
          last_success: boolean | null
          meetings_fetched: number | null
          updated_at: string | null
        }
        Insert: {
          action_items_upserted?: number | null
          error_message?: string | null
          id?: number
          last_run_at?: string | null
          last_success?: boolean | null
          meetings_fetched?: number | null
          updated_at?: string | null
        }
        Update: {
          action_items_upserted?: number | null
          error_message?: string | null
          id?: number
          last_run_at?: string | null
          last_success?: boolean | null
          meetings_fetched?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fba_fee_preview: {
        Row: {
          account_name: string | null
          asin: string | null
          data: Json | null
          id: number
          marketplace_id: string | null
          pulled_at: string | null
          selling_partner_id: string | null
          sku: string | null
          snapshot_date: string | null
        }
        Insert: {
          account_name?: string | null
          asin?: string | null
          data?: Json | null
          id?: number
          marketplace_id?: string | null
          pulled_at?: string | null
          selling_partner_id?: string | null
          sku?: string | null
          snapshot_date?: string | null
        }
        Update: {
          account_name?: string | null
          asin?: string | null
          data?: Json | null
          id?: number
          marketplace_id?: string | null
          pulled_at?: string | null
          selling_partner_id?: string | null
          sku?: string | null
          snapshot_date?: string | null
        }
        Relationships: []
      }
      fba_inventory_data: {
        Row: {
          account_name: string
          asin: string | null
          condition_type: string | null
          created_at: string | null
          fulfillable_quantity: number | null
          id: string
          inbound_receiving_quantity: number | null
          inbound_shipped_quantity: number | null
          inbound_working_quantity: number | null
          pool_key: string | null
          price: number | null
          product_name: string | null
          record_date: string
          reserved_quantity: number | null
          sku: string | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          asin?: string | null
          condition_type?: string | null
          created_at?: string | null
          fulfillable_quantity?: number | null
          id?: string
          inbound_receiving_quantity?: number | null
          inbound_shipped_quantity?: number | null
          inbound_working_quantity?: number | null
          pool_key?: string | null
          price?: number | null
          product_name?: string | null
          record_date: string
          reserved_quantity?: number | null
          sku?: string | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          asin?: string | null
          condition_type?: string | null
          created_at?: string | null
          fulfillable_quantity?: number | null
          id?: string
          inbound_receiving_quantity?: number | null
          inbound_shipped_quantity?: number | null
          inbound_working_quantity?: number | null
          pool_key?: string | null
          price?: number | null
          product_name?: string | null
          record_date?: string
          reserved_quantity?: number | null
          sku?: string | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fba_inventory_planning: {
        Row: {
          account_name: string | null
          asin: string | null
          data: Json | null
          id: number
          marketplace_id: string | null
          pulled_at: string | null
          selling_partner_id: string | null
          sku: string | null
          snapshot_date: string | null
        }
        Insert: {
          account_name?: string | null
          asin?: string | null
          data?: Json | null
          id?: number
          marketplace_id?: string | null
          pulled_at?: string | null
          selling_partner_id?: string | null
          sku?: string | null
          snapshot_date?: string | null
        }
        Update: {
          account_name?: string | null
          asin?: string | null
          data?: Json | null
          id?: number
          marketplace_id?: string | null
          pulled_at?: string | null
          selling_partner_id?: string | null
          sku?: string | null
          snapshot_date?: string | null
        }
        Relationships: []
      }
      fba_recommended_removals: {
        Row: {
          account_name: string | null
          asin: string | null
          data: Json | null
          id: number
          marketplace_id: string | null
          pulled_at: string | null
          selling_partner_id: string | null
          sku: string | null
          snapshot_date: string | null
        }
        Insert: {
          account_name?: string | null
          asin?: string | null
          data?: Json | null
          id?: number
          marketplace_id?: string | null
          pulled_at?: string | null
          selling_partner_id?: string | null
          sku?: string | null
          snapshot_date?: string | null
        }
        Update: {
          account_name?: string | null
          asin?: string | null
          data?: Json | null
          id?: number
          marketplace_id?: string | null
          pulled_at?: string | null
          selling_partner_id?: string | null
          sku?: string | null
          snapshot_date?: string | null
        }
        Relationships: []
      }
      fba_sync_state: {
        Row: {
          account_name: string
          record_date: string
          rows: number | null
          selling_partner_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          record_date: string
          rows?: number | null
          selling_partner_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          record_date?: string
          rows?: number | null
          selling_partner_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fin_seller_economics: {
        Row: {
          account_name: string
          ads_spend: number | null
          asin: string
          average_selling_price: number | null
          cogs: number | null
          currency: string | null
          fba_fulfilment_fees: number | null
          id: number
          marketplace_id: string
          net_proceeds_per_unit: number | null
          net_proceeds_total: number | null
          net_product_sales: number | null
          net_units: number | null
          ordered_units: number | null
          other_costs: number | null
          other_fees: number | null
          period_end: string
          period_start: string
          pulled_at: string
          raw: Json | null
          referral_fees: number | null
          selling_partner_id: string
          sku: string
          storage_fees: number | null
          units_refunded: number | null
        }
        Insert: {
          account_name: string
          ads_spend?: number | null
          asin?: string
          average_selling_price?: number | null
          cogs?: number | null
          currency?: string | null
          fba_fulfilment_fees?: number | null
          id?: number
          marketplace_id: string
          net_proceeds_per_unit?: number | null
          net_proceeds_total?: number | null
          net_product_sales?: number | null
          net_units?: number | null
          ordered_units?: number | null
          other_costs?: number | null
          other_fees?: number | null
          period_end: string
          period_start: string
          pulled_at?: string
          raw?: Json | null
          referral_fees?: number | null
          selling_partner_id: string
          sku?: string
          storage_fees?: number | null
          units_refunded?: number | null
        }
        Update: {
          account_name?: string
          ads_spend?: number | null
          asin?: string
          average_selling_price?: number | null
          cogs?: number | null
          currency?: string | null
          fba_fulfilment_fees?: number | null
          id?: number
          marketplace_id?: string
          net_proceeds_per_unit?: number | null
          net_proceeds_total?: number | null
          net_product_sales?: number | null
          net_units?: number | null
          ordered_units?: number | null
          other_costs?: number | null
          other_fees?: number | null
          period_end?: string
          period_start?: string
          pulled_at?: string
          raw?: Json | null
          referral_fees?: number | null
          selling_partner_id?: string
          sku?: string
          storage_fees?: number | null
          units_refunded?: number | null
        }
        Relationships: []
      }
      fin_settlement_lines: {
        Row: {
          account_name: string
          amount: number | null
          id: number
          idx: number
          order_id: string | null
          posted_date: string | null
          quantity: number | null
          raw: Json | null
          selling_partner_id: string
          settlement_id: string
          sku: string | null
          type: string | null
        }
        Insert: {
          account_name: string
          amount?: number | null
          id?: number
          idx: number
          order_id?: string | null
          posted_date?: string | null
          quantity?: number | null
          raw?: Json | null
          selling_partner_id: string
          settlement_id: string
          sku?: string | null
          type?: string | null
        }
        Update: {
          account_name?: string
          amount?: number | null
          id?: number
          idx?: number
          order_id?: string | null
          posted_date?: string | null
          quantity?: number | null
          raw?: Json | null
          selling_partner_id?: string
          settlement_id?: string
          sku?: string | null
          type?: string | null
        }
        Relationships: []
      }
      fin_settlements: {
        Row: {
          account_name: string
          currency: string | null
          deposit_date: string | null
          id: number
          marketplace_id: string | null
          period_end: string | null
          period_start: string | null
          pulled_at: string
          raw: Json | null
          selling_partner_id: string
          settlement_id: string
          total_amount: number | null
        }
        Insert: {
          account_name: string
          currency?: string | null
          deposit_date?: string | null
          id?: number
          marketplace_id?: string | null
          period_end?: string | null
          period_start?: string | null
          pulled_at?: string
          raw?: Json | null
          selling_partner_id: string
          settlement_id: string
          total_amount?: number | null
        }
        Update: {
          account_name?: string
          currency?: string | null
          deposit_date?: string | null
          id?: number
          marketplace_id?: string | null
          period_end?: string | null
          period_start?: string | null
          pulled_at?: string
          raw?: Json | null
          selling_partner_id?: string
          settlement_id?: string
          total_amount?: number | null
        }
        Relationships: []
      }
      fin_transaction_breakdowns: {
        Row: {
          account_name: string
          amount: number | null
          breakdown_type: string | null
          currency: string | null
          id: number
          idx: number
          parent_breakdown: string | null
          raw: Json | null
          selling_partner_id: string
          transaction_id: string
        }
        Insert: {
          account_name: string
          amount?: number | null
          breakdown_type?: string | null
          currency?: string | null
          id?: number
          idx: number
          parent_breakdown?: string | null
          raw?: Json | null
          selling_partner_id: string
          transaction_id: string
        }
        Update: {
          account_name?: string
          amount?: number | null
          breakdown_type?: string | null
          currency?: string | null
          id?: number
          idx?: number
          parent_breakdown?: string | null
          raw?: Json | null
          selling_partner_id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      fin_transactions: {
        Row: {
          account_name: string
          currency: string | null
          id: number
          marketplace_id: string | null
          order_id: string | null
          posted_date: string | null
          pulled_at: string
          raw: Json | null
          selling_partner_id: string
          status: string | null
          total_amount: number | null
          transaction_id: string
          transaction_type: string | null
        }
        Insert: {
          account_name: string
          currency?: string | null
          id?: number
          marketplace_id?: string | null
          order_id?: string | null
          posted_date?: string | null
          pulled_at?: string
          raw?: Json | null
          selling_partner_id: string
          status?: string | null
          total_amount?: number | null
          transaction_id: string
          transaction_type?: string | null
        }
        Update: {
          account_name?: string
          currency?: string | null
          id?: number
          marketplace_id?: string | null
          order_id?: string | null
          posted_date?: string | null
          pulled_at?: string
          raw?: Json | null
          selling_partner_id?: string
          status?: string | null
          total_amount?: number | null
          transaction_id?: string
          transaction_type?: string | null
        }
        Relationships: []
      }
      fin_transactions_cursor: {
        Row: {
          account_name: string
          backfill_done: boolean
          backfill_floor: string | null
          last_incremental_at: string | null
          next_posted_before: string | null
          selling_partner_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          backfill_done?: boolean
          backfill_floor?: string | null
          last_incremental_at?: string | null
          next_posted_before?: string | null
          selling_partner_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          backfill_done?: boolean
          backfill_floor?: string | null
          last_incremental_at?: string | null
          next_posted_before?: string | null
          selling_partner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      focus_feedback: {
        Row: {
          created_at: string
          description: string | null
          id: number
          signal: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          signal: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          signal?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          base: string
          quote: string
          rate: number
          rate_date: string
          source: string | null
          updated_at: string
        }
        Insert: {
          base?: string
          quote: string
          rate: number
          rate_date: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          base?: string
          quote?: string
          rate?: number
          rate_date?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gemma_allocation_config: {
        Row: {
          extra_notes: string | null
          id: number
          remit: string | null
          updated_at: string | null
        }
        Insert: {
          extra_notes?: string | null
          id?: number
          remit?: string | null
          updated_at?: string | null
        }
        Update: {
          extra_notes?: string | null
          id?: number
          remit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gemma_allocation_feedback: {
        Row: {
          action_id: number | null
          created_at: string
          description: string | null
          id: number
          reason: string | null
          signal: string
        }
        Insert: {
          action_id?: number | null
          created_at?: string
          description?: string | null
          id?: never
          reason?: string | null
          signal: string
        }
        Update: {
          action_id?: number | null
          created_at?: string
          description?: string | null
          id?: never
          reason?: string | null
          signal?: string
        }
        Relationships: []
      }
      historical_monthly_data: {
        Row: {
          account_name: string
          acos: number | null
          ad_cost_pct_vs_overall: number | null
          ad_sales_pct_vs_overall: number | null
          advertising_sales_gbp: number | null
          advertising_spend_gbp: number | null
          click_through_rate: number | null
          clicks: number | null
          cost_per_click_gbp: number | null
          created_at: string
          id: string
          impressions: number | null
          merchant_token: string
          month_year: string
          overall_sales_gbp: number | null
          updated_at: string
        }
        Insert: {
          account_name: string
          acos?: number | null
          ad_cost_pct_vs_overall?: number | null
          ad_sales_pct_vs_overall?: number | null
          advertising_sales_gbp?: number | null
          advertising_spend_gbp?: number | null
          click_through_rate?: number | null
          clicks?: number | null
          cost_per_click_gbp?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          merchant_token: string
          month_year: string
          overall_sales_gbp?: number | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          acos?: number | null
          ad_cost_pct_vs_overall?: number | null
          ad_sales_pct_vs_overall?: number | null
          advertising_sales_gbp?: number | null
          advertising_spend_gbp?: number | null
          click_through_rate?: number | null
          clicks?: number | null
          cost_per_click_gbp?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          merchant_token?: string
          month_year?: string
          overall_sales_gbp?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      hugo_account_campaign_types: {
        Row: {
          account_name: string
          campaign_count: number
          detected_at: string
          example_campaign: string | null
          type_key: string
        }
        Insert: {
          account_name: string
          campaign_count?: number
          detected_at?: string
          example_campaign?: string | null
          type_key: string
        }
        Update: {
          account_name?: string
          campaign_count?: number
          detected_at?: string
          example_campaign?: string | null
          type_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "hugo_account_campaign_types_type_key_fkey"
            columns: ["type_key"]
            isOneToOne: false
            referencedRelation: "hugo_campaign_type_defs"
            referencedColumns: ["key"]
          },
        ]
      }
      hugo_asin_title_cache: {
        Row: {
          asin: string
          fetched_at: string | null
          source: string | null
          title: string | null
        }
        Insert: {
          asin: string
          fetched_at?: string | null
          source?: string | null
          title?: string | null
        }
        Update: {
          asin?: string
          fetched_at?: string | null
          source?: string | null
          title?: string | null
        }
        Relationships: []
      }
      hugo_auto_neg_runs: {
        Row: {
          account_id: string
          candidates_found: number | null
          error_detail: string | null
          errors: number | null
          high_acos_count: number | null
          id: string
          impact_acos_at_risk: number | null
          impact_sales_at_risk: number | null
          impact_spend_saved: number | null
          keyword_count: number | null
          mode: string | null
          no_sale_count: number | null
          product_count: number | null
          pushed: number | null
          run_at: string
          status: string | null
        }
        Insert: {
          account_id: string
          candidates_found?: number | null
          error_detail?: string | null
          errors?: number | null
          high_acos_count?: number | null
          id?: string
          impact_acos_at_risk?: number | null
          impact_sales_at_risk?: number | null
          impact_spend_saved?: number | null
          keyword_count?: number | null
          mode?: string | null
          no_sale_count?: number | null
          product_count?: number | null
          pushed?: number | null
          run_at?: string
          status?: string | null
        }
        Update: {
          account_id?: string
          candidates_found?: number | null
          error_detail?: string | null
          errors?: number | null
          high_acos_count?: number | null
          id?: string
          impact_acos_at_risk?: number | null
          impact_sales_at_risk?: number | null
          impact_spend_saved?: number | null
          keyword_count?: number | null
          mode?: string | null
          no_sale_count?: number | null
          product_count?: number | null
          pushed?: number | null
          run_at?: string
          status?: string | null
        }
        Relationships: []
      }
      hugo_campaign_type_defs: {
        Row: {
          enabled: boolean
          key: string
          label: string
          method: string
          pattern: string | null
          sort: number
        }
        Insert: {
          enabled?: boolean
          key: string
          label: string
          method?: string
          pattern?: string | null
          sort?: number
        }
        Update: {
          enabled?: boolean
          key?: string
          label?: string
          method?: string
          pattern?: string | null
          sort?: number
        }
        Relationships: []
      }
      hugo_client_brain: {
        Row: {
          account_id: string
          bullets: Json
          headline: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          bullets?: Json
          headline?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          bullets?: Json
          headline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hugo_config: {
        Row: {
          account_id: string
          auto_neg_acos_min_clicks: number | null
          auto_neg_acos_pct: number | null
          auto_neg_clicks_nosale: number | null
          auto_neg_enabled: boolean | null
          auto_neg_min_spend: number | null
          autonomy_enabled: boolean
          created_at: string
          latitude: number | null
          longitude: number | null
          marketplace: string | null
          max_daily_budget_shift_pct: number
          merchant_token: string | null
          neg_keyword_click_threshold: number
          neg_min_acos: number | null
          profile_id: number | null
          updated_at: string
          weather_preference: string | null
          weather_reliant: boolean
        }
        Insert: {
          account_id: string
          auto_neg_acos_min_clicks?: number | null
          auto_neg_acos_pct?: number | null
          auto_neg_clicks_nosale?: number | null
          auto_neg_enabled?: boolean | null
          auto_neg_min_spend?: number | null
          autonomy_enabled?: boolean
          created_at?: string
          latitude?: number | null
          longitude?: number | null
          marketplace?: string | null
          max_daily_budget_shift_pct?: number
          merchant_token?: string | null
          neg_keyword_click_threshold?: number
          neg_min_acos?: number | null
          profile_id?: number | null
          updated_at?: string
          weather_preference?: string | null
          weather_reliant?: boolean
        }
        Update: {
          account_id?: string
          auto_neg_acos_min_clicks?: number | null
          auto_neg_acos_pct?: number | null
          auto_neg_clicks_nosale?: number | null
          auto_neg_enabled?: boolean | null
          auto_neg_min_spend?: number | null
          autonomy_enabled?: boolean
          created_at?: string
          latitude?: number | null
          longitude?: number | null
          marketplace?: string | null
          max_daily_budget_shift_pct?: number
          merchant_token?: string | null
          neg_keyword_click_threshold?: number
          neg_min_acos?: number | null
          profile_id?: number | null
          updated_at?: string
          weather_preference?: string | null
          weather_reliant?: boolean
        }
        Relationships: []
      }
      hugo_draft_skills: {
        Row: {
          created_at: string
          id: string
          name: string
          skill_md: string
          source_challenge_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          skill_md: string
          source_challenge_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          skill_md?: string
          source_challenge_id?: string | null
          status?: string
        }
        Relationships: []
      }
      hugo_executions: {
        Row: {
          account_id: string | null
          action_type: string | null
          after_value: string | null
          api_response: Json | null
          api_status: number | null
          before_value: string | null
          created_at: string
          detail: string | null
          id: number
          mode: string
          source: string | null
          status: string
          target_label: string | null
        }
        Insert: {
          account_id?: string | null
          action_type?: string | null
          after_value?: string | null
          api_response?: Json | null
          api_status?: number | null
          before_value?: string | null
          created_at?: string
          detail?: string | null
          id?: never
          mode?: string
          source?: string | null
          status: string
          target_label?: string | null
        }
        Update: {
          account_id?: string | null
          action_type?: string | null
          after_value?: string | null
          api_response?: Json | null
          api_status?: number | null
          before_value?: string | null
          created_at?: string
          detail?: string | null
          id?: never
          mode?: string
          source?: string | null
          status?: string
          target_label?: string | null
        }
        Relationships: []
      }
      hugo_feedback: {
        Row: {
          account_id: string | null
          correction: Json | null
          created_at: string
          decision_type: string | null
          id: string
          note: string | null
          original_decision: Json | null
          signal: string | null
        }
        Insert: {
          account_id?: string | null
          correction?: Json | null
          created_at?: string
          decision_type?: string | null
          id?: string
          note?: string | null
          original_decision?: Json | null
          signal?: string | null
        }
        Update: {
          account_id?: string | null
          correction?: Json | null
          created_at?: string
          decision_type?: string | null
          id?: string
          note?: string | null
          original_decision?: Json | null
          signal?: string | null
        }
        Relationships: []
      }
      hugo_handovers: {
        Row: {
          content_md: string
          created_at: string
          id: string
          source_ref: string | null
          source_type: string
          title: string | null
        }
        Insert: {
          content_md: string
          created_at?: string
          id?: string
          source_ref?: string | null
          source_type: string
          title?: string | null
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          source_ref?: string | null
          source_type?: string
          title?: string | null
        }
        Relationships: []
      }
      hugo_listing_checks: {
        Row: {
          asin: string
          breakdown: Json | null
          buybox: string | null
          checked_at: string | null
          fixes: Json | null
          grade: string | null
          issues: Json | null
          marketplace: string
          raw: Json | null
          score: number | null
        }
        Insert: {
          asin: string
          breakdown?: Json | null
          buybox?: string | null
          checked_at?: string | null
          fixes?: Json | null
          grade?: string | null
          issues?: Json | null
          marketplace: string
          raw?: Json | null
          score?: number | null
        }
        Update: {
          asin?: string
          breakdown?: Json | null
          buybox?: string | null
          checked_at?: string | null
          fixes?: Json | null
          grade?: string | null
          issues?: Json | null
          marketplace?: string
          raw?: Json | null
          score?: number | null
        }
        Relationships: []
      }
      hugo_listing_detect_log: {
        Row: {
          confidence: number | null
          decision: string
          id: string
          intent: string | null
          job_id: string | null
          reason: string | null
          run_at: string
          sender_email: string | null
          source_ref: string | null
          subject: string | null
        }
        Insert: {
          confidence?: number | null
          decision: string
          id?: string
          intent?: string | null
          job_id?: string | null
          reason?: string | null
          run_at?: string
          sender_email?: string | null
          source_ref?: string | null
          subject?: string | null
        }
        Update: {
          confidence?: number | null
          decision?: string
          id?: string
          intent?: string | null
          job_id?: string | null
          reason?: string | null
          run_at?: string
          sender_email?: string | null
          source_ref?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hugo_listing_detect_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hugo_listing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hugo_listing_jobs: {
        Row: {
          account_name: string | null
          approval_note: string | null
          asins: string[] | null
          confidence: number | null
          created_at: string
          detected_at: string
          diagnosis: Json | null
          draft_email_body: string | null
          draft_email_subject: string | null
          dry_run_result: Json | null
          dry_run_status: string | null
          execution_result: Json | null
          gmail_draft_id: string | null
          id: string
          intent_summary: string | null
          items: Json
          marketplace_id: string | null
          params: Json
          proposed_change: string | null
          recipe: string | null
          resolved_at: string | null
          selling_partner_id: string | null
          sender_email: string | null
          source: string
          source_ref: string | null
          source_task_id: number | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          approval_note?: string | null
          asins?: string[] | null
          confidence?: number | null
          created_at?: string
          detected_at?: string
          diagnosis?: Json | null
          draft_email_body?: string | null
          draft_email_subject?: string | null
          dry_run_result?: Json | null
          dry_run_status?: string | null
          execution_result?: Json | null
          gmail_draft_id?: string | null
          id?: string
          intent_summary?: string | null
          items?: Json
          marketplace_id?: string | null
          params?: Json
          proposed_change?: string | null
          recipe?: string | null
          resolved_at?: string | null
          selling_partner_id?: string | null
          sender_email?: string | null
          source?: string
          source_ref?: string | null
          source_task_id?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          approval_note?: string | null
          asins?: string[] | null
          confidence?: number | null
          created_at?: string
          detected_at?: string
          diagnosis?: Json | null
          draft_email_body?: string | null
          draft_email_subject?: string | null
          dry_run_result?: Json | null
          dry_run_status?: string | null
          execution_result?: Json | null
          gmail_draft_id?: string | null
          id?: string
          intent_summary?: string | null
          items?: Json
          marketplace_id?: string | null
          params?: Json
          proposed_change?: string | null
          recipe?: string | null
          resolved_at?: string | null
          selling_partner_id?: string | null
          sender_email?: string | null
          source?: string
          source_ref?: string | null
          source_task_id?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hugo_pending_actions: {
        Row: {
          account_id: string | null
          action_type: string
          confidence: number | null
          created_at: string
          external_ref: string | null
          id: string
          payload: Json | null
          rationale: string | null
          resolved_at: string | null
          run_id: string | null
          skill: string | null
          skill_params: Json | null
          status: string
        }
        Insert: {
          account_id?: string | null
          action_type: string
          confidence?: number | null
          created_at?: string
          external_ref?: string | null
          id?: string
          payload?: Json | null
          rationale?: string | null
          resolved_at?: string | null
          run_id?: string | null
          skill?: string | null
          skill_params?: Json | null
          status?: string
        }
        Update: {
          account_id?: string | null
          action_type?: string
          confidence?: number | null
          created_at?: string
          external_ref?: string | null
          id?: string
          payload?: Json | null
          rationale?: string | null
          resolved_at?: string | null
          run_id?: string | null
          skill?: string | null
          skill_params?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hugo_pending_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "hugo_run_log"
            referencedColumns: ["run_id"]
          },
        ]
      }
      hugo_run_log: {
        Row: {
          accounts_scanned: string[] | null
          actions_executed: number | null
          actions_queued: number | null
          created_at: string
          dry_run: boolean
          finished_at: string | null
          flags: Json | null
          model_cost: number | null
          models_used: Json | null
          run_id: string
          started_at: string
          status: string
          summary: string | null
          unrouted_challenges: Json | null
        }
        Insert: {
          accounts_scanned?: string[] | null
          actions_executed?: number | null
          actions_queued?: number | null
          created_at?: string
          dry_run?: boolean
          finished_at?: string | null
          flags?: Json | null
          model_cost?: number | null
          models_used?: Json | null
          run_id?: string
          started_at?: string
          status?: string
          summary?: string | null
          unrouted_challenges?: Json | null
        }
        Update: {
          accounts_scanned?: string[] | null
          actions_executed?: number | null
          actions_queued?: number | null
          created_at?: string
          dry_run?: boolean
          finished_at?: string | null
          flags?: Json | null
          model_cost?: number | null
          models_used?: Json | null
          run_id?: string
          started_at?: string
          status?: string
          summary?: string | null
          unrouted_challenges?: Json | null
        }
        Relationships: []
      }
      hugo_settings: {
        Row: {
          anthropic_enabled: boolean
          ask_model: string | null
          bulk_model: string
          complex_model: string
          dashboard_url: string | null
          dry_run: boolean
          floor_model: string
          id: number
          kill_switch: boolean
          monthly_api_cap_gbp: number
          schedule_window: string
          updated_at: string
        }
        Insert: {
          anthropic_enabled?: boolean
          ask_model?: string | null
          bulk_model?: string
          complex_model?: string
          dashboard_url?: string | null
          dry_run?: boolean
          floor_model?: string
          id?: number
          kill_switch?: boolean
          monthly_api_cap_gbp?: number
          schedule_window?: string
          updated_at?: string
        }
        Update: {
          anthropic_enabled?: boolean
          ask_model?: string | null
          bulk_model?: string
          complex_model?: string
          dashboard_url?: string | null
          dry_run?: boolean
          floor_model?: string
          id?: number
          kill_switch?: boolean
          monthly_api_cap_gbp?: number
          schedule_window?: string
          updated_at?: string
        }
        Relationships: []
      }
      hugo_simulations: {
        Row: {
          account_id: string | null
          action_id: string | null
          action_type: string | null
          created_at: string | null
          id: string
          inputs: Json | null
          result: Json | null
        }
        Insert: {
          account_id?: string | null
          action_id?: string | null
          action_type?: string | null
          created_at?: string | null
          id?: string
          inputs?: Json | null
          result?: Json | null
        }
        Update: {
          account_id?: string | null
          action_id?: string | null
          action_type?: string | null
          created_at?: string | null
          id?: string
          inputs?: Json | null
          result?: Json | null
        }
        Relationships: []
      }
      hugo_skill_routing: {
        Row: {
          autonomy: string
          circumstance: string
          created_at: string
          enabled: boolean
          id: string
          notes: string | null
          priority: number
          skill: string
        }
        Insert: {
          autonomy?: string
          circumstance: string
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          priority?: number
          skill: string
        }
        Update: {
          autonomy?: string
          circumstance?: string
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          priority?: number
          skill?: string
        }
        Relationships: []
      }
      hugo_source_health_cache: {
        Row: {
          account_id: string
          days_old: number | null
          detail: string | null
          latest_date: string | null
          refreshed_at: string | null
          rows_30d: number | null
          source: string
          status: string | null
        }
        Insert: {
          account_id: string
          days_old?: number | null
          detail?: string | null
          latest_date?: string | null
          refreshed_at?: string | null
          rows_30d?: number | null
          source: string
          status?: string | null
        }
        Update: {
          account_id?: string
          days_old?: number | null
          detail?: string | null
          latest_date?: string | null
          refreshed_at?: string | null
          rows_30d?: number | null
          source?: string
          status?: string | null
        }
        Relationships: []
      }
      hugo_stock_alerts_cache: {
        Row: {
          account_id: string | null
          alert: string | null
          asin: string | null
          days_cover: number | null
          on_hand_units: number | null
          recommend_units: number | null
          refreshed_at: string | null
          sort_idx: number | null
          surge_ratio: number | null
          title: string | null
          velocity_7d: number | null
          velocity_prior_7d: number | null
        }
        Insert: {
          account_id?: string | null
          alert?: string | null
          asin?: string | null
          days_cover?: number | null
          on_hand_units?: number | null
          recommend_units?: number | null
          refreshed_at?: string | null
          sort_idx?: number | null
          surge_ratio?: number | null
          title?: string | null
          velocity_7d?: number | null
          velocity_prior_7d?: number | null
        }
        Update: {
          account_id?: string | null
          alert?: string | null
          asin?: string | null
          days_cover?: number | null
          on_hand_units?: number | null
          recommend_units?: number | null
          refreshed_at?: string | null
          sort_idx?: number | null
          surge_ratio?: number | null
          title?: string | null
          velocity_7d?: number | null
          velocity_prior_7d?: number | null
        }
        Relationships: []
      }
      hugo_weather_daily: {
        Row: {
          account_id: string
          precip_mm: number | null
          record_date: string
          sunshine_hours: number | null
          temp_max: number | null
          temp_mean: number | null
          temp_min: number | null
          weather_code: number | null
        }
        Insert: {
          account_id: string
          precip_mm?: number | null
          record_date: string
          sunshine_hours?: number | null
          temp_max?: number | null
          temp_mean?: number | null
          temp_min?: number | null
          weather_code?: number | null
        }
        Update: {
          account_id?: string
          precip_mm?: number | null
          record_date?: string
          sunshine_hours?: number | null
          temp_max?: number | null
          temp_mean?: number | null
          temp_min?: number | null
          weather_code?: number | null
        }
        Relationships: []
      }
      insight_central_feedback: {
        Row: {
          app: string
          category: string | null
          created_at: string
          cycle: string | null
          id: string
          message: string
          page_path: string | null
          page_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          screenshot_path: string | null
          status: string
          user_agent: string | null
          user_label: string | null
          viewport: string | null
        }
        Insert: {
          app?: string
          category?: string | null
          created_at?: string
          cycle?: string | null
          id?: string
          message: string
          page_path?: string | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_path?: string | null
          status?: string
          user_agent?: string | null
          user_label?: string | null
          viewport?: string | null
        }
        Update: {
          app?: string
          category?: string | null
          created_at?: string
          cycle?: string | null
          id?: string
          message?: string
          page_path?: string | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_path?: string | null
          status?: string
          user_agent?: string | null
          user_label?: string | null
          viewport?: string | null
        }
        Relationships: []
      }
      jungle_scout_api_call_queue: {
        Row: {
          account_name: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: number
          payload: Json
          processed_at: string | null
          response: Json | null
          retry_count: number | null
          status: string | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: number
          payload: Json
          processed_at?: string | null
          response?: Json | null
          retry_count?: number | null
          status?: string | null
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: number
          payload?: Json
          processed_at?: string | null
          response?: Json | null
          retry_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      jungle_scout_api_usage: {
        Row: {
          account_name: string
          called_at: string
          created_at: string
          credits_used: number
          endpoint: string
          error_message: string | null
          id: number
          request_payload: Json | null
          response_status: string | null
        }
        Insert: {
          account_name: string
          called_at?: string
          created_at?: string
          credits_used?: number
          endpoint: string
          error_message?: string | null
          id?: never
          request_payload?: Json | null
          response_status?: string | null
        }
        Update: {
          account_name?: string
          called_at?: string
          created_at?: string
          credits_used?: number
          endpoint?: string
          error_message?: string | null
          id?: never
          request_payload?: Json | null
          response_status?: string | null
        }
        Relationships: []
      }
      jungle_scout_asin_relevance_scores: {
        Row: {
          asin: string
          brand: string | null
          category: string | null
          id: string
          product_name: string | null
          reasoning: string | null
          relevance_score: number | null
          scored_at: string | null
          session_id: string | null
          share_of_voice: number | null
        }
        Insert: {
          asin: string
          brand?: string | null
          category?: string | null
          id?: string
          product_name?: string | null
          reasoning?: string | null
          relevance_score?: number | null
          scored_at?: string | null
          session_id?: string | null
          share_of_voice?: number | null
        }
        Update: {
          asin?: string
          brand?: string | null
          category?: string | null
          id?: string
          product_name?: string | null
          reasoning?: string | null
          relevance_score?: number | null
          scored_at?: string | null
          session_id?: string | null
          share_of_voice?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asin_relevance_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jungle_scout_competitors: {
        Row: {
          account_name: string | null
          active: boolean | null
          added_at: string | null
          client_asin: string
          client_id: string | null
          competitor_asin: string
          id: number
          notes: string | null
          type: string | null
        }
        Insert: {
          account_name?: string | null
          active?: boolean | null
          added_at?: string | null
          client_asin: string
          client_id?: string | null
          competitor_asin: string
          id?: number
          notes?: string | null
          type?: string | null
        }
        Update: {
          account_name?: string | null
          active?: boolean | null
          added_at?: string | null
          client_asin?: string
          client_id?: string | null
          competitor_asin?: string
          id?: number
          notes?: string | null
          type?: string | null
        }
        Relationships: []
      }
      jungle_scout_historical_search_volume: {
        Row: {
          account_name: string | null
          country: string
          created_at: string | null
          dominant_category: string | null
          ease_of_ranking_score: number | null
          estimate_end_date: string
          estimate_start_date: string
          estimated_exact_search_volume: number | null
          id: number
          keyword: string
          keyword_id: number | null
          last_pulled_at: string | null
          organic_product_count: number | null
          recommended_promotions: number | null
          relevancy_score: number | null
          sponsored_product_count: number | null
        }
        Insert: {
          account_name?: string | null
          country?: string
          created_at?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          estimate_end_date: string
          estimate_start_date: string
          estimated_exact_search_volume?: number | null
          id?: never
          keyword: string
          keyword_id?: number | null
          last_pulled_at?: string | null
          organic_product_count?: number | null
          recommended_promotions?: number | null
          relevancy_score?: number | null
          sponsored_product_count?: number | null
        }
        Update: {
          account_name?: string | null
          country?: string
          created_at?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          estimate_end_date?: string
          estimate_start_date?: string
          estimated_exact_search_volume?: number | null
          id?: never
          keyword?: string
          keyword_id?: number | null
          last_pulled_at?: string | null
          organic_product_count?: number | null
          recommended_promotions?: number | null
          relevancy_score?: number | null
          sponsored_product_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jungle_scout_historical_search_volume_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_keywords_master"
            referencedColumns: ["keyword_id"]
          },
        ]
      }
      jungle_scout_keyword_expansion: {
        Row: {
          account_name: string | null
          country: string | null
          dominant_category: string | null
          ease_of_ranking_score: number | null
          id: number
          keyword: string | null
          keyword_id: number | null
          monthly_search_volume_broad: number | null
          monthly_search_volume_exact: number | null
          monthly_trend: number | null
          organic_product_count: number | null
          ppc_bid_broad: number | null
          ppc_bid_exact: number | null
          pulled_at: string | null
          quarterly_trend: number | null
          recommended_promotions: number | null
          relevancy_score: number | null
          seed_keyword: string
          sp_brand_ad_bid: number | null
          sponsored_product_count: number | null
        }
        Insert: {
          account_name?: string | null
          country?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          id?: number
          keyword?: string | null
          keyword_id?: number | null
          monthly_search_volume_broad?: number | null
          monthly_search_volume_exact?: number | null
          monthly_trend?: number | null
          organic_product_count?: number | null
          ppc_bid_broad?: number | null
          ppc_bid_exact?: number | null
          pulled_at?: string | null
          quarterly_trend?: number | null
          recommended_promotions?: number | null
          relevancy_score?: number | null
          seed_keyword: string
          sp_brand_ad_bid?: number | null
          sponsored_product_count?: number | null
        }
        Update: {
          account_name?: string | null
          country?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          id?: number
          keyword?: string | null
          keyword_id?: number | null
          monthly_search_volume_broad?: number | null
          monthly_search_volume_exact?: number | null
          monthly_trend?: number | null
          organic_product_count?: number | null
          ppc_bid_broad?: number | null
          ppc_bid_exact?: number | null
          pulled_at?: string | null
          quarterly_trend?: number | null
          recommended_promotions?: number | null
          relevancy_score?: number | null
          seed_keyword?: string
          sp_brand_ad_bid?: number | null
          sponsored_product_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jungle_scout_keyword_expansion_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_keywords_master"
            referencedColumns: ["keyword_id"]
          },
        ]
      }
      jungle_scout_keyword_gaps: {
        Row: {
          account_name: string
          client_asin: string | null
          client_organic_rank: number | null
          competitor_asin: string
          competitor_organic_rank: number | null
          country: string | null
          created_at: string
          ease_of_ranking_score: number | null
          gap_type: string | null
          id: number
          keyword: string
          keyword_id: number | null
          last_checked_at: string
          monthly_search_volume_exact: number | null
          ppc_bid_exact: number | null
        }
        Insert: {
          account_name: string
          client_asin?: string | null
          client_organic_rank?: number | null
          competitor_asin: string
          competitor_organic_rank?: number | null
          country?: string | null
          created_at?: string
          ease_of_ranking_score?: number | null
          gap_type?: string | null
          id?: never
          keyword: string
          keyword_id?: number | null
          last_checked_at?: string
          monthly_search_volume_exact?: number | null
          ppc_bid_exact?: number | null
        }
        Update: {
          account_name?: string
          client_asin?: string | null
          client_organic_rank?: number | null
          competitor_asin?: string
          competitor_organic_rank?: number | null
          country?: string | null
          created_at?: string
          ease_of_ranking_score?: number | null
          gap_type?: string | null
          id?: never
          keyword?: string
          keyword_id?: number | null
          last_checked_at?: string
          monthly_search_volume_exact?: number | null
          ppc_bid_exact?: number | null
        }
        Relationships: []
      }
      jungle_scout_keyword_rank_history: {
        Row: {
          account_name: string | null
          asin: string
          country: string | null
          created_at: string | null
          id: number
          keyword: string | null
          keyword_id: number | null
          organic_rank: number | null
          overall_rank: number | null
          record_date: string
          search_volume_exact: number | null
          sponsored_rank: number | null
        }
        Insert: {
          account_name?: string | null
          asin: string
          country?: string | null
          created_at?: string | null
          id?: number
          keyword?: string | null
          keyword_id?: number | null
          organic_rank?: number | null
          overall_rank?: number | null
          record_date?: string
          search_volume_exact?: number | null
          sponsored_rank?: number | null
        }
        Update: {
          account_name?: string | null
          asin?: string
          country?: string | null
          created_at?: string | null
          id?: number
          keyword?: string | null
          keyword_id?: number | null
          organic_rank?: number | null
          overall_rank?: number | null
          record_date?: string
          search_volume_exact?: number | null
          sponsored_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jungle_scout_keyword_rank_history_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_keywords_master"
            referencedColumns: ["keyword_id"]
          },
        ]
      }
      jungle_scout_keyword_relevance_scores: {
        Row: {
          category: string | null
          id: string
          keyword: string
          reasoning: string | null
          relevance_score: number | null
          scored_at: string | null
          search_volume: number | null
          session_id: string | null
          source_asin: string | null
        }
        Insert: {
          category?: string | null
          id?: string
          keyword: string
          reasoning?: string | null
          relevance_score?: number | null
          scored_at?: string | null
          search_volume?: number | null
          session_id?: string | null
          source_asin?: string | null
        }
        Update: {
          category?: string | null
          id?: string
          keyword?: string
          reasoning?: string | null
          relevance_score?: number | null
          scored_at?: string | null
          search_volume?: number | null
          session_id?: string | null
          source_asin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_relevance_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jungle_scout_keywords_by_asin: {
        Row: {
          account_name: string | null
          asin: string
          competitor_ranks: Json | null
          country: string | null
          dominant_category: string | null
          ease_of_ranking_score: number | null
          id: number
          keyword: string | null
          keyword_id: number | null
          monthly_search_volume_broad: number | null
          monthly_search_volume_exact: number | null
          monthly_trend: number | null
          organic_product_count: number | null
          organic_rank: number | null
          overall_rank: number | null
          ppc_bid_broad: number | null
          ppc_bid_exact: number | null
          pulled_at: string | null
          quarterly_trend: number | null
          relevancy_score: number | null
          sp_brand_ad_bid: number | null
          sponsored_product_count: number | null
          sponsored_rank: number | null
        }
        Insert: {
          account_name?: string | null
          asin: string
          competitor_ranks?: Json | null
          country?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          id?: number
          keyword?: string | null
          keyword_id?: number | null
          monthly_search_volume_broad?: number | null
          monthly_search_volume_exact?: number | null
          monthly_trend?: number | null
          organic_product_count?: number | null
          organic_rank?: number | null
          overall_rank?: number | null
          ppc_bid_broad?: number | null
          ppc_bid_exact?: number | null
          pulled_at?: string | null
          quarterly_trend?: number | null
          relevancy_score?: number | null
          sp_brand_ad_bid?: number | null
          sponsored_product_count?: number | null
          sponsored_rank?: number | null
        }
        Update: {
          account_name?: string | null
          asin?: string
          competitor_ranks?: Json | null
          country?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          id?: number
          keyword?: string | null
          keyword_id?: number | null
          monthly_search_volume_broad?: number | null
          monthly_search_volume_exact?: number | null
          monthly_trend?: number | null
          organic_product_count?: number | null
          organic_rank?: number | null
          overall_rank?: number | null
          ppc_bid_broad?: number | null
          ppc_bid_exact?: number | null
          pulled_at?: string | null
          quarterly_trend?: number | null
          relevancy_score?: number | null
          sp_brand_ad_bid?: number | null
          sponsored_product_count?: number | null
          sponsored_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jungle_scout_keywords_by_asin_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_keywords_master"
            referencedColumns: ["keyword_id"]
          },
        ]
      }
      jungle_scout_keywords_by_keyword: {
        Row: {
          account_name: string | null
          country: string
          created_at: string | null
          dominant_category: string | null
          ease_of_ranking_score: number | null
          id: number
          keyword: string
          keyword_id: number | null
          last_pulled_at: string | null
          monthly_search_volume_broad: number | null
          monthly_search_volume_exact: number | null
          monthly_trend: number | null
          organic_product_count: number | null
          ppc_bid_broad: number | null
          ppc_bid_exact: number | null
          quarterly_trend: number | null
          recommended_promotions: number | null
          relevancy_score: number | null
          seed_keyword: string
          sp_brand_ad_bid: number | null
          sponsored_product_count: number | null
        }
        Insert: {
          account_name?: string | null
          country?: string
          created_at?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          id?: never
          keyword: string
          keyword_id?: number | null
          last_pulled_at?: string | null
          monthly_search_volume_broad?: number | null
          monthly_search_volume_exact?: number | null
          monthly_trend?: number | null
          organic_product_count?: number | null
          ppc_bid_broad?: number | null
          ppc_bid_exact?: number | null
          quarterly_trend?: number | null
          recommended_promotions?: number | null
          relevancy_score?: number | null
          seed_keyword: string
          sp_brand_ad_bid?: number | null
          sponsored_product_count?: number | null
        }
        Update: {
          account_name?: string | null
          country?: string
          created_at?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          id?: never
          keyword?: string
          keyword_id?: number | null
          last_pulled_at?: string | null
          monthly_search_volume_broad?: number | null
          monthly_search_volume_exact?: number | null
          monthly_trend?: number | null
          organic_product_count?: number | null
          ppc_bid_broad?: number | null
          ppc_bid_exact?: number | null
          quarterly_trend?: number | null
          recommended_promotions?: number | null
          relevancy_score?: number | null
          seed_keyword?: string
          sp_brand_ad_bid?: number | null
          sponsored_product_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jungle_scout_keywords_by_keyword_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_keywords_master"
            referencedColumns: ["keyword_id"]
          },
        ]
      }
      jungle_scout_keywords_master: {
        Row: {
          account_name: string | null
          first_seen: string | null
          keyword: string
          keyword_id: number
          last_seen: string | null
          normalized_keyword: string
          root_keyword: string | null
        }
        Insert: {
          account_name?: string | null
          first_seen?: string | null
          keyword: string
          keyword_id?: number
          last_seen?: string | null
          normalized_keyword: string
          root_keyword?: string | null
        }
        Update: {
          account_name?: string | null
          first_seen?: string | null
          keyword?: string
          keyword_id?: number
          last_seen?: string | null
          normalized_keyword?: string
          root_keyword?: string | null
        }
        Relationships: []
      }
      jungle_scout_ppc_gap_analysis_results: {
        Row: {
          created_at: string | null
          current_bid: number | null
          gap_type: string
          id: string
          keyword: string
          priority_score: number | null
          recommended_action: string | null
          relevance_score: number | null
          search_volume: number | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_bid?: number | null
          gap_type: string
          id?: string
          keyword: string
          priority_score?: number | null
          recommended_action?: string | null
          relevance_score?: number | null
          search_volume?: number | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_bid?: number | null
          gap_type?: string
          id?: string
          keyword?: string
          priority_score?: number | null
          recommended_action?: string | null
          relevance_score?: number | null
          search_volume?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppc_gap_analysis_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jungle_scout_research_sessions: {
        Row: {
          account_name: string | null
          created_at: string | null
          id: string
          marketplace: string
          product_asin: string | null
          product_description: string | null
          seed_keyword: string
          status: string
          target_asin: string | null
          target_category: string | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          id?: string
          marketplace?: string
          product_asin?: string | null
          product_description?: string | null
          seed_keyword: string
          status?: string
          target_asin?: string | null
          target_category?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          id?: string
          marketplace?: string
          product_asin?: string | null
          product_description?: string | null
          seed_keyword?: string
          status?: string
          target_asin?: string | null
          target_category?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jungle_scout_share_of_voice: {
        Row: {
          account_name: string | null
          created_at: string | null
          estimated_30_day_search_volume: number | null
          exact_suggested_bid_median: number | null
          id: number
          js_updated_at: string | null
          keyword: string
          last_pulled_at: string | null
          marketplace: string
          product_count: number | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          estimated_30_day_search_volume?: number | null
          exact_suggested_bid_median?: number | null
          id?: number
          js_updated_at?: string | null
          keyword: string
          last_pulled_at?: string | null
          marketplace?: string
          product_count?: number | null
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          estimated_30_day_search_volume?: number | null
          exact_suggested_bid_median?: number | null
          id?: number
          js_updated_at?: string | null
          keyword?: string
          last_pulled_at?: string | null
          marketplace?: string
          product_count?: number | null
        }
        Relationships: []
      }
      jungle_scout_sov_brands: {
        Row: {
          account_name: string | null
          brand: string | null
          combined_average_position: number | null
          combined_average_price: number | null
          combined_basic_sov: number | null
          combined_products: number | null
          combined_weighted_sov: number | null
          created_at: string | null
          id: number
          organic_average_position: number | null
          organic_average_price: number | null
          organic_basic_sov: number | null
          organic_products: number | null
          organic_weighted_sov: number | null
          sov_id: number | null
          sponsored_average_position: number | null
          sponsored_average_price: number | null
          sponsored_basic_sov: number | null
          sponsored_products: number | null
          sponsored_weighted_sov: number | null
        }
        Insert: {
          account_name?: string | null
          brand?: string | null
          combined_average_position?: number | null
          combined_average_price?: number | null
          combined_basic_sov?: number | null
          combined_products?: number | null
          combined_weighted_sov?: number | null
          created_at?: string | null
          id?: number
          organic_average_position?: number | null
          organic_average_price?: number | null
          organic_basic_sov?: number | null
          organic_products?: number | null
          organic_weighted_sov?: number | null
          sov_id?: number | null
          sponsored_average_position?: number | null
          sponsored_average_price?: number | null
          sponsored_basic_sov?: number | null
          sponsored_products?: number | null
          sponsored_weighted_sov?: number | null
        }
        Update: {
          account_name?: string | null
          brand?: string | null
          combined_average_position?: number | null
          combined_average_price?: number | null
          combined_basic_sov?: number | null
          combined_products?: number | null
          combined_weighted_sov?: number | null
          created_at?: string | null
          id?: number
          organic_average_position?: number | null
          organic_average_price?: number | null
          organic_basic_sov?: number | null
          organic_products?: number | null
          organic_weighted_sov?: number | null
          sov_id?: number | null
          sponsored_average_position?: number | null
          sponsored_average_price?: number | null
          sponsored_basic_sov?: number | null
          sponsored_products?: number | null
          sponsored_weighted_sov?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jungle_scout_sov_brands_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_share_of_voice"
            referencedColumns: ["id"]
          },
        ]
      }
      jungle_scout_sov_top_asins: {
        Row: {
          account_name: string | null
          asin: string
          brand: string | null
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          created_at: string | null
          id: number
          name: string | null
          sov_id: number | null
        }
        Insert: {
          account_name?: string | null
          asin: string
          brand?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string | null
          id?: number
          name?: string | null
          sov_id?: number | null
        }
        Update: {
          account_name?: string | null
          asin?: string
          brand?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string | null
          id?: number
          name?: string | null
          sov_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jungle_scout_sov_top_asins_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "jungle_scout_share_of_voice"
            referencedColumns: ["id"]
          },
        ]
      }
      link_checks: {
        Row: {
          client_name: string | null
          created_at: string | null
          detail: string | null
          id: number
          link_id: number | null
          status: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          detail?: string | null
          id?: number
          link_id?: number | null
          status: string
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          detail?: string | null
          id?: number
          link_id?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_checks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "client_links"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_drift_check_runs: {
        Row: {
          asins_checked: number
          completed_at: string | null
          drift_events_created: number
          errors: Json
          id: string
          started_at: string
        }
        Insert: {
          asins_checked?: number
          completed_at?: string | null
          drift_events_created?: number
          errors?: Json
          id?: string
          started_at?: string
        }
        Update: {
          asins_checked?: number
          completed_at?: string | null
          drift_events_created?: number
          errors?: Json
          id?: string
          started_at?: string
        }
        Relationships: []
      }
      listing_drift_log: {
        Row: {
          account_id: string
          actual_value: string | null
          alerted: boolean
          asin: string
          bullet_index: number | null
          checked_at: string
          drift_type: string
          expected_value: string | null
          id: string
          marketplace: string
          resolved: boolean
          resolved_at: string | null
          similarity_score: number | null
          verified_content_id: string
        }
        Insert: {
          account_id: string
          actual_value?: string | null
          alerted?: boolean
          asin: string
          bullet_index?: number | null
          checked_at?: string
          drift_type: string
          expected_value?: string | null
          id?: string
          marketplace: string
          resolved?: boolean
          resolved_at?: string | null
          similarity_score?: number | null
          verified_content_id: string
        }
        Update: {
          account_id?: string
          actual_value?: string | null
          alerted?: boolean
          asin?: string
          bullet_index?: number | null
          checked_at?: string
          drift_type?: string
          expected_value?: string | null
          id?: string
          marketplace?: string
          resolved?: boolean
          resolved_at?: string | null
          similarity_score?: number | null
          verified_content_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_drift_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drift_log_verified_content_id_fkey"
            columns: ["verified_content_id"]
            isOneToOne: false
            referencedRelation: "listing_drift_verified_content"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_drift_verified_content: {
        Row: {
          account_id: string
          active: boolean
          asin: string
          bullets: Json | null
          created_at: string
          description: string | null
          expected_buybox_seller_id: string | null
          expected_buybox_seller_name: string | null
          id: string
          last_verified_at: string | null
          main_image_url: string | null
          marketplace: string
          notification_email: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          active?: boolean
          asin: string
          bullets?: Json | null
          created_at?: string
          description?: string | null
          expected_buybox_seller_id?: string | null
          expected_buybox_seller_name?: string | null
          id?: string
          last_verified_at?: string | null
          main_image_url?: string | null
          marketplace: string
          notification_email?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          asin?: string
          bullets?: Json | null
          created_at?: string
          description?: string | null
          expected_buybox_seller_id?: string | null
          expected_buybox_seller_name?: string | null
          id?: string
          last_verified_at?: string | null
          main_image_url?: string | null
          marketplace?: string
          notification_email?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_drift_verified_content_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_drift_verified_content_history: {
        Row: {
          account_id: string | null
          active: boolean | null
          asin: string | null
          bullets: Json | null
          changed_at: string
          created_at: string | null
          description: string | null
          expected_buybox_seller_id: string | null
          expected_buybox_seller_name: string | null
          history_id: string
          id: string | null
          last_verified_at: string | null
          main_image_url: string | null
          marketplace: string | null
          notification_email: string | null
          op: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          active?: boolean | null
          asin?: string | null
          bullets?: Json | null
          changed_at?: string
          created_at?: string | null
          description?: string | null
          expected_buybox_seller_id?: string | null
          expected_buybox_seller_name?: string | null
          history_id?: string
          id?: string | null
          last_verified_at?: string | null
          main_image_url?: string | null
          marketplace?: string | null
          notification_email?: string | null
          op: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          active?: boolean | null
          asin?: string | null
          bullets?: Json | null
          changed_at?: string
          created_at?: string | null
          description?: string | null
          expected_buybox_seller_id?: string | null
          expected_buybox_seller_name?: string | null
          history_id?: string
          id?: string | null
          last_verified_at?: string | null
          main_image_url?: string | null
          marketplace?: string | null
          notification_email?: string | null
          op?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      listing_drift_watchdog_log: {
        Row: {
          alert_email_error: string | null
          alert_email_sent: boolean
          alert_reason: string | null
          alert_triggered: boolean
          checked_at: string
          id: string
          last_run_age_minutes: number | null
          last_run_started_at: string | null
        }
        Insert: {
          alert_email_error?: string | null
          alert_email_sent?: boolean
          alert_reason?: string | null
          alert_triggered?: boolean
          checked_at?: string
          id?: string
          last_run_age_minutes?: number | null
          last_run_started_at?: string | null
        }
        Update: {
          alert_email_error?: string | null
          alert_email_sent?: boolean
          alert_reason?: string | null
          alert_triggered?: boolean
          checked_at?: string
          id?: string
          last_run_age_minutes?: number | null
          last_run_started_at?: string | null
        }
        Relationships: []
      }
      listings_sync_queue: {
        Row: {
          account_name: string
          amazon_report_id: string | null
          attempts: number | null
          country: string
          created_at: string | null
          error: string | null
          id: string
          marketplace_id: string
          record_date: string
          region: string
          rows_upserted: number | null
          selling_partner_id: string
          status: string
          target: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          amazon_report_id?: string | null
          attempts?: number | null
          country: string
          created_at?: string | null
          error?: string | null
          id?: string
          marketplace_id: string
          record_date: string
          region: string
          rows_upserted?: number | null
          selling_partner_id: string
          status?: string
          target?: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          amazon_report_id?: string | null
          attempts?: number | null
          country?: string
          created_at?: string | null
          error?: string | null
          id?: string
          marketplace_id?: string
          record_date?: string
          region?: string
          rows_upserted?: number | null
          selling_partner_id?: string
          status?: string
          target?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lockabox_war_core_keywords: {
        Row: {
          added_by: string | null
          created_at: string
          id: number
          is_active: boolean
          keyword: string
          marketplace: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: never
          is_active?: boolean
          keyword: string
          marketplace: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: never
          is_active?: boolean
          keyword?: string
          marketplace?: string
        }
        Relationships: []
      }
      lockabox_war_events: {
        Row: {
          asin: string | null
          brand: string | null
          created_at: string
          detail: Json | null
          event_date: string
          event_type: string
          headline: string
          id: number
          marketplace: string | null
          role: string | null
          severity: string
        }
        Insert: {
          asin?: string | null
          brand?: string | null
          created_at?: string
          detail?: Json | null
          event_date?: string
          event_type: string
          headline: string
          id?: never
          marketplace?: string | null
          role?: string | null
          severity?: string
        }
        Update: {
          asin?: string | null
          brand?: string | null
          created_at?: string
          detail?: Json | null
          event_date?: string
          event_type?: string
          headline?: string
          id?: never
          marketplace?: string | null
          role?: string | null
          severity?: string
        }
        Relationships: []
      }
      lockabox_war_keyword_history: {
        Row: {
          asin: string
          created_at: string
          id: number
          keyword: string
          marketplace: string
          organic_rank: number | null
          overall_rank: number | null
          record_date: string
          search_volume_exact: number | null
          sponsored_rank: number | null
        }
        Insert: {
          asin: string
          created_at?: string
          id?: never
          keyword: string
          marketplace: string
          organic_rank?: number | null
          overall_rank?: number | null
          record_date?: string
          search_volume_exact?: number | null
          sponsored_rank?: number | null
        }
        Update: {
          asin?: string
          created_at?: string
          id?: never
          keyword?: string
          marketplace?: string
          organic_rank?: number | null
          overall_rank?: number | null
          record_date?: string
          search_volume_exact?: number | null
          sponsored_rank?: number | null
        }
        Relationships: []
      }
      lockabox_war_keywords: {
        Row: {
          asin: string
          brand: string | null
          dominant_category: string | null
          ease_of_ranking_score: number | null
          id: number
          keyword: string
          marketplace: string
          monthly_trend: number | null
          organic_rank: number | null
          overall_rank: number | null
          ppc_bid_broad: number | null
          ppc_bid_exact: number | null
          pulled_at: string
          quarterly_trend: number | null
          relevancy_score: number | null
          role: string | null
          search_volume_broad: number | null
          search_volume_exact: number | null
          sponsored_rank: number | null
        }
        Insert: {
          asin: string
          brand?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          id?: never
          keyword: string
          marketplace: string
          monthly_trend?: number | null
          organic_rank?: number | null
          overall_rank?: number | null
          ppc_bid_broad?: number | null
          ppc_bid_exact?: number | null
          pulled_at?: string
          quarterly_trend?: number | null
          relevancy_score?: number | null
          role?: string | null
          search_volume_broad?: number | null
          search_volume_exact?: number | null
          sponsored_rank?: number | null
        }
        Update: {
          asin?: string
          brand?: string | null
          dominant_category?: string | null
          ease_of_ranking_score?: number | null
          id?: never
          keyword?: string
          marketplace?: string
          monthly_trend?: number | null
          organic_rank?: number | null
          overall_rank?: number | null
          ppc_bid_broad?: number | null
          ppc_bid_exact?: number | null
          pulled_at?: string
          quarterly_trend?: number | null
          relevancy_score?: number | null
          role?: string | null
          search_volume_broad?: number | null
          search_volume_exact?: number | null
          sponsored_rank?: number | null
        }
        Relationships: []
      }
      lockabox_war_product_snapshots: {
        Row: {
          asin: string
          brand: string | null
          bsr: number | null
          buybox_seller: string | null
          category: string | null
          category_rank: number | null
          created_at: string
          currency: string | null
          date_first_available: string | null
          deal_badge: string | null
          est_revenue_month: number | null
          est_units_month: number | null
          has_coupon: boolean | null
          id: number
          image_url: string | null
          in_stock: boolean | null
          listing_quality_score: number | null
          marketplace: string
          parent_asin: string | null
          price: number | null
          rating: number | null
          raw: Json | null
          review_count: number | null
          role: string | null
          seller_count: number | null
          snapshot_date: string
          source: string | null
          subcategory: string | null
          title: string | null
        }
        Insert: {
          asin: string
          brand?: string | null
          bsr?: number | null
          buybox_seller?: string | null
          category?: string | null
          category_rank?: number | null
          created_at?: string
          currency?: string | null
          date_first_available?: string | null
          deal_badge?: string | null
          est_revenue_month?: number | null
          est_units_month?: number | null
          has_coupon?: boolean | null
          id?: never
          image_url?: string | null
          in_stock?: boolean | null
          listing_quality_score?: number | null
          marketplace: string
          parent_asin?: string | null
          price?: number | null
          rating?: number | null
          raw?: Json | null
          review_count?: number | null
          role?: string | null
          seller_count?: number | null
          snapshot_date?: string
          source?: string | null
          subcategory?: string | null
          title?: string | null
        }
        Update: {
          asin?: string
          brand?: string | null
          bsr?: number | null
          buybox_seller?: string | null
          category?: string | null
          category_rank?: number | null
          created_at?: string
          currency?: string | null
          date_first_available?: string | null
          deal_badge?: string | null
          est_revenue_month?: number | null
          est_units_month?: number | null
          has_coupon?: boolean | null
          id?: never
          image_url?: string | null
          in_stock?: boolean | null
          listing_quality_score?: number | null
          marketplace?: string
          parent_asin?: string | null
          price?: number | null
          rating?: number | null
          raw?: Json | null
          review_count?: number | null
          role?: string | null
          seller_count?: number | null
          snapshot_date?: string
          source?: string | null
          subcategory?: string | null
          title?: string | null
        }
        Relationships: []
      }
      lockabox_war_sov: {
        Row: {
          brand: string
          combined_avg_position: number | null
          combined_avg_price: number | null
          combined_basic_sov: number | null
          combined_products: number | null
          combined_weighted_sov: number | null
          created_at: string
          id: number
          keyword: string
          keyword_search_volume: number | null
          marketplace: string
          organic_avg_position: number | null
          organic_products: number | null
          organic_weighted_sov: number | null
          role: string | null
          snapshot_date: string
          sponsored_avg_position: number | null
          sponsored_products: number | null
          sponsored_weighted_sov: number | null
        }
        Insert: {
          brand: string
          combined_avg_position?: number | null
          combined_avg_price?: number | null
          combined_basic_sov?: number | null
          combined_products?: number | null
          combined_weighted_sov?: number | null
          created_at?: string
          id?: never
          keyword: string
          keyword_search_volume?: number | null
          marketplace: string
          organic_avg_position?: number | null
          organic_products?: number | null
          organic_weighted_sov?: number | null
          role?: string | null
          snapshot_date?: string
          sponsored_avg_position?: number | null
          sponsored_products?: number | null
          sponsored_weighted_sov?: number | null
        }
        Update: {
          brand?: string
          combined_avg_position?: number | null
          combined_avg_price?: number | null
          combined_basic_sov?: number | null
          combined_products?: number | null
          combined_weighted_sov?: number | null
          created_at?: string
          id?: never
          keyword?: string
          keyword_search_volume?: number | null
          marketplace?: string
          organic_avg_position?: number | null
          organic_products?: number | null
          organic_weighted_sov?: number | null
          role?: string | null
          snapshot_date?: string
          sponsored_avg_position?: number | null
          sponsored_products?: number | null
          sponsored_weighted_sov?: number | null
        }
        Relationships: []
      }
      lockabox_war_sync_log: {
        Row: {
          credits_used: number | null
          finished_at: string | null
          id: number
          job: string
          marketplace: string | null
          message: string | null
          rows_written: number | null
          started_at: string | null
          status: string | null
          targets_count: number | null
        }
        Insert: {
          credits_used?: number | null
          finished_at?: string | null
          id?: never
          job: string
          marketplace?: string | null
          message?: string | null
          rows_written?: number | null
          started_at?: string | null
          status?: string | null
          targets_count?: number | null
        }
        Update: {
          credits_used?: number | null
          finished_at?: string | null
          id?: never
          job?: string
          marketplace?: string | null
          message?: string | null
          rows_written?: number | null
          started_at?: string | null
          status?: string | null
          targets_count?: number | null
        }
        Relationships: []
      }
      lockabox_war_targets: {
        Row: {
          added_by: string | null
          asin: string
          brand: string
          created_at: string
          id: number
          is_active: boolean
          is_hot: boolean
          marketplace: string
          notes: string | null
          radar_only: boolean
          role: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          asin: string
          brand: string
          created_at?: string
          id?: never
          is_active?: boolean
          is_hot?: boolean
          marketplace: string
          notes?: string | null
          radar_only?: boolean
          role?: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          asin?: string
          brand?: string
          created_at?: string
          id?: never
          is_active?: boolean
          is_hot?: boolean
          marketplace?: string
          notes?: string | null
          radar_only?: boolean
          role?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monitoring_status: {
        Row: {
          accounts_checked: number | null
          alerts_generated: number | null
          created_at: string
          error_details: Json | null
          errors_encountered: number | null
          execution_time_ms: number | null
          id: string
          last_run_at: string
          monitor_type: string
          run_status: string
          updated_at: string
        }
        Insert: {
          accounts_checked?: number | null
          alerts_generated?: number | null
          created_at?: string
          error_details?: Json | null
          errors_encountered?: number | null
          execution_time_ms?: number | null
          id?: string
          last_run_at?: string
          monitor_type: string
          run_status: string
          updated_at?: string
        }
        Update: {
          accounts_checked?: number | null
          alerts_generated?: number | null
          created_at?: string
          error_details?: Json | null
          errors_encountered?: number | null
          execution_time_ms?: number | null
          id?: string
          last_run_at?: string
          monitor_type?: string
          run_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      negative_keyword_config: {
        Row: {
          account_name: string
          country_code: string
          created_at: string
          exclude_branded: boolean | null
          id: number
          is_active: boolean
          match_type_filter: string[] | null
          max_bid: number | null
          max_bid_increase: number | null
          max_cpc: number | null
          min_conversion_rate: number | null
          min_impressions: number | null
          min_orders: number | null
          profile_id: number
          rule1_enabled: boolean | null
          rule1_kw_click_threshold: number | null
          rule1_lookback_days: number | null
          rule1_pt_click_threshold: number | null
          rule2_enabled: boolean | null
          rule2_kw_max_acos: number | null
          rule2_kw_min_spend: number | null
          rule2_lookback_days: number | null
          rule2_pt_max_acos: number | null
          rule2_pt_min_spend: number | null
          updated_at: string
        }
        Insert: {
          account_name: string
          country_code?: string
          created_at?: string
          exclude_branded?: boolean | null
          id?: never
          is_active?: boolean
          match_type_filter?: string[] | null
          max_bid?: number | null
          max_bid_increase?: number | null
          max_cpc?: number | null
          min_conversion_rate?: number | null
          min_impressions?: number | null
          min_orders?: number | null
          profile_id: number
          rule1_enabled?: boolean | null
          rule1_kw_click_threshold?: number | null
          rule1_lookback_days?: number | null
          rule1_pt_click_threshold?: number | null
          rule2_enabled?: boolean | null
          rule2_kw_max_acos?: number | null
          rule2_kw_min_spend?: number | null
          rule2_lookback_days?: number | null
          rule2_pt_max_acos?: number | null
          rule2_pt_min_spend?: number | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          country_code?: string
          created_at?: string
          exclude_branded?: boolean | null
          id?: never
          is_active?: boolean
          match_type_filter?: string[] | null
          max_bid?: number | null
          max_bid_increase?: number | null
          max_cpc?: number | null
          min_conversion_rate?: number | null
          min_impressions?: number | null
          min_orders?: number | null
          profile_id?: number
          rule1_enabled?: boolean | null
          rule1_kw_click_threshold?: number | null
          rule1_lookback_days?: number | null
          rule1_pt_click_threshold?: number | null
          rule2_enabled?: boolean | null
          rule2_kw_max_acos?: number | null
          rule2_kw_min_spend?: number | null
          rule2_lookback_days?: number | null
          rule2_pt_max_acos?: number | null
          rule2_pt_min_spend?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      negative_keyword_log: {
        Row: {
          amazon_response: Json | null
          campaign_id: number
          error_message: string | null
          id: number
          keyword_text: string
          match_type: string
          negative_type: string
          pending_negative_id: number | null
          profile_id: number
          pushed_at: string
          rule_triggered: string
          status: string
          target_level: string
        }
        Insert: {
          amazon_response?: Json | null
          campaign_id: number
          error_message?: string | null
          id?: never
          keyword_text: string
          match_type: string
          negative_type: string
          pending_negative_id?: number | null
          profile_id: number
          pushed_at?: string
          rule_triggered: string
          status: string
          target_level: string
        }
        Update: {
          amazon_response?: Json | null
          campaign_id?: number
          error_message?: string | null
          id?: never
          keyword_text?: string
          match_type?: string
          negative_type?: string
          pending_negative_id?: number | null
          profile_id?: number
          pushed_at?: string
          rule_triggered?: string
          status?: string
          target_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "negative_keyword_log_pending_negative_id_fkey"
            columns: ["pending_negative_id"]
            isOneToOne: false
            referencedRelation: "pending_negatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ni_candles_flat: {
        Row: {
          asin: string | null
          brand: string | null
          category: string | null
          grp: string | null
          implied_price: number | null
          is_variant: boolean | null
          parent_asin: string | null
          price: number | null
          product_rank: number | null
          rating: number | null
          revenue: number | null
          reviews: number | null
          suspect: boolean | null
          term: string | null
          title: string | null
          units: number | null
        }
        Insert: {
          asin?: string | null
          brand?: string | null
          category?: string | null
          grp?: string | null
          implied_price?: number | null
          is_variant?: boolean | null
          parent_asin?: string | null
          price?: number | null
          product_rank?: number | null
          rating?: number | null
          revenue?: number | null
          reviews?: number | null
          suspect?: boolean | null
          term?: string | null
          title?: string | null
          units?: number | null
        }
        Update: {
          asin?: string | null
          brand?: string | null
          category?: string | null
          grp?: string | null
          implied_price?: number | null
          is_variant?: boolean | null
          parent_asin?: string | null
          price?: number | null
          product_rank?: number | null
          rating?: number | null
          revenue?: number | null
          reviews?: number | null
          suspect?: boolean | null
          term?: string | null
          title?: string | null
          units?: number | null
        }
        Relationships: []
      }
      ni_candles_research: {
        Row: {
          fetched_at: string | null
          grp: string | null
          id: number
          kind: string | null
          payload: Json | null
          term: string | null
        }
        Insert: {
          fetched_at?: string | null
          grp?: string | null
          id?: number
          kind?: string | null
          payload?: Json | null
          term?: string | null
        }
        Update: {
          fetched_at?: string | null
          grp?: string | null
          id?: number
          kind?: string | null
          payload?: Json | null
          term?: string | null
        }
        Relationships: []
      }
      ni_v2_flat: {
        Row: {
          asin: string | null
          brand: string | null
          category: string | null
          counted_in_total: boolean | null
          data_quality_flag: boolean | null
          family_avg_price: number | null
          family_revenue: number | null
          family_units: number | null
          grp: string | null
          is_parent: boolean | null
          is_variant: boolean | null
          parent_asin: string | null
          price: number | null
          product_rank: number | null
          rating: number | null
          revenue: number | null
          reviews: number | null
          seq: number | null
          term: string | null
          title: string | null
          units: number | null
        }
        Insert: {
          asin?: string | null
          brand?: string | null
          category?: string | null
          counted_in_total?: boolean | null
          data_quality_flag?: boolean | null
          family_avg_price?: number | null
          family_revenue?: number | null
          family_units?: number | null
          grp?: string | null
          is_parent?: boolean | null
          is_variant?: boolean | null
          parent_asin?: string | null
          price?: number | null
          product_rank?: number | null
          rating?: number | null
          revenue?: number | null
          reviews?: number | null
          seq?: number | null
          term?: string | null
          title?: string | null
          units?: number | null
        }
        Update: {
          asin?: string | null
          brand?: string | null
          category?: string | null
          counted_in_total?: boolean | null
          data_quality_flag?: boolean | null
          family_avg_price?: number | null
          family_revenue?: number | null
          family_units?: number | null
          grp?: string | null
          is_parent?: boolean | null
          is_variant?: boolean | null
          parent_asin?: string | null
          price?: number | null
          product_rank?: number | null
          rating?: number | null
          revenue?: number | null
          reviews?: number | null
          seq?: number | null
          term?: string | null
          title?: string | null
          units?: number | null
        }
        Relationships: []
      }
      ni_v2_raw: {
        Row: {
          fetched_at: string | null
          payload: Json | null
          term: string | null
        }
        Insert: {
          fetched_at?: string | null
          payload?: Json | null
          term?: string | null
        }
        Update: {
          fetched_at?: string | null
          payload?: Json | null
          term?: string | null
        }
        Relationships: []
      }
      ni_v2_volumes: {
        Row: {
          grp: string | null
          search_volume: string | null
          seq: number | null
          term: string
        }
        Insert: {
          grp?: string | null
          search_volume?: string | null
          seq?: number | null
          term: string
        }
        Update: {
          grp?: string | null
          search_volume?: string | null
          seq?: number | null
          term?: string
        }
        Relationships: []
      }
      "NK_SB Multi Ad Group Campaigns": {
        Row: {
          acos: string | null
          ad_group_id: string | null
          ad_group_name: string | null
          ad_group_name_informational_only: string | null
          ad_group_serving_status_details_informational_only: string | null
          ad_group_serving_status_informational_only: string | null
          ad_id: string | null
          ad_name: string | null
          ad_serving_status_details_informational_only: string | null
          ad_serving_status_informational_only: string | null
          bid: string | null
          bid_optimisation: string | null
          brand_entity_id: string | null
          brand_logo_asset_id: string | null
          brand_logo_crop: string | null
          brand_logo_url_informational_only: string | null
          brand_name: string | null
          budget: string | null
          budget_type: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_name_informational_only: string | null
          campaign_serving_status_details_informational_only: string | null
          campaign_serving_status_informational_only: string | null
          campaign_state_informational_only: string | null
          click_through_rate: string | null
          clicks: string | null
          consent_to_translate: string | null
          conversion_rate: string | null
          cpc: string | null
          creationdate: string | null
          creative_asins: string | null
          creative_headline: string | null
          custom_images: string | null
          end_date: string | null
          entity: string | null
          impressions: string | null
          keyword_id: string | null
          keyword_text: string | null
          landing_page_asins: string | null
          landing_page_type: string | null
          landing_page_url: string | null
          match_type: string | null
          native_language_keyword: string | null
          native_language_locale: string | null
          operation: string | null
          orders: string | null
          original_video_asset_ids_informational_only: string | null
          percentage: string | null
          pk: string | null
          placement: string | null
          portfolio_id: string | null
          portfolio_name_informational_only: string | null
          product: string | null
          product_location: string | null
          product_targeting_expression: string | null
          product_targeting_id: string | null
          resolved_product_targeting_expression_informational_only:
            | string
            | null
          roas: string | null
          rule_based_budget_id_informational_only: string | null
          rule_based_budget_is_processing_informational_only: string | null
          rule_based_budget_name_informational_only: string | null
          rule_based_budget_value_informational_only: string | null
          sales: string | null
          sellercountry: string | null
          sellerentity: string | null
          sellername: string | null
          spend: string | null
          start_date: string | null
          state: string | null
          sub_pages: string | null
          units: string | null
          video_asset_ids: string | null
        }
        Insert: {
          acos?: string | null
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_group_name_informational_only?: string | null
          ad_group_serving_status_details_informational_only?: string | null
          ad_group_serving_status_informational_only?: string | null
          ad_id?: string | null
          ad_name?: string | null
          ad_serving_status_details_informational_only?: string | null
          ad_serving_status_informational_only?: string | null
          bid?: string | null
          bid_optimisation?: string | null
          brand_entity_id?: string | null
          brand_logo_asset_id?: string | null
          brand_logo_crop?: string | null
          brand_logo_url_informational_only?: string | null
          brand_name?: string | null
          budget?: string | null
          budget_type?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_name_informational_only?: string | null
          campaign_serving_status_details_informational_only?: string | null
          campaign_serving_status_informational_only?: string | null
          campaign_state_informational_only?: string | null
          click_through_rate?: string | null
          clicks?: string | null
          consent_to_translate?: string | null
          conversion_rate?: string | null
          cpc?: string | null
          creationdate?: string | null
          creative_asins?: string | null
          creative_headline?: string | null
          custom_images?: string | null
          end_date?: string | null
          entity?: string | null
          impressions?: string | null
          keyword_id?: string | null
          keyword_text?: string | null
          landing_page_asins?: string | null
          landing_page_type?: string | null
          landing_page_url?: string | null
          match_type?: string | null
          native_language_keyword?: string | null
          native_language_locale?: string | null
          operation?: string | null
          orders?: string | null
          original_video_asset_ids_informational_only?: string | null
          percentage?: string | null
          pk?: string | null
          placement?: string | null
          portfolio_id?: string | null
          portfolio_name_informational_only?: string | null
          product?: string | null
          product_location?: string | null
          product_targeting_expression?: string | null
          product_targeting_id?: string | null
          resolved_product_targeting_expression_informational_only?:
            | string
            | null
          roas?: string | null
          rule_based_budget_id_informational_only?: string | null
          rule_based_budget_is_processing_informational_only?: string | null
          rule_based_budget_name_informational_only?: string | null
          rule_based_budget_value_informational_only?: string | null
          sales?: string | null
          sellercountry?: string | null
          sellerentity?: string | null
          sellername?: string | null
          spend?: string | null
          start_date?: string | null
          state?: string | null
          sub_pages?: string | null
          units?: string | null
          video_asset_ids?: string | null
        }
        Update: {
          acos?: string | null
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_group_name_informational_only?: string | null
          ad_group_serving_status_details_informational_only?: string | null
          ad_group_serving_status_informational_only?: string | null
          ad_id?: string | null
          ad_name?: string | null
          ad_serving_status_details_informational_only?: string | null
          ad_serving_status_informational_only?: string | null
          bid?: string | null
          bid_optimisation?: string | null
          brand_entity_id?: string | null
          brand_logo_asset_id?: string | null
          brand_logo_crop?: string | null
          brand_logo_url_informational_only?: string | null
          brand_name?: string | null
          budget?: string | null
          budget_type?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_name_informational_only?: string | null
          campaign_serving_status_details_informational_only?: string | null
          campaign_serving_status_informational_only?: string | null
          campaign_state_informational_only?: string | null
          click_through_rate?: string | null
          clicks?: string | null
          consent_to_translate?: string | null
          conversion_rate?: string | null
          cpc?: string | null
          creationdate?: string | null
          creative_asins?: string | null
          creative_headline?: string | null
          custom_images?: string | null
          end_date?: string | null
          entity?: string | null
          impressions?: string | null
          keyword_id?: string | null
          keyword_text?: string | null
          landing_page_asins?: string | null
          landing_page_type?: string | null
          landing_page_url?: string | null
          match_type?: string | null
          native_language_keyword?: string | null
          native_language_locale?: string | null
          operation?: string | null
          orders?: string | null
          original_video_asset_ids_informational_only?: string | null
          percentage?: string | null
          pk?: string | null
          placement?: string | null
          portfolio_id?: string | null
          portfolio_name_informational_only?: string | null
          product?: string | null
          product_location?: string | null
          product_targeting_expression?: string | null
          product_targeting_id?: string | null
          resolved_product_targeting_expression_informational_only?:
            | string
            | null
          roas?: string | null
          rule_based_budget_id_informational_only?: string | null
          rule_based_budget_is_processing_informational_only?: string | null
          rule_based_budget_name_informational_only?: string | null
          rule_based_budget_value_informational_only?: string | null
          sales?: string | null
          sellercountry?: string | null
          sellerentity?: string | null
          sellername?: string | null
          spend?: string | null
          start_date?: string | null
          state?: string | null
          sub_pages?: string | null
          units?: string | null
          video_asset_ids?: string | null
        }
        Relationships: []
      }
      "NK_SP Search Term Report": {
        Row: {
          acos: string | null
          ad_group_id: string | null
          ad_group_name_informational_only: string | null
          bid: string | null
          campaign_id: string | null
          campaign_name_informational_only: string | null
          campaign_state_informational_only: string | null
          click_through_rate: string | null
          clicks: string | null
          conversion_rate: string | null
          cpc: string | null
          creationdate: string | null
          customer_search_term: string | null
          impressions: string | null
          keyword_id: string | null
          keyword_text: string | null
          match_type: string | null
          orders: string | null
          pk: string
          portfolio_name_informational_only: string | null
          product: string | null
          product_targeting_expression: string | null
          product_targeting_id: string | null
          resolved_product_targeting_expression_informational_only:
            | string
            | null
          roas: string | null
          sales: string | null
          sellercountry: string | null
          sellerentity: string | null
          sellername: string | null
          spend: string | null
          state: string | null
          units: string | null
        }
        Insert: {
          acos?: string | null
          ad_group_id?: string | null
          ad_group_name_informational_only?: string | null
          bid?: string | null
          campaign_id?: string | null
          campaign_name_informational_only?: string | null
          campaign_state_informational_only?: string | null
          click_through_rate?: string | null
          clicks?: string | null
          conversion_rate?: string | null
          cpc?: string | null
          creationdate?: string | null
          customer_search_term?: string | null
          impressions?: string | null
          keyword_id?: string | null
          keyword_text?: string | null
          match_type?: string | null
          orders?: string | null
          pk?: string
          portfolio_name_informational_only?: string | null
          product?: string | null
          product_targeting_expression?: string | null
          product_targeting_id?: string | null
          resolved_product_targeting_expression_informational_only?:
            | string
            | null
          roas?: string | null
          sales?: string | null
          sellercountry?: string | null
          sellerentity?: string | null
          sellername?: string | null
          spend?: string | null
          state?: string | null
          units?: string | null
        }
        Update: {
          acos?: string | null
          ad_group_id?: string | null
          ad_group_name_informational_only?: string | null
          bid?: string | null
          campaign_id?: string | null
          campaign_name_informational_only?: string | null
          campaign_state_informational_only?: string | null
          click_through_rate?: string | null
          clicks?: string | null
          conversion_rate?: string | null
          cpc?: string | null
          creationdate?: string | null
          customer_search_term?: string | null
          impressions?: string | null
          keyword_id?: string | null
          keyword_text?: string | null
          match_type?: string | null
          orders?: string | null
          pk?: string
          portfolio_name_informational_only?: string | null
          product?: string | null
          product_targeting_expression?: string | null
          product_targeting_id?: string | null
          resolved_product_targeting_expression_informational_only?:
            | string
            | null
          roas?: string | null
          sales?: string | null
          sellercountry?: string | null
          sellerentity?: string | null
          sellername?: string | null
          spend?: string | null
          state?: string | null
          units?: string | null
        }
        Relationships: []
      }
      "NK_Sponsored Brands campaigns": {
        Row: {
          acos: string | null
          ad_format: string | null
          ad_format_informational_only: string | null
          ad_group_id: string | null
          bid: string | null
          bid_multiplier: string | null
          bid_optimisation: string | null
          brand_entity_id: string | null
          brand_logo_asset_id: string | null
          brand_logo_url_informational_only: string | null
          brand_name: string | null
          budget: string | null
          budget_type: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_name_informational_only: string | null
          campaign_serving_status_informational_only: string | null
          campaign_state_informational_only: string | null
          click_through_rate: string | null
          clicks: string | null
          conversion_rate: string | null
          cpc: string | null
          creationdate: string | null
          creative_asins: string | null
          creative_headline: string | null
          creative_type: string | null
          custom_image_asset_id: string | null
          draft_campaign_id: string | null
          end_date: string | null
          entity: string | null
          impressions: string | null
          keyword_id: string | null
          keyword_text: string | null
          landing_page_asins: string | null
          landing_page_type_informational_only: string | null
          landing_page_url: string | null
          match_type: string | null
          operation: string | null
          orders: string | null
          pk: string
          portfolio_id: string | null
          portfolio_name_informational_only: string | null
          product: string | null
          product_targeting_expression: string | null
          product_targeting_id: string | null
          resolved_product_targeting_expression_informational_only:
            | string
            | null
          roas: string | null
          sales: string | null
          sellercountry: string | null
          sellerentity: string | null
          sellername: string | null
          spend: string | null
          start_date: string | null
          state: string | null
          units: string | null
          video_media_ids: string | null
        }
        Insert: {
          acos?: string | null
          ad_format?: string | null
          ad_format_informational_only?: string | null
          ad_group_id?: string | null
          bid?: string | null
          bid_multiplier?: string | null
          bid_optimisation?: string | null
          brand_entity_id?: string | null
          brand_logo_asset_id?: string | null
          brand_logo_url_informational_only?: string | null
          brand_name?: string | null
          budget?: string | null
          budget_type?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_name_informational_only?: string | null
          campaign_serving_status_informational_only?: string | null
          campaign_state_informational_only?: string | null
          click_through_rate?: string | null
          clicks?: string | null
          conversion_rate?: string | null
          cpc?: string | null
          creationdate?: string | null
          creative_asins?: string | null
          creative_headline?: string | null
          creative_type?: string | null
          custom_image_asset_id?: string | null
          draft_campaign_id?: string | null
          end_date?: string | null
          entity?: string | null
          impressions?: string | null
          keyword_id?: string | null
          keyword_text?: string | null
          landing_page_asins?: string | null
          landing_page_type_informational_only?: string | null
          landing_page_url?: string | null
          match_type?: string | null
          operation?: string | null
          orders?: string | null
          pk?: string
          portfolio_id?: string | null
          portfolio_name_informational_only?: string | null
          product?: string | null
          product_targeting_expression?: string | null
          product_targeting_id?: string | null
          resolved_product_targeting_expression_informational_only?:
            | string
            | null
          roas?: string | null
          sales?: string | null
          sellercountry?: string | null
          sellerentity?: string | null
          sellername?: string | null
          spend?: string | null
          start_date?: string | null
          state?: string | null
          units?: string | null
          video_media_ids?: string | null
        }
        Update: {
          acos?: string | null
          ad_format?: string | null
          ad_format_informational_only?: string | null
          ad_group_id?: string | null
          bid?: string | null
          bid_multiplier?: string | null
          bid_optimisation?: string | null
          brand_entity_id?: string | null
          brand_logo_asset_id?: string | null
          brand_logo_url_informational_only?: string | null
          brand_name?: string | null
          budget?: string | null
          budget_type?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_name_informational_only?: string | null
          campaign_serving_status_informational_only?: string | null
          campaign_state_informational_only?: string | null
          click_through_rate?: string | null
          clicks?: string | null
          conversion_rate?: string | null
          cpc?: string | null
          creationdate?: string | null
          creative_asins?: string | null
          creative_headline?: string | null
          creative_type?: string | null
          custom_image_asset_id?: string | null
          draft_campaign_id?: string | null
          end_date?: string | null
          entity?: string | null
          impressions?: string | null
          keyword_id?: string | null
          keyword_text?: string | null
          landing_page_asins?: string | null
          landing_page_type_informational_only?: string | null
          landing_page_url?: string | null
          match_type?: string | null
          operation?: string | null
          orders?: string | null
          pk?: string
          portfolio_id?: string | null
          portfolio_name_informational_only?: string | null
          product?: string | null
          product_targeting_expression?: string | null
          product_targeting_id?: string | null
          resolved_product_targeting_expression_informational_only?:
            | string
            | null
          roas?: string | null
          sales?: string | null
          sellercountry?: string | null
          sellerentity?: string | null
          sellername?: string | null
          spend?: string | null
          start_date?: string | null
          state?: string | null
          units?: string | null
          video_media_ids?: string | null
        }
        Relationships: []
      }
      "NK_Sponsored Products Campaigns": {
        Row: {
          acos: string | null
          ad_group_default_bid: string | null
          ad_group_default_bid_informational_only: string | null
          ad_group_id: string | null
          ad_group_name: string | null
          ad_group_name_informational_only: string | null
          ad_group_state_informational_only: string | null
          ad_id: string | null
          asin_informational_only: string | null
          audience_id: string | null
          bid: string | null
          bidding_strategy: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_name_informational_only: string | null
          campaign_state_informational_only: string | null
          click_through_rate: string | null
          clicks: string | null
          conversion_rate: string | null
          cpc: string | null
          creationdate: string | null
          daily_budget: string | null
          eligibility_status_informational_only: string | null
          end_date: string | null
          entity: string | null
          impressions: string | null
          keyword_id: string | null
          keyword_text: string | null
          match_type: string | null
          native_language_keyword: string | null
          native_language_locale: string | null
          operation: string | null
          orders: string | null
          percentage: string | null
          pk: string
          placement: string | null
          portfolio_id: string | null
          portfolio_name_informational_only: string | null
          product: string | null
          product_targeting_expression: string | null
          product_targeting_id: string | null
          reason_for_ineligibility_informational_only: string | null
          resolved_product_targeting_expression_informational_only:
            | string
            | null
          roas: string | null
          sales: string | null
          sellercountry: string | null
          sellerentity: string | null
          sellername: string | null
          shopper_cohort_percentage: string | null
          shopper_cohort_type: string | null
          sku: string | null
          spend: string | null
          start_date: string | null
          state: string | null
          targeting_type: string | null
          units: string | null
        }
        Insert: {
          acos?: string | null
          ad_group_default_bid?: string | null
          ad_group_default_bid_informational_only?: string | null
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_group_name_informational_only?: string | null
          ad_group_state_informational_only?: string | null
          ad_id?: string | null
          asin_informational_only?: string | null
          audience_id?: string | null
          bid?: string | null
          bidding_strategy?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_name_informational_only?: string | null
          campaign_state_informational_only?: string | null
          click_through_rate?: string | null
          clicks?: string | null
          conversion_rate?: string | null
          cpc?: string | null
          creationdate?: string | null
          daily_budget?: string | null
          eligibility_status_informational_only?: string | null
          end_date?: string | null
          entity?: string | null
          impressions?: string | null
          keyword_id?: string | null
          keyword_text?: string | null
          match_type?: string | null
          native_language_keyword?: string | null
          native_language_locale?: string | null
          operation?: string | null
          orders?: string | null
          percentage?: string | null
          pk?: string
          placement?: string | null
          portfolio_id?: string | null
          portfolio_name_informational_only?: string | null
          product?: string | null
          product_targeting_expression?: string | null
          product_targeting_id?: string | null
          reason_for_ineligibility_informational_only?: string | null
          resolved_product_targeting_expression_informational_only?:
            | string
            | null
          roas?: string | null
          sales?: string | null
          sellercountry?: string | null
          sellerentity?: string | null
          sellername?: string | null
          shopper_cohort_percentage?: string | null
          shopper_cohort_type?: string | null
          sku?: string | null
          spend?: string | null
          start_date?: string | null
          state?: string | null
          targeting_type?: string | null
          units?: string | null
        }
        Update: {
          acos?: string | null
          ad_group_default_bid?: string | null
          ad_group_default_bid_informational_only?: string | null
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_group_name_informational_only?: string | null
          ad_group_state_informational_only?: string | null
          ad_id?: string | null
          asin_informational_only?: string | null
          audience_id?: string | null
          bid?: string | null
          bidding_strategy?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_name_informational_only?: string | null
          campaign_state_informational_only?: string | null
          click_through_rate?: string | null
          clicks?: string | null
          conversion_rate?: string | null
          cpc?: string | null
          creationdate?: string | null
          daily_budget?: string | null
          eligibility_status_informational_only?: string | null
          end_date?: string | null
          entity?: string | null
          impressions?: string | null
          keyword_id?: string | null
          keyword_text?: string | null
          match_type?: string | null
          native_language_keyword?: string | null
          native_language_locale?: string | null
          operation?: string | null
          orders?: string | null
          percentage?: string | null
          pk?: string
          placement?: string | null
          portfolio_id?: string | null
          portfolio_name_informational_only?: string | null
          product?: string | null
          product_targeting_expression?: string | null
          product_targeting_id?: string | null
          reason_for_ineligibility_informational_only?: string | null
          resolved_product_targeting_expression_informational_only?:
            | string
            | null
          roas?: string | null
          sales?: string | null
          sellercountry?: string | null
          sellerentity?: string | null
          sellername?: string | null
          shopper_cohort_percentage?: string | null
          shopper_cohort_type?: string | null
          sku?: string | null
          spend?: string | null
          start_date?: string | null
          state?: string | null
          targeting_type?: string | null
          units?: string | null
        }
        Relationships: []
      }
      pending_negatives: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          ad_group_name: string | null
          campaign_id: number
          campaign_name: string | null
          created_at: string
          error_message: string | null
          id: number
          keyword_text: string
          lookback_window: string | null
          match_type: string
          negative_type: string
          profile_id: number
          pushed_at: string | null
          rule_triggered: string
          source_acos: number | null
          source_clicks: number | null
          source_orders: number | null
          source_sales: number | null
          source_spend: number | null
          status: string
          target_level: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          ad_group_name?: string | null
          campaign_id: number
          campaign_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: never
          keyword_text: string
          lookback_window?: string | null
          match_type?: string
          negative_type?: string
          profile_id: number
          pushed_at?: string | null
          rule_triggered: string
          source_acos?: number | null
          source_clicks?: number | null
          source_orders?: number | null
          source_sales?: number | null
          source_spend?: number | null
          status?: string
          target_level?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          ad_group_name?: string | null
          campaign_id?: number
          campaign_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: never
          keyword_text?: string
          lookback_window?: string | null
          match_type?: string
          negative_type?: string
          profile_id?: number
          pushed_at?: string | null
          rule_triggered?: string
          source_acos?: number | null
          source_clicks?: number | null
          source_orders?: number | null
          source_sales?: number | null
          source_spend?: number | null
          status?: string
          target_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_anomaly_alerts: {
        Row: {
          account_name: string
          acknowledged_at: string | null
          anomaly_type: string
          created_at: string
          current_value: number
          detection_date: string
          id: string
          merchant_token: string | null
          message: string
          metadata: Json | null
          metric_name: string
          notified_at: string | null
          percentage_change: number
          previous_value: number
          resolved_at: string | null
          severity: string
          status: string
          threshold_breached: number
          updated_at: string
        }
        Insert: {
          account_name: string
          acknowledged_at?: string | null
          anomaly_type: string
          created_at?: string
          current_value: number
          detection_date?: string
          id?: string
          merchant_token?: string | null
          message: string
          metadata?: Json | null
          metric_name: string
          notified_at?: string | null
          percentage_change: number
          previous_value: number
          resolved_at?: string | null
          severity: string
          status?: string
          threshold_breached: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          acknowledged_at?: string | null
          anomaly_type?: string
          created_at?: string
          current_value?: number
          detection_date?: string
          id?: string
          merchant_token?: string | null
          message?: string
          metadata?: Json | null
          metric_name?: string
          notified_at?: string | null
          percentage_change?: number
          previous_value?: number
          resolved_at?: string | null
          severity?: string
          status?: string
          threshold_breached?: number
          updated_at?: string
        }
        Relationships: []
      }
      perplexity_all_listings_stockprice_data: {
        Row: {
          account_name: string
          asin: string | null
          created_at: string | null
          fulfillment_channel: string | null
          id: string
          item_name: string | null
          open_date: string | null
          price: number | null
          quantity: number | null
          record_date: string
          seller_sku: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          asin?: string | null
          created_at?: string | null
          fulfillment_channel?: string | null
          id?: string
          item_name?: string | null
          open_date?: string | null
          price?: number | null
          quantity?: number | null
          record_date: string
          seller_sku?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          asin?: string | null
          created_at?: string | null
          fulfillment_channel?: string | null
          id?: string
          item_name?: string | null
          open_date?: string | null
          price?: number | null
          quantity?: number | null
          record_date?: string
          seller_sku?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      perplexity_asin_performance: {
        Row: {
          account_name: string | null
          browser_page_views: number | null
          buy_box_percentage: number | null
          child_asin: string | null
          created_at: string
          datasource: string
          id: string
          last_synced_at: string | null
          ordered_product_sales_amount: number | null
          ordered_product_sales_currency: string | null
          parent_asin: string | null
          record_date: string
          unit_session_percentage: number | null
          units_ordered: number | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          browser_page_views?: number | null
          buy_box_percentage?: number | null
          child_asin?: string | null
          created_at?: string
          datasource: string
          id?: string
          last_synced_at?: string | null
          ordered_product_sales_amount?: number | null
          ordered_product_sales_currency?: string | null
          parent_asin?: string | null
          record_date: string
          unit_session_percentage?: number | null
          units_ordered?: number | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          browser_page_views?: number | null
          buy_box_percentage?: number | null
          child_asin?: string | null
          created_at?: string
          datasource?: string
          id?: string
          last_synced_at?: string | null
          ordered_product_sales_amount?: number | null
          ordered_product_sales_currency?: string | null
          parent_asin?: string | null
          record_date?: string
          unit_session_percentage?: number | null
          units_ordered?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      perplexity_ppc_campaigns: {
        Row: {
          account_id: string
          account_name: string
          attributed_sales_14d: number | null
          clicks: number | null
          cost: number | null
          cpc: number | null
          created_at: string | null
          ctr: number | null
          datasource: string
          id: string
          impressions: number | null
          last_synced_at: string | null
          record_date: string
          source: string
        }
        Insert: {
          account_id: string
          account_name: string
          attributed_sales_14d?: number | null
          clicks?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          datasource: string
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          record_date: string
          source: string
        }
        Update: {
          account_id?: string
          account_name?: string
          attributed_sales_14d?: number | null
          clicks?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          datasource?: string
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          record_date?: string
          source?: string
        }
        Relationships: []
      }
      perplexity_sales_data: {
        Row: {
          account_id: string | null
          account_name: string | null
          browser_pageviews: number | null
          browser_sessions: number | null
          buybox_percentage: number | null
          created_at: string | null
          datasource: string | null
          id: string
          negative_feedback_received: number | null
          ordered_product_sales_amount: number | null
          ordered_product_sales_currency: string | null
          record_date: string | null
          source: string | null
          unit_session_percentage: number | null
          units_ordered: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          browser_pageviews?: number | null
          browser_sessions?: number | null
          buybox_percentage?: number | null
          created_at?: string | null
          datasource?: string | null
          id?: string
          negative_feedback_received?: number | null
          ordered_product_sales_amount?: number | null
          ordered_product_sales_currency?: string | null
          record_date?: string | null
          source?: string | null
          unit_session_percentage?: number | null
          units_ordered?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          browser_pageviews?: number | null
          browser_sessions?: number | null
          buybox_percentage?: number | null
          created_at?: string | null
          datasource?: string | null
          id?: string
          negative_feedback_received?: number | null
          ordered_product_sales_amount?: number | null
          ordered_product_sales_currency?: string | null
          record_date?: string | null
          source?: string | null
          unit_session_percentage?: number | null
          units_ordered?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      perplexity_vendor_daily_sales: {
        Row: {
          account_name: string
          asin: string | null
          created_at: string | null
          datasource: string | null
          date: string | null
          id: string
          record_date: string
          shippedcogs_amount: number | null
          shippedcogs_currencycode: string | null
          shippedrevenue_amount: number | null
          shippedrevenue_currencycode: string | null
          shippedunits: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          asin?: string | null
          created_at?: string | null
          datasource?: string | null
          date?: string | null
          id?: string
          record_date: string
          shippedcogs_amount?: number | null
          shippedcogs_currencycode?: string | null
          shippedrevenue_amount?: number | null
          shippedrevenue_currencycode?: string | null
          shippedunits?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          asin?: string | null
          created_at?: string | null
          datasource?: string | null
          date?: string | null
          id?: string
          record_date?: string
          shippedcogs_amount?: number | null
          shippedcogs_currencycode?: string | null
          shippedrevenue_amount?: number | null
          shippedrevenue_currencycode?: string | null
          shippedunits?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pipeline_build_log: {
        Row: {
          artifact_links: Json | null
          category: string | null
          created_at: string | null
          decisions: Json | null
          detail: string | null
          files_created: Json | null
          hurdles: Json | null
          id: number
          next_steps: Json | null
          session_date: string
          session_id: string | null
          title: string
        }
        Insert: {
          artifact_links?: Json | null
          category?: string | null
          created_at?: string | null
          decisions?: Json | null
          detail?: string | null
          files_created?: Json | null
          hurdles?: Json | null
          id?: number
          next_steps?: Json | null
          session_date?: string
          session_id?: string | null
          title: string
        }
        Update: {
          artifact_links?: Json | null
          category?: string | null
          created_at?: string | null
          decisions?: Json | null
          detail?: string | null
          files_created?: Json | null
          hurdles?: Json | null
          id?: number
          next_steps?: Json | null
          session_date?: string
          session_id?: string | null
          title?: string
        }
        Relationships: []
      }
      pipeline_session_cache: {
        Row: {
          asin: string | null
          created_at: string | null
          id: number
          payload: Json
          session_id: string
          stage: string
        }
        Insert: {
          asin?: string | null
          created_at?: string | null
          id?: number
          payload: Json
          session_id: string
          stage: string
        }
        Update: {
          asin?: string | null
          created_at?: string | null
          id?: number
          payload?: Json
          session_id?: string
          stage?: string
        }
        Relationships: []
      }
      ppc_monthly_performance: {
        Row: {
          acos: number | null
          ad_cost_pct: number | null
          ad_sales: number | null
          ad_sales_pct: number | null
          ad_spend: number | null
          clicks: number | null
          client_name: string
          conversion_rate: number | null
          cpc: number | null
          created_at: string | null
          ctr: number | null
          currency: string
          id: string
          impressions: number | null
          marketplace: string
          month: string
          organic_sales: number | null
          overall_sales: number | null
          overall_sales_cogs: number | null
          page_views: number | null
          platform: string
          return_rate: number | null
          returns: number | null
          revenue: number | null
          roas: number | null
          sales_same_period_ly: number | null
          sessions: number | null
          tacop: number | null
          tacos: number | null
          unit_sales: number | null
          units_sold: number | null
          updated_at: string | null
        }
        Insert: {
          acos?: number | null
          ad_cost_pct?: number | null
          ad_sales?: number | null
          ad_sales_pct?: number | null
          ad_spend?: number | null
          clicks?: number | null
          client_name: string
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          currency?: string
          id?: string
          impressions?: number | null
          marketplace: string
          month: string
          organic_sales?: number | null
          overall_sales?: number | null
          overall_sales_cogs?: number | null
          page_views?: number | null
          platform?: string
          return_rate?: number | null
          returns?: number | null
          revenue?: number | null
          roas?: number | null
          sales_same_period_ly?: number | null
          sessions?: number | null
          tacop?: number | null
          tacos?: number | null
          unit_sales?: number | null
          units_sold?: number | null
          updated_at?: string | null
        }
        Update: {
          acos?: number | null
          ad_cost_pct?: number | null
          ad_sales?: number | null
          ad_sales_pct?: number | null
          ad_spend?: number | null
          clicks?: number | null
          client_name?: string
          conversion_rate?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          currency?: string
          id?: string
          impressions?: number | null
          marketplace?: string
          month?: string
          organic_sales?: number | null
          overall_sales?: number | null
          overall_sales_cogs?: number | null
          page_views?: number | null
          platform?: string
          return_rate?: number | null
          returns?: number | null
          revenue?: number | null
          roas?: number | null
          sales_same_period_ly?: number | null
          sessions?: number | null
          tacop?: number | null
          tacos?: number | null
          unit_sales?: number | null
          units_sold?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ppc_seller_names: {
        Row: {
          created_at: string | null
          id: string
          sellername: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sellername: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sellername?: string
        }
        Relationships: []
      }
      product_snapshots: {
        Row: {
          asin: string
          availability: string | null
          bought_past_month: string | null
          brand: string | null
          buybox_seller: string | null
          domain: string
          feature_bullets: Json | null
          id: string
          images_json: Json | null
          is_amazon_sold: boolean | null
          original_price: number | null
          price: number | null
          rating: number | null
          raw_response: Json | null
          reviews_count: number | null
          reviews_json: Json | null
          snapshot_at: string | null
          title: string | null
          variants_json: Json | null
        }
        Insert: {
          asin: string
          availability?: string | null
          bought_past_month?: string | null
          brand?: string | null
          buybox_seller?: string | null
          domain?: string
          feature_bullets?: Json | null
          id?: string
          images_json?: Json | null
          is_amazon_sold?: boolean | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          raw_response?: Json | null
          reviews_count?: number | null
          reviews_json?: Json | null
          snapshot_at?: string | null
          title?: string | null
          variants_json?: Json | null
        }
        Update: {
          asin?: string
          availability?: string | null
          bought_past_month?: string | null
          brand?: string | null
          buybox_seller?: string | null
          domain?: string
          feature_bullets?: Json | null
          id?: string
          images_json?: Json | null
          is_amazon_sold?: boolean | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          raw_response?: Json | null
          reviews_count?: number | null
          reviews_json?: Json | null
          snapshot_at?: string | null
          title?: string | null
          variants_json?: Json | null
        }
        Relationships: []
      }
      project_schedule: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          client_name: string
          created_at: string | null
          id: string
          notes: string | null
          project_type: string
          status: string
          updated_at: string | null
          week_start: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string | null
          id?: string
          notes?: string | null
          project_type?: string
          status?: string
          updated_at?: string | null
          week_start: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          project_type?: string
          status?: string
          updated_at?: string | null
          week_start?: string
        }
        Relationships: []
      }
      pw_ad_spend: {
        Row: {
          account_name: string
          child_asin: string
          clicks_30d: number | null
          last_ad_date: string | null
          orders_7d: number | null
          profile_id: number | null
          refreshed_at: string | null
          spend_30d: number | null
          spend_7d: number | null
        }
        Insert: {
          account_name: string
          child_asin: string
          clicks_30d?: number | null
          last_ad_date?: string | null
          orders_7d?: number | null
          profile_id?: number | null
          refreshed_at?: string | null
          spend_30d?: number | null
          spend_7d?: number | null
        }
        Update: {
          account_name?: string
          child_asin?: string
          clicks_30d?: number | null
          last_ad_date?: string | null
          orders_7d?: number | null
          profile_id?: number | null
          refreshed_at?: string | null
          spend_30d?: number | null
          spend_7d?: number | null
        }
        Relationships: []
      }
      pw_availability: {
        Row: {
          account_name: string
          buyable: boolean | null
          checked_at: string | null
          child_asin: string
          country_code: string
          currency: string | null
          has_featured_offer: boolean | null
          listing_price: number | null
          offer_count: number | null
          raw: Json | null
          record_date: string
          source: string | null
        }
        Insert: {
          account_name: string
          buyable?: boolean | null
          checked_at?: string | null
          child_asin: string
          country_code: string
          currency?: string | null
          has_featured_offer?: boolean | null
          listing_price?: number | null
          offer_count?: number | null
          raw?: Json | null
          record_date: string
          source?: string | null
        }
        Update: {
          account_name?: string
          buyable?: boolean | null
          checked_at?: string | null
          child_asin?: string
          country_code?: string
          currency?: string | null
          has_featured_offer?: boolean | null
          listing_price?: number | null
          offer_count?: number | null
          raw?: Json | null
          record_date?: string
          source?: string | null
        }
        Relationships: []
      }
      pw_buybox: {
        Row: {
          asin: string
          buybox_price: number | null
          checked_at: string | null
          country_code: string | null
          http_status: number | null
          is_fba: boolean | null
          marketplace_id: string
          offer_count: number | null
          record_date: string
          winner_class: string | null
          winner_seller_id: string | null
        }
        Insert: {
          asin: string
          buybox_price?: number | null
          checked_at?: string | null
          country_code?: string | null
          http_status?: number | null
          is_fba?: boolean | null
          marketplace_id: string
          offer_count?: number | null
          record_date: string
          winner_class?: string | null
          winner_seller_id?: string | null
        }
        Update: {
          asin?: string
          buybox_price?: number | null
          checked_at?: string | null
          country_code?: string | null
          http_status?: number | null
          is_fba?: boolean | null
          marketplace_id?: string
          offer_count?: number | null
          record_date?: string
          winner_class?: string | null
          winner_seller_id?: string | null
        }
        Relationships: []
      }
      pw_catalog: {
        Row: {
          account_name: string
          child_asin: string
          colour: string | null
          country_code: string
          http_status: number | null
          is_sized: boolean | null
          item_name: string | null
          marketplace_id: string | null
          parent_asin: string | null
          part_number: string | null
          refreshed_at: string | null
          size_norm: string | null
          size_rank: number | null
          size_raw: string | null
          style_code: string | null
          style_key: string | null
          style_name: string | null
          variation_theme: string | null
        }
        Insert: {
          account_name: string
          child_asin: string
          colour?: string | null
          country_code: string
          http_status?: number | null
          is_sized?: boolean | null
          item_name?: string | null
          marketplace_id?: string | null
          parent_asin?: string | null
          part_number?: string | null
          refreshed_at?: string | null
          size_norm?: string | null
          size_rank?: number | null
          size_raw?: string | null
          style_code?: string | null
          style_key?: string | null
          style_name?: string | null
          variation_theme?: string | null
        }
        Update: {
          account_name?: string
          child_asin?: string
          colour?: string | null
          country_code?: string
          http_status?: number | null
          is_sized?: boolean | null
          item_name?: string | null
          marketplace_id?: string | null
          parent_asin?: string | null
          part_number?: string | null
          refreshed_at?: string | null
          size_norm?: string | null
          size_rank?: number | null
          size_raw?: string | null
          style_code?: string | null
          style_key?: string | null
          style_name?: string | null
          variation_theme?: string | null
        }
        Relationships: []
      }
      pw_config: {
        Row: {
          auto_reenable: boolean
          id: number
          min_spend_7d: number
          threshold_pct: number
          updated_at: string | null
        }
        Insert: {
          auto_reenable?: boolean
          id?: number
          min_spend_7d?: number
          threshold_pct?: number
          updated_at?: string | null
        }
        Update: {
          auto_reenable?: boolean
          id?: number
          min_spend_7d?: number
          threshold_pct?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      pw_pause_queue: {
        Row: {
          account_name: string
          child_asins: string[] | null
          colour: string | null
          country_code: string
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          detail: Json | null
          exec_result: Json | null
          executed_at: string | null
          id: string
          parent_asin: string | null
          pct_available: number | null
          sizes_available: number | null
          sizes_available_list: string | null
          sizes_dead_list: string | null
          sizes_total: number | null
          spend_30d: number | null
          spend_7d: number | null
          status: string
          style_key: string
          style_name: string | null
          threshold_pct: number | null
        }
        Insert: {
          account_name: string
          child_asins?: string[] | null
          colour?: string | null
          country_code: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          detail?: Json | null
          exec_result?: Json | null
          executed_at?: string | null
          id?: string
          parent_asin?: string | null
          pct_available?: number | null
          sizes_available?: number | null
          sizes_available_list?: string | null
          sizes_dead_list?: string | null
          sizes_total?: number | null
          spend_30d?: number | null
          spend_7d?: number | null
          status?: string
          style_key: string
          style_name?: string | null
          threshold_pct?: number | null
        }
        Update: {
          account_name?: string
          child_asins?: string[] | null
          colour?: string | null
          country_code?: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          detail?: Json | null
          exec_result?: Json | null
          executed_at?: string | null
          id?: string
          parent_asin?: string | null
          pct_available?: number | null
          sizes_available?: number | null
          sizes_available_list?: string | null
          sizes_dead_list?: string | null
          sizes_total?: number | null
          spend_30d?: number | null
          spend_7d?: number | null
          status?: string
          style_key?: string
          style_name?: string | null
          threshold_pct?: number | null
        }
        Relationships: []
      }
      pw_product_map: {
        Row: {
          colour: string | null
          confidence: string | null
          country_code: string
          created_at: string | null
          id: string
          match_key: string | null
          match_tier: string | null
          seller_asin: string | null
          seller_sku: string | null
          size_norm: string | null
          style_code: string | null
          vendor_asin: string | null
        }
        Insert: {
          colour?: string | null
          confidence?: string | null
          country_code: string
          created_at?: string | null
          id?: string
          match_key?: string | null
          match_tier?: string | null
          seller_asin?: string | null
          seller_sku?: string | null
          size_norm?: string | null
          style_code?: string | null
          vendor_asin?: string | null
        }
        Update: {
          colour?: string | null
          confidence?: string | null
          country_code?: string
          created_at?: string | null
          id?: string
          match_key?: string | null
          match_tier?: string | null
          seller_asin?: string | null
          seller_sku?: string | null
          size_norm?: string | null
          style_code?: string | null
          vendor_asin?: string | null
        }
        Relationships: []
      }
      pw_seller_names: {
        Row: {
          first_seen: string | null
          klass: string
          name: string | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          first_seen?: string | null
          klass?: string
          name?: string | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          first_seen?: string | null
          klass?: string
          name?: string | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pw_size_demand: {
        Row: {
          account_name: string
          avg_share_pct: number | null
          colour: string | null
          refreshed_at: string | null
          share_pct: number | null
          size_norm: string
          size_rank: number | null
          style_key: string
          style_name: string | null
          style_units: number | null
          units: number | null
          weight_mult: number | null
        }
        Insert: {
          account_name: string
          avg_share_pct?: number | null
          colour?: string | null
          refreshed_at?: string | null
          share_pct?: number | null
          size_norm: string
          size_rank?: number | null
          style_key: string
          style_name?: string | null
          style_units?: number | null
          units?: number | null
          weight_mult?: number | null
        }
        Update: {
          account_name?: string
          avg_share_pct?: number | null
          colour?: string | null
          refreshed_at?: string | null
          share_pct?: number | null
          size_norm?: string
          size_rank?: number | null
          style_key?: string
          style_name?: string | null
          style_units?: number | null
          units?: number | null
          weight_mult?: number | null
        }
        Relationships: []
      }
      pw_switch_queue: {
        Row: {
          amazon_sizes: number | null
          colour: string | null
          competitor_name: string | null
          competitor_sizes: number | null
          country_code: string
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          detail: Json | null
          dominance_pct: number | null
          exec_result: Json | null
          executed_at: string | null
          id: string
          misallocated_spend_30d: number | null
          nobody_sizes: number | null
          recommended: string | null
          s_ad: boolean | null
          s_spend30: number | null
          seller_asins: string[] | null
          sizes_checked: number | null
          sizes_total: number | null
          status: string
          style_code: string | null
          style_key: string
          style_name: string | null
          v_ad: boolean | null
          v_spend30: number | null
          vendor_asins: string[] | null
          wwd_sizes: number | null
        }
        Insert: {
          amazon_sizes?: number | null
          colour?: string | null
          competitor_name?: string | null
          competitor_sizes?: number | null
          country_code?: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          detail?: Json | null
          dominance_pct?: number | null
          exec_result?: Json | null
          executed_at?: string | null
          id?: string
          misallocated_spend_30d?: number | null
          nobody_sizes?: number | null
          recommended?: string | null
          s_ad?: boolean | null
          s_spend30?: number | null
          seller_asins?: string[] | null
          sizes_checked?: number | null
          sizes_total?: number | null
          status?: string
          style_code?: string | null
          style_key: string
          style_name?: string | null
          v_ad?: boolean | null
          v_spend30?: number | null
          vendor_asins?: string[] | null
          wwd_sizes?: number | null
        }
        Update: {
          amazon_sizes?: number | null
          colour?: string | null
          competitor_name?: string | null
          competitor_sizes?: number | null
          country_code?: string
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          detail?: Json | null
          dominance_pct?: number | null
          exec_result?: Json | null
          executed_at?: string | null
          id?: string
          misallocated_spend_30d?: number | null
          nobody_sizes?: number | null
          recommended?: string | null
          s_ad?: boolean | null
          s_spend30?: number | null
          seller_asins?: string[] | null
          sizes_checked?: number | null
          sizes_total?: number | null
          status?: string
          style_code?: string | null
          style_key?: string
          style_name?: string | null
          v_ad?: boolean | null
          v_spend30?: number | null
          vendor_asins?: string[] | null
          wwd_sizes?: number | null
        }
        Relationships: []
      }
      python_financial_raw: {
        Row: {
          advertising_cost_of_sales_acos_change_of_totals_sales_revenue_v:
            | string
            | null
          advertising_cost_of_sales_acos_change_vs_previous_period:
            | string
            | null
          advertising_cost_of_sales_acos_net_units_sold: string | null
          advertising_cost_of_sales_acos_per_unit: string | null
          advertising_cost_of_sales_acos_percentage_of_total_sales_revenu:
            | string
            | null
          advertising_cost_of_sales_acos_total: string | null
          base_fulfilment_by_amazon_fulfilment_fees_change_of_totals_sale:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_change_vs_previous_pe:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_fee_promotions_applie:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_per_unit: string | null
          base_fulfilment_by_amazon_fulfilment_fees_percentage_of_total_s:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_taxes_on_fees: string | null
          base_fulfilment_by_amazon_fulfilment_fees_total: string | null
          base_fulfilment_by_amazon_fulfilment_fees_units_charged: string | null
          brand: string
          cost_of_goods_sold_seller_provided_change_of_totals_sales_reven:
            | string
            | null
          cost_of_goods_sold_seller_provided_change_vs_previous_period:
            | string
            | null
          cost_of_goods_sold_seller_provided_net_units_sold: string | null
          cost_of_goods_sold_seller_provided_per_unit: string | null
          cost_of_goods_sold_seller_provided_percentage_of_total_sales_re:
            | string
            | null
          cost_of_goods_sold_seller_provided_total: string | null
          daily_deal_fees_change_of_totals_sales_revenue_vs_previous_peri:
            | string
            | null
          daily_deal_fees_fee_promotions_applied: string | null
          daily_deal_fees_per_unit: string | null
          daily_deal_fees_percentage_of_total_sales_revenue: string | null
          daily_deal_fees_taxes_on_fees: string | null
          daily_deal_fees_total: string | null
          daily_deal_fees_units_charged: string | null
          deal_performance_based_fees_change_of_totals_sales_revenue_vs_p:
            | string
            | null
          deal_performance_based_fees_fee_promotions_applied: string | null
          deal_performance_based_fees_per_unit: string | null
          deal_performance_based_fees_percentage_of_total_sales_revenue:
            | string
            | null
          deal_performance_based_fees_taxes_on_fees: string | null
          deal_performance_based_fees_total: string | null
          deal_performance_based_fees_units_charged: string | null
          dstr_change_of_totals_sales_revenue_vs_previous_period: string | null
          dstr_change_vs_previous_period: string | null
          dstr_fee_promotions_applied: string | null
          dstr_per_unit: string | null
          dstr_percentage_of_total_sales_revenue: string | null
          dstr_taxes_on_fees: string | null
          dstr_total: string | null
          dstr_units_charged: string | null
          fba_fulfilment_fees_change_of_totals_sales_revenue_vs_previous_:
            | string
            | null
          fba_fulfilment_fees_change_vs_previous_period: string | null
          fba_fulfilment_fees_fee_promotions_applied: string | null
          fba_fulfilment_fees_per_unit: string | null
          fba_fulfilment_fees_percentage_of_total_sales_revenue: string | null
          fba_fulfilment_fees_taxes_on_fees: string | null
          fba_fulfilment_fees_total: string | null
          fba_fulfilment_fees_units_charged: string | null
          fba_inventory_reimbursement_change_of_totals_sales_revenue_vs_p:
            | string
            | null
          fba_inventory_reimbursement_fee_promotions_applied: string | null
          fba_inventory_reimbursement_per_unit: string | null
          fba_inventory_reimbursement_percentage_of_total_sales_revenue:
            | string
            | null
          fba_inventory_reimbursement_taxes_on_fees: string | null
          fba_inventory_reimbursement_total: string | null
          fba_inventory_reimbursement_units_charged: string | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_of:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_vs:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_net_units:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_per_unit:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_percentag:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_total:
            | string
            | null
          fulfilment_cost_change_of_totals_sales_revenue_vs_previous_peri:
            | string
            | null
          fulfilment_cost_change_vs_previous_period: string | null
          fulfilment_cost_net_units_sold: string | null
          fulfilment_cost_per_unit: string | null
          fulfilment_cost_percentage_of_total_sales_revenue: string | null
          fulfilment_cost_total: string | null
          inbound_cost_change_of_totals_sales_revenue_vs_previous_period:
            | string
            | null
          inbound_cost_net_units_sold: string | null
          inbound_cost_per_unit: string | null
          inbound_cost_percentage_of_total_sales_revenue: string | null
          inbound_cost_total: string | null
          less_than_truckload_delivery_freight_cost_seller_provided_chang:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_net_u:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_per_u:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_perce:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_total:
            | string
            | null
          net_proceed_change_of_totals_sales_revenue_vs_previous_period:
            | string
            | null
          net_proceed_change_vs_previous_period: string | null
          net_proceed_per_unit: string | null
          net_proceed_percentage_of_total_sales_revenue: string | null
          net_proceed_total: string | null
          net_proceed_units_charged: string | null
          other_charges_and_reimbursements_change_of_totals_sales_revenue:
            | string
            | null
          other_charges_and_reimbursements_net_units_sold: string | null
          other_charges_and_reimbursements_per_unit: string | null
          other_charges_and_reimbursements_percentage_of_total_sales_reve:
            | string
            | null
          other_charges_and_reimbursements_total: string | null
          packing_cost_seller_provided_change_of_totals_sales_revenue_vs_:
            | string
            | null
          packing_cost_seller_provided_change_vs_previous_period: string | null
          packing_cost_seller_provided_net_units_sold: string | null
          packing_cost_seller_provided_per_unit: string | null
          packing_cost_seller_provided_percentage_of_total_sales_revenue:
            | string
            | null
          packing_cost_seller_provided_total: string | null
          product_asin: string
          product_brand: string | null
          product_product_name: string | null
          product_sku: string | null
          referral_fee_change_of_totals_sales_revenue_vs_previous_period:
            | string
            | null
          referral_fee_change_vs_previous_period: string | null
          referral_fee_fee_promotions_applied: string | null
          referral_fee_per_unit: string | null
          referral_fee_percentage_of_total_sales_revenue: string | null
          referral_fee_refunds_change_of_totals_sales_revenue_vs_previous:
            | string
            | null
          referral_fee_refunds_fee_promotions_applied: string | null
          referral_fee_refunds_per_unit: string | null
          referral_fee_refunds_percentage_of_total_sales_revenue: string | null
          referral_fee_refunds_taxes_on_fees: string | null
          referral_fee_refunds_total: string | null
          referral_fee_refunds_units_charged: string | null
          referral_fee_taxes_on_fees: string | null
          referral_fee_total: string | null
          referral_fee_units_charged: string | null
          refund_administration_fees_change_of_totals_sales_revenue_vs_pr:
            | string
            | null
          refund_administration_fees_change_vs_previous_period: string | null
          refund_administration_fees_fee_promotions_applied: string | null
          refund_administration_fees_per_unit: string | null
          refund_administration_fees_percentage_of_total_sales_revenue:
            | string
            | null
          refund_administration_fees_taxes_on_fees: string | null
          refund_administration_fees_total: string | null
          refund_administration_fees_units_charged: string | null
          return_and_recovery_operations_change_of_totals_sales_revenue_v:
            | string
            | null
          return_and_recovery_operations_change_vs_previous_period:
            | string
            | null
          return_and_recovery_operations_net_units_sold: string | null
          return_and_recovery_operations_per_unit: string | null
          return_and_recovery_operations_percentage_of_total_sales_revenu:
            | string
            | null
          return_and_recovery_operations_total: string | null
          sales_avg_sales_price: string | null
          sales_net_sales_revenue: string | null
          sales_net_units_sold: string | null
          sales_return_rate: string | null
          sales_total_sales_revenue: string | null
          sales_total_units_sold: string | null
          sales_units_refunded: string | null
          selling_fees_change_of_totals_sales_revenue_vs_previous_period:
            | string
            | null
          selling_fees_change_vs_previous_period: string | null
          selling_fees_net_units_sold: string | null
          selling_fees_per_unit: string | null
          selling_fees_percentage_of_total_sales_revenue: string | null
          selling_fees_total: string | null
          shipping_cost_seller_provided_change_of_totals_sales_revenue_vs:
            | string
            | null
          shipping_cost_seller_provided_change_vs_previous_period: string | null
          shipping_cost_seller_provided_net_units_sold: string | null
          shipping_cost_seller_provided_per_unit: string | null
          shipping_cost_seller_provided_percentage_of_total_sales_revenue:
            | string
            | null
          shipping_cost_seller_provided_total: string | null
          shipping_transport_charges_change_of_totals_sales_revenue_vs_pr:
            | string
            | null
          shipping_transport_charges_fee_promotions_applied: string | null
          shipping_transport_charges_per_unit: string | null
          shipping_transport_charges_percentage_of_total_sales_revenue:
            | string
            | null
          shipping_transport_charges_taxes_on_fees: string | null
          shipping_transport_charges_total: string | null
          shipping_transport_charges_units_charged: string | null
          sponsored_products_charges_change_of_totals_sales_revenue_vs_pr:
            | string
            | null
          sponsored_products_charges_change_vs_previous_period: string | null
          sponsored_products_charges_fee_promotions_applied: string | null
          sponsored_products_charges_per_unit: string | null
          sponsored_products_charges_percentage_of_total_sales_revenue:
            | string
            | null
          sponsored_products_charges_taxes_on_fees: string | null
          sponsored_products_charges_total: string | null
          sponsored_products_charges_units_charged: string | null
          storage_cost_seller_provided_change_of_totals_sales_revenue_vs_:
            | string
            | null
          storage_cost_seller_provided_change_vs_previous_period: string | null
          storage_cost_seller_provided_net_units_sold: string | null
          storage_cost_seller_provided_per_unit: string | null
          storage_cost_seller_provided_percentage_of_total_sales_revenue:
            | string
            | null
          storage_cost_seller_provided_total: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          advertising_cost_of_sales_acos_change_of_totals_sales_revenue_v?:
            | string
            | null
          advertising_cost_of_sales_acos_change_vs_previous_period?:
            | string
            | null
          advertising_cost_of_sales_acos_net_units_sold?: string | null
          advertising_cost_of_sales_acos_per_unit?: string | null
          advertising_cost_of_sales_acos_percentage_of_total_sales_revenu?:
            | string
            | null
          advertising_cost_of_sales_acos_total?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_change_of_totals_sale?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_change_vs_previous_pe?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_fee_promotions_applie?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_per_unit?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_percentage_of_total_s?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_taxes_on_fees?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_total?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_units_charged?:
            | string
            | null
          brand: string
          cost_of_goods_sold_seller_provided_change_of_totals_sales_reven?:
            | string
            | null
          cost_of_goods_sold_seller_provided_change_vs_previous_period?:
            | string
            | null
          cost_of_goods_sold_seller_provided_net_units_sold?: string | null
          cost_of_goods_sold_seller_provided_per_unit?: string | null
          cost_of_goods_sold_seller_provided_percentage_of_total_sales_re?:
            | string
            | null
          cost_of_goods_sold_seller_provided_total?: string | null
          daily_deal_fees_change_of_totals_sales_revenue_vs_previous_peri?:
            | string
            | null
          daily_deal_fees_fee_promotions_applied?: string | null
          daily_deal_fees_per_unit?: string | null
          daily_deal_fees_percentage_of_total_sales_revenue?: string | null
          daily_deal_fees_taxes_on_fees?: string | null
          daily_deal_fees_total?: string | null
          daily_deal_fees_units_charged?: string | null
          deal_performance_based_fees_change_of_totals_sales_revenue_vs_p?:
            | string
            | null
          deal_performance_based_fees_fee_promotions_applied?: string | null
          deal_performance_based_fees_per_unit?: string | null
          deal_performance_based_fees_percentage_of_total_sales_revenue?:
            | string
            | null
          deal_performance_based_fees_taxes_on_fees?: string | null
          deal_performance_based_fees_total?: string | null
          deal_performance_based_fees_units_charged?: string | null
          dstr_change_of_totals_sales_revenue_vs_previous_period?: string | null
          dstr_change_vs_previous_period?: string | null
          dstr_fee_promotions_applied?: string | null
          dstr_per_unit?: string | null
          dstr_percentage_of_total_sales_revenue?: string | null
          dstr_taxes_on_fees?: string | null
          dstr_total?: string | null
          dstr_units_charged?: string | null
          fba_fulfilment_fees_change_of_totals_sales_revenue_vs_previous_?:
            | string
            | null
          fba_fulfilment_fees_change_vs_previous_period?: string | null
          fba_fulfilment_fees_fee_promotions_applied?: string | null
          fba_fulfilment_fees_per_unit?: string | null
          fba_fulfilment_fees_percentage_of_total_sales_revenue?: string | null
          fba_fulfilment_fees_taxes_on_fees?: string | null
          fba_fulfilment_fees_total?: string | null
          fba_fulfilment_fees_units_charged?: string | null
          fba_inventory_reimbursement_change_of_totals_sales_revenue_vs_p?:
            | string
            | null
          fba_inventory_reimbursement_fee_promotions_applied?: string | null
          fba_inventory_reimbursement_per_unit?: string | null
          fba_inventory_reimbursement_percentage_of_total_sales_revenue?:
            | string
            | null
          fba_inventory_reimbursement_taxes_on_fees?: string | null
          fba_inventory_reimbursement_total?: string | null
          fba_inventory_reimbursement_units_charged?: string | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_of?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_vs?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_net_units?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_per_unit?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_percentag?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_total?:
            | string
            | null
          fulfilment_cost_change_of_totals_sales_revenue_vs_previous_peri?:
            | string
            | null
          fulfilment_cost_change_vs_previous_period?: string | null
          fulfilment_cost_net_units_sold?: string | null
          fulfilment_cost_per_unit?: string | null
          fulfilment_cost_percentage_of_total_sales_revenue?: string | null
          fulfilment_cost_total?: string | null
          inbound_cost_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          inbound_cost_net_units_sold?: string | null
          inbound_cost_per_unit?: string | null
          inbound_cost_percentage_of_total_sales_revenue?: string | null
          inbound_cost_total?: string | null
          less_than_truckload_delivery_freight_cost_seller_provided_chang?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_net_u?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_per_u?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_perce?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_total?:
            | string
            | null
          net_proceed_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          net_proceed_change_vs_previous_period?: string | null
          net_proceed_per_unit?: string | null
          net_proceed_percentage_of_total_sales_revenue?: string | null
          net_proceed_total?: string | null
          net_proceed_units_charged?: string | null
          other_charges_and_reimbursements_change_of_totals_sales_revenue?:
            | string
            | null
          other_charges_and_reimbursements_net_units_sold?: string | null
          other_charges_and_reimbursements_per_unit?: string | null
          other_charges_and_reimbursements_percentage_of_total_sales_reve?:
            | string
            | null
          other_charges_and_reimbursements_total?: string | null
          packing_cost_seller_provided_change_of_totals_sales_revenue_vs_?:
            | string
            | null
          packing_cost_seller_provided_change_vs_previous_period?: string | null
          packing_cost_seller_provided_net_units_sold?: string | null
          packing_cost_seller_provided_per_unit?: string | null
          packing_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          packing_cost_seller_provided_total?: string | null
          product_asin: string
          product_brand?: string | null
          product_product_name?: string | null
          product_sku?: string | null
          referral_fee_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          referral_fee_change_vs_previous_period?: string | null
          referral_fee_fee_promotions_applied?: string | null
          referral_fee_per_unit?: string | null
          referral_fee_percentage_of_total_sales_revenue?: string | null
          referral_fee_refunds_change_of_totals_sales_revenue_vs_previous?:
            | string
            | null
          referral_fee_refunds_fee_promotions_applied?: string | null
          referral_fee_refunds_per_unit?: string | null
          referral_fee_refunds_percentage_of_total_sales_revenue?: string | null
          referral_fee_refunds_taxes_on_fees?: string | null
          referral_fee_refunds_total?: string | null
          referral_fee_refunds_units_charged?: string | null
          referral_fee_taxes_on_fees?: string | null
          referral_fee_total?: string | null
          referral_fee_units_charged?: string | null
          refund_administration_fees_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          refund_administration_fees_change_vs_previous_period?: string | null
          refund_administration_fees_fee_promotions_applied?: string | null
          refund_administration_fees_per_unit?: string | null
          refund_administration_fees_percentage_of_total_sales_revenue?:
            | string
            | null
          refund_administration_fees_taxes_on_fees?: string | null
          refund_administration_fees_total?: string | null
          refund_administration_fees_units_charged?: string | null
          return_and_recovery_operations_change_of_totals_sales_revenue_v?:
            | string
            | null
          return_and_recovery_operations_change_vs_previous_period?:
            | string
            | null
          return_and_recovery_operations_net_units_sold?: string | null
          return_and_recovery_operations_per_unit?: string | null
          return_and_recovery_operations_percentage_of_total_sales_revenu?:
            | string
            | null
          return_and_recovery_operations_total?: string | null
          sales_avg_sales_price?: string | null
          sales_net_sales_revenue?: string | null
          sales_net_units_sold?: string | null
          sales_return_rate?: string | null
          sales_total_sales_revenue?: string | null
          sales_total_units_sold?: string | null
          sales_units_refunded?: string | null
          selling_fees_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          selling_fees_change_vs_previous_period?: string | null
          selling_fees_net_units_sold?: string | null
          selling_fees_per_unit?: string | null
          selling_fees_percentage_of_total_sales_revenue?: string | null
          selling_fees_total?: string | null
          shipping_cost_seller_provided_change_of_totals_sales_revenue_vs?:
            | string
            | null
          shipping_cost_seller_provided_change_vs_previous_period?:
            | string
            | null
          shipping_cost_seller_provided_net_units_sold?: string | null
          shipping_cost_seller_provided_per_unit?: string | null
          shipping_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          shipping_cost_seller_provided_total?: string | null
          shipping_transport_charges_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          shipping_transport_charges_fee_promotions_applied?: string | null
          shipping_transport_charges_per_unit?: string | null
          shipping_transport_charges_percentage_of_total_sales_revenue?:
            | string
            | null
          shipping_transport_charges_taxes_on_fees?: string | null
          shipping_transport_charges_total?: string | null
          shipping_transport_charges_units_charged?: string | null
          sponsored_products_charges_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          sponsored_products_charges_change_vs_previous_period?: string | null
          sponsored_products_charges_fee_promotions_applied?: string | null
          sponsored_products_charges_per_unit?: string | null
          sponsored_products_charges_percentage_of_total_sales_revenue?:
            | string
            | null
          sponsored_products_charges_taxes_on_fees?: string | null
          sponsored_products_charges_total?: string | null
          sponsored_products_charges_units_charged?: string | null
          storage_cost_seller_provided_change_of_totals_sales_revenue_vs_?:
            | string
            | null
          storage_cost_seller_provided_change_vs_previous_period?: string | null
          storage_cost_seller_provided_net_units_sold?: string | null
          storage_cost_seller_provided_per_unit?: string | null
          storage_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          storage_cost_seller_provided_total?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          advertising_cost_of_sales_acos_change_of_totals_sales_revenue_v?:
            | string
            | null
          advertising_cost_of_sales_acos_change_vs_previous_period?:
            | string
            | null
          advertising_cost_of_sales_acos_net_units_sold?: string | null
          advertising_cost_of_sales_acos_per_unit?: string | null
          advertising_cost_of_sales_acos_percentage_of_total_sales_revenu?:
            | string
            | null
          advertising_cost_of_sales_acos_total?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_change_of_totals_sale?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_change_vs_previous_pe?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_fee_promotions_applie?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_per_unit?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_percentage_of_total_s?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_taxes_on_fees?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_total?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_units_charged?:
            | string
            | null
          brand?: string
          cost_of_goods_sold_seller_provided_change_of_totals_sales_reven?:
            | string
            | null
          cost_of_goods_sold_seller_provided_change_vs_previous_period?:
            | string
            | null
          cost_of_goods_sold_seller_provided_net_units_sold?: string | null
          cost_of_goods_sold_seller_provided_per_unit?: string | null
          cost_of_goods_sold_seller_provided_percentage_of_total_sales_re?:
            | string
            | null
          cost_of_goods_sold_seller_provided_total?: string | null
          daily_deal_fees_change_of_totals_sales_revenue_vs_previous_peri?:
            | string
            | null
          daily_deal_fees_fee_promotions_applied?: string | null
          daily_deal_fees_per_unit?: string | null
          daily_deal_fees_percentage_of_total_sales_revenue?: string | null
          daily_deal_fees_taxes_on_fees?: string | null
          daily_deal_fees_total?: string | null
          daily_deal_fees_units_charged?: string | null
          deal_performance_based_fees_change_of_totals_sales_revenue_vs_p?:
            | string
            | null
          deal_performance_based_fees_fee_promotions_applied?: string | null
          deal_performance_based_fees_per_unit?: string | null
          deal_performance_based_fees_percentage_of_total_sales_revenue?:
            | string
            | null
          deal_performance_based_fees_taxes_on_fees?: string | null
          deal_performance_based_fees_total?: string | null
          deal_performance_based_fees_units_charged?: string | null
          dstr_change_of_totals_sales_revenue_vs_previous_period?: string | null
          dstr_change_vs_previous_period?: string | null
          dstr_fee_promotions_applied?: string | null
          dstr_per_unit?: string | null
          dstr_percentage_of_total_sales_revenue?: string | null
          dstr_taxes_on_fees?: string | null
          dstr_total?: string | null
          dstr_units_charged?: string | null
          fba_fulfilment_fees_change_of_totals_sales_revenue_vs_previous_?:
            | string
            | null
          fba_fulfilment_fees_change_vs_previous_period?: string | null
          fba_fulfilment_fees_fee_promotions_applied?: string | null
          fba_fulfilment_fees_per_unit?: string | null
          fba_fulfilment_fees_percentage_of_total_sales_revenue?: string | null
          fba_fulfilment_fees_taxes_on_fees?: string | null
          fba_fulfilment_fees_total?: string | null
          fba_fulfilment_fees_units_charged?: string | null
          fba_inventory_reimbursement_change_of_totals_sales_revenue_vs_p?:
            | string
            | null
          fba_inventory_reimbursement_fee_promotions_applied?: string | null
          fba_inventory_reimbursement_per_unit?: string | null
          fba_inventory_reimbursement_percentage_of_total_sales_revenue?:
            | string
            | null
          fba_inventory_reimbursement_taxes_on_fees?: string | null
          fba_inventory_reimbursement_total?: string | null
          fba_inventory_reimbursement_units_charged?: string | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_of?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_vs?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_net_units?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_per_unit?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_percentag?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_total?:
            | string
            | null
          fulfilment_cost_change_of_totals_sales_revenue_vs_previous_peri?:
            | string
            | null
          fulfilment_cost_change_vs_previous_period?: string | null
          fulfilment_cost_net_units_sold?: string | null
          fulfilment_cost_per_unit?: string | null
          fulfilment_cost_percentage_of_total_sales_revenue?: string | null
          fulfilment_cost_total?: string | null
          inbound_cost_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          inbound_cost_net_units_sold?: string | null
          inbound_cost_per_unit?: string | null
          inbound_cost_percentage_of_total_sales_revenue?: string | null
          inbound_cost_total?: string | null
          less_than_truckload_delivery_freight_cost_seller_provided_chang?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_net_u?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_per_u?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_perce?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_total?:
            | string
            | null
          net_proceed_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          net_proceed_change_vs_previous_period?: string | null
          net_proceed_per_unit?: string | null
          net_proceed_percentage_of_total_sales_revenue?: string | null
          net_proceed_total?: string | null
          net_proceed_units_charged?: string | null
          other_charges_and_reimbursements_change_of_totals_sales_revenue?:
            | string
            | null
          other_charges_and_reimbursements_net_units_sold?: string | null
          other_charges_and_reimbursements_per_unit?: string | null
          other_charges_and_reimbursements_percentage_of_total_sales_reve?:
            | string
            | null
          other_charges_and_reimbursements_total?: string | null
          packing_cost_seller_provided_change_of_totals_sales_revenue_vs_?:
            | string
            | null
          packing_cost_seller_provided_change_vs_previous_period?: string | null
          packing_cost_seller_provided_net_units_sold?: string | null
          packing_cost_seller_provided_per_unit?: string | null
          packing_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          packing_cost_seller_provided_total?: string | null
          product_asin?: string
          product_brand?: string | null
          product_product_name?: string | null
          product_sku?: string | null
          referral_fee_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          referral_fee_change_vs_previous_period?: string | null
          referral_fee_fee_promotions_applied?: string | null
          referral_fee_per_unit?: string | null
          referral_fee_percentage_of_total_sales_revenue?: string | null
          referral_fee_refunds_change_of_totals_sales_revenue_vs_previous?:
            | string
            | null
          referral_fee_refunds_fee_promotions_applied?: string | null
          referral_fee_refunds_per_unit?: string | null
          referral_fee_refunds_percentage_of_total_sales_revenue?: string | null
          referral_fee_refunds_taxes_on_fees?: string | null
          referral_fee_refunds_total?: string | null
          referral_fee_refunds_units_charged?: string | null
          referral_fee_taxes_on_fees?: string | null
          referral_fee_total?: string | null
          referral_fee_units_charged?: string | null
          refund_administration_fees_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          refund_administration_fees_change_vs_previous_period?: string | null
          refund_administration_fees_fee_promotions_applied?: string | null
          refund_administration_fees_per_unit?: string | null
          refund_administration_fees_percentage_of_total_sales_revenue?:
            | string
            | null
          refund_administration_fees_taxes_on_fees?: string | null
          refund_administration_fees_total?: string | null
          refund_administration_fees_units_charged?: string | null
          return_and_recovery_operations_change_of_totals_sales_revenue_v?:
            | string
            | null
          return_and_recovery_operations_change_vs_previous_period?:
            | string
            | null
          return_and_recovery_operations_net_units_sold?: string | null
          return_and_recovery_operations_per_unit?: string | null
          return_and_recovery_operations_percentage_of_total_sales_revenu?:
            | string
            | null
          return_and_recovery_operations_total?: string | null
          sales_avg_sales_price?: string | null
          sales_net_sales_revenue?: string | null
          sales_net_units_sold?: string | null
          sales_return_rate?: string | null
          sales_total_sales_revenue?: string | null
          sales_total_units_sold?: string | null
          sales_units_refunded?: string | null
          selling_fees_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          selling_fees_change_vs_previous_period?: string | null
          selling_fees_net_units_sold?: string | null
          selling_fees_per_unit?: string | null
          selling_fees_percentage_of_total_sales_revenue?: string | null
          selling_fees_total?: string | null
          shipping_cost_seller_provided_change_of_totals_sales_revenue_vs?:
            | string
            | null
          shipping_cost_seller_provided_change_vs_previous_period?:
            | string
            | null
          shipping_cost_seller_provided_net_units_sold?: string | null
          shipping_cost_seller_provided_per_unit?: string | null
          shipping_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          shipping_cost_seller_provided_total?: string | null
          shipping_transport_charges_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          shipping_transport_charges_fee_promotions_applied?: string | null
          shipping_transport_charges_per_unit?: string | null
          shipping_transport_charges_percentage_of_total_sales_revenue?:
            | string
            | null
          shipping_transport_charges_taxes_on_fees?: string | null
          shipping_transport_charges_total?: string | null
          shipping_transport_charges_units_charged?: string | null
          sponsored_products_charges_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          sponsored_products_charges_change_vs_previous_period?: string | null
          sponsored_products_charges_fee_promotions_applied?: string | null
          sponsored_products_charges_per_unit?: string | null
          sponsored_products_charges_percentage_of_total_sales_revenue?:
            | string
            | null
          sponsored_products_charges_taxes_on_fees?: string | null
          sponsored_products_charges_total?: string | null
          sponsored_products_charges_units_charged?: string | null
          storage_cost_seller_provided_change_of_totals_sales_revenue_vs_?:
            | string
            | null
          storage_cost_seller_provided_change_vs_previous_period?: string | null
          storage_cost_seller_provided_net_units_sold?: string | null
          storage_cost_seller_provided_per_unit?: string | null
          storage_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          storage_cost_seller_provided_total?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      python_financial_raw_junk_backup: {
        Row: {
          advertising_cost_of_sales_acos_change_of_totals_sales_revenue_v:
            | string
            | null
          advertising_cost_of_sales_acos_change_vs_previous_period:
            | string
            | null
          advertising_cost_of_sales_acos_net_units_sold: string | null
          advertising_cost_of_sales_acos_per_unit: string | null
          advertising_cost_of_sales_acos_percentage_of_total_sales_revenu:
            | string
            | null
          advertising_cost_of_sales_acos_total: string | null
          base_fulfilment_by_amazon_fulfilment_fees_change_of_totals_sale:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_change_vs_previous_pe:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_fee_promotions_applie:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_per_unit: string | null
          base_fulfilment_by_amazon_fulfilment_fees_percentage_of_total_s:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_taxes_on_fees: string | null
          base_fulfilment_by_amazon_fulfilment_fees_total: string | null
          base_fulfilment_by_amazon_fulfilment_fees_units_charged: string | null
          brand: string | null
          cost_of_goods_sold_seller_provided_change_of_totals_sales_reven:
            | string
            | null
          cost_of_goods_sold_seller_provided_change_vs_previous_period:
            | string
            | null
          cost_of_goods_sold_seller_provided_net_units_sold: string | null
          cost_of_goods_sold_seller_provided_per_unit: string | null
          cost_of_goods_sold_seller_provided_percentage_of_total_sales_re:
            | string
            | null
          cost_of_goods_sold_seller_provided_total: string | null
          daily_deal_fees_change_of_totals_sales_revenue_vs_previous_peri:
            | string
            | null
          daily_deal_fees_fee_promotions_applied: string | null
          daily_deal_fees_per_unit: string | null
          daily_deal_fees_percentage_of_total_sales_revenue: string | null
          daily_deal_fees_taxes_on_fees: string | null
          daily_deal_fees_total: string | null
          daily_deal_fees_units_charged: string | null
          deal_performance_based_fees_change_of_totals_sales_revenue_vs_p:
            | string
            | null
          deal_performance_based_fees_fee_promotions_applied: string | null
          deal_performance_based_fees_per_unit: string | null
          deal_performance_based_fees_percentage_of_total_sales_revenue:
            | string
            | null
          deal_performance_based_fees_taxes_on_fees: string | null
          deal_performance_based_fees_total: string | null
          deal_performance_based_fees_units_charged: string | null
          dstr_change_of_totals_sales_revenue_vs_previous_period: string | null
          dstr_change_vs_previous_period: string | null
          dstr_fee_promotions_applied: string | null
          dstr_per_unit: string | null
          dstr_percentage_of_total_sales_revenue: string | null
          dstr_taxes_on_fees: string | null
          dstr_total: string | null
          dstr_units_charged: string | null
          fba_fulfilment_fees_change_of_totals_sales_revenue_vs_previous_:
            | string
            | null
          fba_fulfilment_fees_change_vs_previous_period: string | null
          fba_fulfilment_fees_fee_promotions_applied: string | null
          fba_fulfilment_fees_per_unit: string | null
          fba_fulfilment_fees_percentage_of_total_sales_revenue: string | null
          fba_fulfilment_fees_taxes_on_fees: string | null
          fba_fulfilment_fees_total: string | null
          fba_fulfilment_fees_units_charged: string | null
          fba_inventory_reimbursement_change_of_totals_sales_revenue_vs_p:
            | string
            | null
          fba_inventory_reimbursement_fee_promotions_applied: string | null
          fba_inventory_reimbursement_per_unit: string | null
          fba_inventory_reimbursement_percentage_of_total_sales_revenue:
            | string
            | null
          fba_inventory_reimbursement_taxes_on_fees: string | null
          fba_inventory_reimbursement_total: string | null
          fba_inventory_reimbursement_units_charged: string | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_of:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_vs:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_net_units:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_per_unit:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_percentag:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_total:
            | string
            | null
          fulfilment_cost_change_of_totals_sales_revenue_vs_previous_peri:
            | string
            | null
          fulfilment_cost_change_vs_previous_period: string | null
          fulfilment_cost_net_units_sold: string | null
          fulfilment_cost_per_unit: string | null
          fulfilment_cost_percentage_of_total_sales_revenue: string | null
          fulfilment_cost_total: string | null
          inbound_cost_change_of_totals_sales_revenue_vs_previous_period:
            | string
            | null
          inbound_cost_net_units_sold: string | null
          inbound_cost_per_unit: string | null
          inbound_cost_percentage_of_total_sales_revenue: string | null
          inbound_cost_total: string | null
          less_than_truckload_delivery_freight_cost_seller_provided_chang:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_net_u:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_per_u:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_perce:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_total:
            | string
            | null
          net_proceed_change_of_totals_sales_revenue_vs_previous_period:
            | string
            | null
          net_proceed_change_vs_previous_period: string | null
          net_proceed_per_unit: string | null
          net_proceed_percentage_of_total_sales_revenue: string | null
          net_proceed_total: string | null
          net_proceed_units_charged: string | null
          other_charges_and_reimbursements_change_of_totals_sales_revenue:
            | string
            | null
          other_charges_and_reimbursements_net_units_sold: string | null
          other_charges_and_reimbursements_per_unit: string | null
          other_charges_and_reimbursements_percentage_of_total_sales_reve:
            | string
            | null
          other_charges_and_reimbursements_total: string | null
          packing_cost_seller_provided_change_of_totals_sales_revenue_vs_:
            | string
            | null
          packing_cost_seller_provided_change_vs_previous_period: string | null
          packing_cost_seller_provided_net_units_sold: string | null
          packing_cost_seller_provided_per_unit: string | null
          packing_cost_seller_provided_percentage_of_total_sales_revenue:
            | string
            | null
          packing_cost_seller_provided_total: string | null
          product_asin: string | null
          product_brand: string | null
          product_product_name: string | null
          product_sku: string | null
          referral_fee_change_of_totals_sales_revenue_vs_previous_period:
            | string
            | null
          referral_fee_change_vs_previous_period: string | null
          referral_fee_fee_promotions_applied: string | null
          referral_fee_per_unit: string | null
          referral_fee_percentage_of_total_sales_revenue: string | null
          referral_fee_refunds_change_of_totals_sales_revenue_vs_previous:
            | string
            | null
          referral_fee_refunds_fee_promotions_applied: string | null
          referral_fee_refunds_per_unit: string | null
          referral_fee_refunds_percentage_of_total_sales_revenue: string | null
          referral_fee_refunds_taxes_on_fees: string | null
          referral_fee_refunds_total: string | null
          referral_fee_refunds_units_charged: string | null
          referral_fee_taxes_on_fees: string | null
          referral_fee_total: string | null
          referral_fee_units_charged: string | null
          refund_administration_fees_change_of_totals_sales_revenue_vs_pr:
            | string
            | null
          refund_administration_fees_change_vs_previous_period: string | null
          refund_administration_fees_fee_promotions_applied: string | null
          refund_administration_fees_per_unit: string | null
          refund_administration_fees_percentage_of_total_sales_revenue:
            | string
            | null
          refund_administration_fees_taxes_on_fees: string | null
          refund_administration_fees_total: string | null
          refund_administration_fees_units_charged: string | null
          return_and_recovery_operations_change_of_totals_sales_revenue_v:
            | string
            | null
          return_and_recovery_operations_change_vs_previous_period:
            | string
            | null
          return_and_recovery_operations_net_units_sold: string | null
          return_and_recovery_operations_per_unit: string | null
          return_and_recovery_operations_percentage_of_total_sales_revenu:
            | string
            | null
          return_and_recovery_operations_total: string | null
          sales_avg_sales_price: string | null
          sales_net_sales_revenue: string | null
          sales_net_units_sold: string | null
          sales_return_rate: string | null
          sales_total_sales_revenue: string | null
          sales_total_units_sold: string | null
          sales_units_refunded: string | null
          selling_fees_change_of_totals_sales_revenue_vs_previous_period:
            | string
            | null
          selling_fees_change_vs_previous_period: string | null
          selling_fees_net_units_sold: string | null
          selling_fees_per_unit: string | null
          selling_fees_percentage_of_total_sales_revenue: string | null
          selling_fees_total: string | null
          shipping_cost_seller_provided_change_of_totals_sales_revenue_vs:
            | string
            | null
          shipping_cost_seller_provided_change_vs_previous_period: string | null
          shipping_cost_seller_provided_net_units_sold: string | null
          shipping_cost_seller_provided_per_unit: string | null
          shipping_cost_seller_provided_percentage_of_total_sales_revenue:
            | string
            | null
          shipping_cost_seller_provided_total: string | null
          shipping_transport_charges_change_of_totals_sales_revenue_vs_pr:
            | string
            | null
          shipping_transport_charges_fee_promotions_applied: string | null
          shipping_transport_charges_per_unit: string | null
          shipping_transport_charges_percentage_of_total_sales_revenue:
            | string
            | null
          shipping_transport_charges_taxes_on_fees: string | null
          shipping_transport_charges_total: string | null
          shipping_transport_charges_units_charged: string | null
          sponsored_products_charges_change_of_totals_sales_revenue_vs_pr:
            | string
            | null
          sponsored_products_charges_change_vs_previous_period: string | null
          sponsored_products_charges_fee_promotions_applied: string | null
          sponsored_products_charges_per_unit: string | null
          sponsored_products_charges_percentage_of_total_sales_revenue:
            | string
            | null
          sponsored_products_charges_taxes_on_fees: string | null
          sponsored_products_charges_total: string | null
          sponsored_products_charges_units_charged: string | null
          storage_cost_seller_provided_change_of_totals_sales_revenue_vs_:
            | string
            | null
          storage_cost_seller_provided_change_vs_previous_period: string | null
          storage_cost_seller_provided_net_units_sold: string | null
          storage_cost_seller_provided_per_unit: string | null
          storage_cost_seller_provided_percentage_of_total_sales_revenue:
            | string
            | null
          storage_cost_seller_provided_total: string | null
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          advertising_cost_of_sales_acos_change_of_totals_sales_revenue_v?:
            | string
            | null
          advertising_cost_of_sales_acos_change_vs_previous_period?:
            | string
            | null
          advertising_cost_of_sales_acos_net_units_sold?: string | null
          advertising_cost_of_sales_acos_per_unit?: string | null
          advertising_cost_of_sales_acos_percentage_of_total_sales_revenu?:
            | string
            | null
          advertising_cost_of_sales_acos_total?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_change_of_totals_sale?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_change_vs_previous_pe?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_fee_promotions_applie?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_per_unit?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_percentage_of_total_s?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_taxes_on_fees?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_total?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_units_charged?:
            | string
            | null
          brand?: string | null
          cost_of_goods_sold_seller_provided_change_of_totals_sales_reven?:
            | string
            | null
          cost_of_goods_sold_seller_provided_change_vs_previous_period?:
            | string
            | null
          cost_of_goods_sold_seller_provided_net_units_sold?: string | null
          cost_of_goods_sold_seller_provided_per_unit?: string | null
          cost_of_goods_sold_seller_provided_percentage_of_total_sales_re?:
            | string
            | null
          cost_of_goods_sold_seller_provided_total?: string | null
          daily_deal_fees_change_of_totals_sales_revenue_vs_previous_peri?:
            | string
            | null
          daily_deal_fees_fee_promotions_applied?: string | null
          daily_deal_fees_per_unit?: string | null
          daily_deal_fees_percentage_of_total_sales_revenue?: string | null
          daily_deal_fees_taxes_on_fees?: string | null
          daily_deal_fees_total?: string | null
          daily_deal_fees_units_charged?: string | null
          deal_performance_based_fees_change_of_totals_sales_revenue_vs_p?:
            | string
            | null
          deal_performance_based_fees_fee_promotions_applied?: string | null
          deal_performance_based_fees_per_unit?: string | null
          deal_performance_based_fees_percentage_of_total_sales_revenue?:
            | string
            | null
          deal_performance_based_fees_taxes_on_fees?: string | null
          deal_performance_based_fees_total?: string | null
          deal_performance_based_fees_units_charged?: string | null
          dstr_change_of_totals_sales_revenue_vs_previous_period?: string | null
          dstr_change_vs_previous_period?: string | null
          dstr_fee_promotions_applied?: string | null
          dstr_per_unit?: string | null
          dstr_percentage_of_total_sales_revenue?: string | null
          dstr_taxes_on_fees?: string | null
          dstr_total?: string | null
          dstr_units_charged?: string | null
          fba_fulfilment_fees_change_of_totals_sales_revenue_vs_previous_?:
            | string
            | null
          fba_fulfilment_fees_change_vs_previous_period?: string | null
          fba_fulfilment_fees_fee_promotions_applied?: string | null
          fba_fulfilment_fees_per_unit?: string | null
          fba_fulfilment_fees_percentage_of_total_sales_revenue?: string | null
          fba_fulfilment_fees_taxes_on_fees?: string | null
          fba_fulfilment_fees_total?: string | null
          fba_fulfilment_fees_units_charged?: string | null
          fba_inventory_reimbursement_change_of_totals_sales_revenue_vs_p?:
            | string
            | null
          fba_inventory_reimbursement_fee_promotions_applied?: string | null
          fba_inventory_reimbursement_per_unit?: string | null
          fba_inventory_reimbursement_percentage_of_total_sales_revenue?:
            | string
            | null
          fba_inventory_reimbursement_taxes_on_fees?: string | null
          fba_inventory_reimbursement_total?: string | null
          fba_inventory_reimbursement_units_charged?: string | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_of?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_vs?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_net_units?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_per_unit?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_percentag?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_total?:
            | string
            | null
          fulfilment_cost_change_of_totals_sales_revenue_vs_previous_peri?:
            | string
            | null
          fulfilment_cost_change_vs_previous_period?: string | null
          fulfilment_cost_net_units_sold?: string | null
          fulfilment_cost_per_unit?: string | null
          fulfilment_cost_percentage_of_total_sales_revenue?: string | null
          fulfilment_cost_total?: string | null
          inbound_cost_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          inbound_cost_net_units_sold?: string | null
          inbound_cost_per_unit?: string | null
          inbound_cost_percentage_of_total_sales_revenue?: string | null
          inbound_cost_total?: string | null
          less_than_truckload_delivery_freight_cost_seller_provided_chang?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_net_u?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_per_u?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_perce?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_total?:
            | string
            | null
          net_proceed_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          net_proceed_change_vs_previous_period?: string | null
          net_proceed_per_unit?: string | null
          net_proceed_percentage_of_total_sales_revenue?: string | null
          net_proceed_total?: string | null
          net_proceed_units_charged?: string | null
          other_charges_and_reimbursements_change_of_totals_sales_revenue?:
            | string
            | null
          other_charges_and_reimbursements_net_units_sold?: string | null
          other_charges_and_reimbursements_per_unit?: string | null
          other_charges_and_reimbursements_percentage_of_total_sales_reve?:
            | string
            | null
          other_charges_and_reimbursements_total?: string | null
          packing_cost_seller_provided_change_of_totals_sales_revenue_vs_?:
            | string
            | null
          packing_cost_seller_provided_change_vs_previous_period?: string | null
          packing_cost_seller_provided_net_units_sold?: string | null
          packing_cost_seller_provided_per_unit?: string | null
          packing_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          packing_cost_seller_provided_total?: string | null
          product_asin?: string | null
          product_brand?: string | null
          product_product_name?: string | null
          product_sku?: string | null
          referral_fee_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          referral_fee_change_vs_previous_period?: string | null
          referral_fee_fee_promotions_applied?: string | null
          referral_fee_per_unit?: string | null
          referral_fee_percentage_of_total_sales_revenue?: string | null
          referral_fee_refunds_change_of_totals_sales_revenue_vs_previous?:
            | string
            | null
          referral_fee_refunds_fee_promotions_applied?: string | null
          referral_fee_refunds_per_unit?: string | null
          referral_fee_refunds_percentage_of_total_sales_revenue?: string | null
          referral_fee_refunds_taxes_on_fees?: string | null
          referral_fee_refunds_total?: string | null
          referral_fee_refunds_units_charged?: string | null
          referral_fee_taxes_on_fees?: string | null
          referral_fee_total?: string | null
          referral_fee_units_charged?: string | null
          refund_administration_fees_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          refund_administration_fees_change_vs_previous_period?: string | null
          refund_administration_fees_fee_promotions_applied?: string | null
          refund_administration_fees_per_unit?: string | null
          refund_administration_fees_percentage_of_total_sales_revenue?:
            | string
            | null
          refund_administration_fees_taxes_on_fees?: string | null
          refund_administration_fees_total?: string | null
          refund_administration_fees_units_charged?: string | null
          return_and_recovery_operations_change_of_totals_sales_revenue_v?:
            | string
            | null
          return_and_recovery_operations_change_vs_previous_period?:
            | string
            | null
          return_and_recovery_operations_net_units_sold?: string | null
          return_and_recovery_operations_per_unit?: string | null
          return_and_recovery_operations_percentage_of_total_sales_revenu?:
            | string
            | null
          return_and_recovery_operations_total?: string | null
          sales_avg_sales_price?: string | null
          sales_net_sales_revenue?: string | null
          sales_net_units_sold?: string | null
          sales_return_rate?: string | null
          sales_total_sales_revenue?: string | null
          sales_total_units_sold?: string | null
          sales_units_refunded?: string | null
          selling_fees_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          selling_fees_change_vs_previous_period?: string | null
          selling_fees_net_units_sold?: string | null
          selling_fees_per_unit?: string | null
          selling_fees_percentage_of_total_sales_revenue?: string | null
          selling_fees_total?: string | null
          shipping_cost_seller_provided_change_of_totals_sales_revenue_vs?:
            | string
            | null
          shipping_cost_seller_provided_change_vs_previous_period?:
            | string
            | null
          shipping_cost_seller_provided_net_units_sold?: string | null
          shipping_cost_seller_provided_per_unit?: string | null
          shipping_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          shipping_cost_seller_provided_total?: string | null
          shipping_transport_charges_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          shipping_transport_charges_fee_promotions_applied?: string | null
          shipping_transport_charges_per_unit?: string | null
          shipping_transport_charges_percentage_of_total_sales_revenue?:
            | string
            | null
          shipping_transport_charges_taxes_on_fees?: string | null
          shipping_transport_charges_total?: string | null
          shipping_transport_charges_units_charged?: string | null
          sponsored_products_charges_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          sponsored_products_charges_change_vs_previous_period?: string | null
          sponsored_products_charges_fee_promotions_applied?: string | null
          sponsored_products_charges_per_unit?: string | null
          sponsored_products_charges_percentage_of_total_sales_revenue?:
            | string
            | null
          sponsored_products_charges_taxes_on_fees?: string | null
          sponsored_products_charges_total?: string | null
          sponsored_products_charges_units_charged?: string | null
          storage_cost_seller_provided_change_of_totals_sales_revenue_vs_?:
            | string
            | null
          storage_cost_seller_provided_change_vs_previous_period?: string | null
          storage_cost_seller_provided_net_units_sold?: string | null
          storage_cost_seller_provided_per_unit?: string | null
          storage_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          storage_cost_seller_provided_total?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          advertising_cost_of_sales_acos_change_of_totals_sales_revenue_v?:
            | string
            | null
          advertising_cost_of_sales_acos_change_vs_previous_period?:
            | string
            | null
          advertising_cost_of_sales_acos_net_units_sold?: string | null
          advertising_cost_of_sales_acos_per_unit?: string | null
          advertising_cost_of_sales_acos_percentage_of_total_sales_revenu?:
            | string
            | null
          advertising_cost_of_sales_acos_total?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_change_of_totals_sale?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_change_vs_previous_pe?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_fee_promotions_applie?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_per_unit?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_percentage_of_total_s?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_taxes_on_fees?:
            | string
            | null
          base_fulfilment_by_amazon_fulfilment_fees_total?: string | null
          base_fulfilment_by_amazon_fulfilment_fees_units_charged?:
            | string
            | null
          brand?: string | null
          cost_of_goods_sold_seller_provided_change_of_totals_sales_reven?:
            | string
            | null
          cost_of_goods_sold_seller_provided_change_vs_previous_period?:
            | string
            | null
          cost_of_goods_sold_seller_provided_net_units_sold?: string | null
          cost_of_goods_sold_seller_provided_per_unit?: string | null
          cost_of_goods_sold_seller_provided_percentage_of_total_sales_re?:
            | string
            | null
          cost_of_goods_sold_seller_provided_total?: string | null
          daily_deal_fees_change_of_totals_sales_revenue_vs_previous_peri?:
            | string
            | null
          daily_deal_fees_fee_promotions_applied?: string | null
          daily_deal_fees_per_unit?: string | null
          daily_deal_fees_percentage_of_total_sales_revenue?: string | null
          daily_deal_fees_taxes_on_fees?: string | null
          daily_deal_fees_total?: string | null
          daily_deal_fees_units_charged?: string | null
          deal_performance_based_fees_change_of_totals_sales_revenue_vs_p?:
            | string
            | null
          deal_performance_based_fees_fee_promotions_applied?: string | null
          deal_performance_based_fees_per_unit?: string | null
          deal_performance_based_fees_percentage_of_total_sales_revenue?:
            | string
            | null
          deal_performance_based_fees_taxes_on_fees?: string | null
          deal_performance_based_fees_total?: string | null
          deal_performance_based_fees_units_charged?: string | null
          dstr_change_of_totals_sales_revenue_vs_previous_period?: string | null
          dstr_change_vs_previous_period?: string | null
          dstr_fee_promotions_applied?: string | null
          dstr_per_unit?: string | null
          dstr_percentage_of_total_sales_revenue?: string | null
          dstr_taxes_on_fees?: string | null
          dstr_total?: string | null
          dstr_units_charged?: string | null
          fba_fulfilment_fees_change_of_totals_sales_revenue_vs_previous_?:
            | string
            | null
          fba_fulfilment_fees_change_vs_previous_period?: string | null
          fba_fulfilment_fees_fee_promotions_applied?: string | null
          fba_fulfilment_fees_per_unit?: string | null
          fba_fulfilment_fees_percentage_of_total_sales_revenue?: string | null
          fba_fulfilment_fees_taxes_on_fees?: string | null
          fba_fulfilment_fees_total?: string | null
          fba_fulfilment_fees_units_charged?: string | null
          fba_inventory_reimbursement_change_of_totals_sales_revenue_vs_p?:
            | string
            | null
          fba_inventory_reimbursement_fee_promotions_applied?: string | null
          fba_inventory_reimbursement_per_unit?: string | null
          fba_inventory_reimbursement_percentage_of_total_sales_revenue?:
            | string
            | null
          fba_inventory_reimbursement_taxes_on_fees?: string | null
          fba_inventory_reimbursement_total?: string | null
          fba_inventory_reimbursement_units_charged?: string | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_of?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_change_vs?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_net_units?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_per_unit?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_percentag?:
            | string
            | null
          fulfilled_by_merchant_fulfilment_cost_seller_provided_total?:
            | string
            | null
          fulfilment_cost_change_of_totals_sales_revenue_vs_previous_peri?:
            | string
            | null
          fulfilment_cost_change_vs_previous_period?: string | null
          fulfilment_cost_net_units_sold?: string | null
          fulfilment_cost_per_unit?: string | null
          fulfilment_cost_percentage_of_total_sales_revenue?: string | null
          fulfilment_cost_total?: string | null
          inbound_cost_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          inbound_cost_net_units_sold?: string | null
          inbound_cost_per_unit?: string | null
          inbound_cost_percentage_of_total_sales_revenue?: string | null
          inbound_cost_total?: string | null
          less_than_truckload_delivery_freight_cost_seller_provided_chang?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_net_u?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_per_u?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_perce?:
            | string
            | null
          less_than_truckload_delivery_freight_cost_seller_provided_total?:
            | string
            | null
          net_proceed_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          net_proceed_change_vs_previous_period?: string | null
          net_proceed_per_unit?: string | null
          net_proceed_percentage_of_total_sales_revenue?: string | null
          net_proceed_total?: string | null
          net_proceed_units_charged?: string | null
          other_charges_and_reimbursements_change_of_totals_sales_revenue?:
            | string
            | null
          other_charges_and_reimbursements_net_units_sold?: string | null
          other_charges_and_reimbursements_per_unit?: string | null
          other_charges_and_reimbursements_percentage_of_total_sales_reve?:
            | string
            | null
          other_charges_and_reimbursements_total?: string | null
          packing_cost_seller_provided_change_of_totals_sales_revenue_vs_?:
            | string
            | null
          packing_cost_seller_provided_change_vs_previous_period?: string | null
          packing_cost_seller_provided_net_units_sold?: string | null
          packing_cost_seller_provided_per_unit?: string | null
          packing_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          packing_cost_seller_provided_total?: string | null
          product_asin?: string | null
          product_brand?: string | null
          product_product_name?: string | null
          product_sku?: string | null
          referral_fee_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          referral_fee_change_vs_previous_period?: string | null
          referral_fee_fee_promotions_applied?: string | null
          referral_fee_per_unit?: string | null
          referral_fee_percentage_of_total_sales_revenue?: string | null
          referral_fee_refunds_change_of_totals_sales_revenue_vs_previous?:
            | string
            | null
          referral_fee_refunds_fee_promotions_applied?: string | null
          referral_fee_refunds_per_unit?: string | null
          referral_fee_refunds_percentage_of_total_sales_revenue?: string | null
          referral_fee_refunds_taxes_on_fees?: string | null
          referral_fee_refunds_total?: string | null
          referral_fee_refunds_units_charged?: string | null
          referral_fee_taxes_on_fees?: string | null
          referral_fee_total?: string | null
          referral_fee_units_charged?: string | null
          refund_administration_fees_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          refund_administration_fees_change_vs_previous_period?: string | null
          refund_administration_fees_fee_promotions_applied?: string | null
          refund_administration_fees_per_unit?: string | null
          refund_administration_fees_percentage_of_total_sales_revenue?:
            | string
            | null
          refund_administration_fees_taxes_on_fees?: string | null
          refund_administration_fees_total?: string | null
          refund_administration_fees_units_charged?: string | null
          return_and_recovery_operations_change_of_totals_sales_revenue_v?:
            | string
            | null
          return_and_recovery_operations_change_vs_previous_period?:
            | string
            | null
          return_and_recovery_operations_net_units_sold?: string | null
          return_and_recovery_operations_per_unit?: string | null
          return_and_recovery_operations_percentage_of_total_sales_revenu?:
            | string
            | null
          return_and_recovery_operations_total?: string | null
          sales_avg_sales_price?: string | null
          sales_net_sales_revenue?: string | null
          sales_net_units_sold?: string | null
          sales_return_rate?: string | null
          sales_total_sales_revenue?: string | null
          sales_total_units_sold?: string | null
          sales_units_refunded?: string | null
          selling_fees_change_of_totals_sales_revenue_vs_previous_period?:
            | string
            | null
          selling_fees_change_vs_previous_period?: string | null
          selling_fees_net_units_sold?: string | null
          selling_fees_per_unit?: string | null
          selling_fees_percentage_of_total_sales_revenue?: string | null
          selling_fees_total?: string | null
          shipping_cost_seller_provided_change_of_totals_sales_revenue_vs?:
            | string
            | null
          shipping_cost_seller_provided_change_vs_previous_period?:
            | string
            | null
          shipping_cost_seller_provided_net_units_sold?: string | null
          shipping_cost_seller_provided_per_unit?: string | null
          shipping_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          shipping_cost_seller_provided_total?: string | null
          shipping_transport_charges_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          shipping_transport_charges_fee_promotions_applied?: string | null
          shipping_transport_charges_per_unit?: string | null
          shipping_transport_charges_percentage_of_total_sales_revenue?:
            | string
            | null
          shipping_transport_charges_taxes_on_fees?: string | null
          shipping_transport_charges_total?: string | null
          shipping_transport_charges_units_charged?: string | null
          sponsored_products_charges_change_of_totals_sales_revenue_vs_pr?:
            | string
            | null
          sponsored_products_charges_change_vs_previous_period?: string | null
          sponsored_products_charges_fee_promotions_applied?: string | null
          sponsored_products_charges_per_unit?: string | null
          sponsored_products_charges_percentage_of_total_sales_revenue?:
            | string
            | null
          sponsored_products_charges_taxes_on_fees?: string | null
          sponsored_products_charges_total?: string | null
          sponsored_products_charges_units_charged?: string | null
          storage_cost_seller_provided_change_of_totals_sales_revenue_vs_?:
            | string
            | null
          storage_cost_seller_provided_change_vs_previous_period?: string | null
          storage_cost_seller_provided_net_units_sold?: string | null
          storage_cost_seller_provided_per_unit?: string | null
          storage_cost_seller_provided_percentage_of_total_sales_revenue?:
            | string
            | null
          storage_cost_seller_provided_total?: string | null
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
      python_keyword_master: {
        Row: {
          acos: number | null
          ba_search_term: string
          basket_adds_basket_add_rate: string | null
          basket_adds_brand_count: number | null
          basket_adds_brand_share: string | null
          basket_adds_total_count: number | null
          brand: string
          clicks: number | null
          clicks_brand_count: number | null
          clicks_brand_share: string | null
          clicks_click_rate: string | null
          clicks_total_count: number | null
          cpc: number | null
          ctr: number | null
          cvr: number | null
          exact_exists: string | null
          has_ba: string | null
          has_ppc: string | null
          impressions: number | null
          impressions_brand_count: number | null
          impressions_brand_share: string | null
          impressions_total_count: number | null
          is_asin: string | null
          keyword: string | null
          orders: number | null
          ppc_search_term: string | null
          purchases_brand_count: number | null
          purchases_brand_share: string | null
          purchases_purchase_rate: string | null
          purchases_total_count: number | null
          sales: number | null
          search_query_score: number | null
          search_query_volume: number | null
          source: string | null
          spend: number | null
          units: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          acos?: number | null
          ba_search_term: string
          basket_adds_basket_add_rate?: string | null
          basket_adds_brand_count?: number | null
          basket_adds_brand_share?: string | null
          basket_adds_total_count?: number | null
          brand: string
          clicks?: number | null
          clicks_brand_count?: number | null
          clicks_brand_share?: string | null
          clicks_click_rate?: string | null
          clicks_total_count?: number | null
          cpc?: number | null
          ctr?: number | null
          cvr?: number | null
          exact_exists?: string | null
          has_ba?: string | null
          has_ppc?: string | null
          impressions?: number | null
          impressions_brand_count?: number | null
          impressions_brand_share?: string | null
          impressions_total_count?: number | null
          is_asin?: string | null
          keyword?: string | null
          orders?: number | null
          ppc_search_term?: string | null
          purchases_brand_count?: number | null
          purchases_brand_share?: string | null
          purchases_purchase_rate?: string | null
          purchases_total_count?: number | null
          sales?: number | null
          search_query_score?: number | null
          search_query_volume?: number | null
          source?: string | null
          spend?: number | null
          units?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          acos?: number | null
          ba_search_term?: string
          basket_adds_basket_add_rate?: string | null
          basket_adds_brand_count?: number | null
          basket_adds_brand_share?: string | null
          basket_adds_total_count?: number | null
          brand?: string
          clicks?: number | null
          clicks_brand_count?: number | null
          clicks_brand_share?: string | null
          clicks_click_rate?: string | null
          clicks_total_count?: number | null
          cpc?: number | null
          ctr?: number | null
          cvr?: number | null
          exact_exists?: string | null
          has_ba?: string | null
          has_ppc?: string | null
          impressions?: number | null
          impressions_brand_count?: number | null
          impressions_brand_share?: string | null
          impressions_total_count?: number | null
          is_asin?: string | null
          keyword?: string | null
          orders?: number | null
          ppc_search_term?: string | null
          purchases_brand_count?: number | null
          purchases_brand_share?: string | null
          purchases_purchase_rate?: string | null
          purchases_total_count?: number | null
          sales?: number | null
          search_query_score?: number | null
          search_query_volume?: number | null
          source?: string | null
          spend?: number | null
          units?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      python_keyword_master_junk_backup: {
        Row: {
          acos: number | null
          ba_search_term: string | null
          basket_adds_basket_add_rate: string | null
          basket_adds_basket_add_rate_pct: number | null
          basket_adds_brand_count: number | null
          basket_adds_brand_share: string | null
          basket_adds_brand_share_pct: number | null
          basket_adds_total_count: number | null
          brand: string | null
          clicks: number | null
          clicks_brand_count: number | null
          clicks_brand_share: string | null
          clicks_brand_share_pct: number | null
          clicks_click_rate: string | null
          clicks_click_rate_pct: number | null
          clicks_total_count: number | null
          cpc: number | null
          ctr: number | null
          cvr: number | null
          exact_exists: string | null
          has_ba: string | null
          has_ppc: string | null
          impressions: number | null
          impressions_brand_count: number | null
          impressions_brand_share: string | null
          impressions_brand_share_pct: number | null
          impressions_total_count: number | null
          is_asin: string | null
          keyword: string | null
          orders: number | null
          ppc_search_term: string | null
          purchases_brand_count: number | null
          purchases_brand_share: string | null
          purchases_brand_share_pct: number | null
          purchases_purchase_rate: string | null
          purchases_purchase_rate_pct: number | null
          purchases_total_count: number | null
          sales: number | null
          search_query_score: number | null
          search_query_volume: number | null
          source: string | null
          spend: number | null
          units: number | null
          week_end: string | null
          week_start: string | null
        }
        Insert: {
          acos?: number | null
          ba_search_term?: string | null
          basket_adds_basket_add_rate?: string | null
          basket_adds_basket_add_rate_pct?: number | null
          basket_adds_brand_count?: number | null
          basket_adds_brand_share?: string | null
          basket_adds_brand_share_pct?: number | null
          basket_adds_total_count?: number | null
          brand?: string | null
          clicks?: number | null
          clicks_brand_count?: number | null
          clicks_brand_share?: string | null
          clicks_brand_share_pct?: number | null
          clicks_click_rate?: string | null
          clicks_click_rate_pct?: number | null
          clicks_total_count?: number | null
          cpc?: number | null
          ctr?: number | null
          cvr?: number | null
          exact_exists?: string | null
          has_ba?: string | null
          has_ppc?: string | null
          impressions?: number | null
          impressions_brand_count?: number | null
          impressions_brand_share?: string | null
          impressions_brand_share_pct?: number | null
          impressions_total_count?: number | null
          is_asin?: string | null
          keyword?: string | null
          orders?: number | null
          ppc_search_term?: string | null
          purchases_brand_count?: number | null
          purchases_brand_share?: string | null
          purchases_brand_share_pct?: number | null
          purchases_purchase_rate?: string | null
          purchases_purchase_rate_pct?: number | null
          purchases_total_count?: number | null
          sales?: number | null
          search_query_score?: number | null
          search_query_volume?: number | null
          source?: string | null
          spend?: number | null
          units?: number | null
          week_end?: string | null
          week_start?: string | null
        }
        Update: {
          acos?: number | null
          ba_search_term?: string | null
          basket_adds_basket_add_rate?: string | null
          basket_adds_basket_add_rate_pct?: number | null
          basket_adds_brand_count?: number | null
          basket_adds_brand_share?: string | null
          basket_adds_brand_share_pct?: number | null
          basket_adds_total_count?: number | null
          brand?: string | null
          clicks?: number | null
          clicks_brand_count?: number | null
          clicks_brand_share?: string | null
          clicks_brand_share_pct?: number | null
          clicks_click_rate?: string | null
          clicks_click_rate_pct?: number | null
          clicks_total_count?: number | null
          cpc?: number | null
          ctr?: number | null
          cvr?: number | null
          exact_exists?: string | null
          has_ba?: string | null
          has_ppc?: string | null
          impressions?: number | null
          impressions_brand_count?: number | null
          impressions_brand_share?: string | null
          impressions_brand_share_pct?: number | null
          impressions_total_count?: number | null
          is_asin?: string | null
          keyword?: string | null
          orders?: number | null
          ppc_search_term?: string | null
          purchases_brand_count?: number | null
          purchases_brand_share?: string | null
          purchases_brand_share_pct?: number | null
          purchases_purchase_rate?: string | null
          purchases_purchase_rate_pct?: number | null
          purchases_total_count?: number | null
          sales?: number | null
          search_query_score?: number | null
          search_query_volume?: number | null
          source?: string | null
          spend?: number | null
          units?: number | null
          week_end?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
      rank_tracking: {
        Row: {
          asin: string
          checked_at: string | null
          domain: string
          id: string
          is_prime: boolean | null
          is_sponsored: boolean | null
          keyword: string
          page: number | null
          position: number | null
          price: number | null
          total_results: number | null
        }
        Insert: {
          asin: string
          checked_at?: string | null
          domain?: string
          id?: string
          is_prime?: boolean | null
          is_sponsored?: boolean | null
          keyword: string
          page?: number | null
          position?: number | null
          price?: number | null
          total_results?: number | null
        }
        Update: {
          asin?: string
          checked_at?: string | null
          domain?: string
          id?: string
          is_prime?: boolean | null
          is_sponsored?: boolean | null
          keyword?: string
          page?: number | null
          position?: number | null
          price?: number | null
          total_results?: number | null
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          estimated_completion: string | null
          id: string
          implemented: boolean
          is_public: boolean
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_completion?: string | null
          id?: string
          implemented?: boolean
          is_public?: boolean
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_completion?: string | null
          id?: string
          implemented?: boolean
          is_public?: boolean
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_performance_alerts: {
        Row: {
          account_name: string
          acknowledged_at: string | null
          alert_type: string
          child_asin: string
          created_at: string | null
          current_revenue: number | null
          current_units: number | null
          detected_at: string | null
          id: string
          notes: string | null
          parent_asin: string | null
          previous_revenue: number | null
          previous_units: number | null
          record_date: string
          resolved_at: string | null
          revenue_change_amount: number | null
          revenue_change_pct: number | null
          severity: string
          status: string | null
          units_change_amount: number | null
          units_change_pct: number | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          acknowledged_at?: string | null
          alert_type: string
          child_asin: string
          created_at?: string | null
          current_revenue?: number | null
          current_units?: number | null
          detected_at?: string | null
          id?: string
          notes?: string | null
          parent_asin?: string | null
          previous_revenue?: number | null
          previous_units?: number | null
          record_date: string
          resolved_at?: string | null
          revenue_change_amount?: number | null
          revenue_change_pct?: number | null
          severity: string
          status?: string | null
          units_change_amount?: number | null
          units_change_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          acknowledged_at?: string | null
          alert_type?: string
          child_asin?: string
          created_at?: string | null
          current_revenue?: number | null
          current_units?: number | null
          detected_at?: string | null
          id?: string
          notes?: string | null
          parent_asin?: string | null
          previous_revenue?: number | null
          previous_units?: number | null
          record_date?: string
          resolved_at?: string | null
          revenue_change_amount?: number | null
          revenue_change_pct?: number | null
          severity?: string
          status?: string | null
          units_change_amount?: number | null
          units_change_pct?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sb_v2_backfill_queue: {
        Row: {
          account_name: string | null
          created_at: string | null
          date: string
          id: number
          processed_at: string | null
          profile_id: string
          status: string | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          date: string
          id?: number
          processed_at?: string | null
          profile_id: string
          status?: string | null
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          date?: string
          id?: number
          processed_at?: string | null
          profile_id?: string
          status?: string | null
        }
        Relationships: []
      }
      searchapi_cache: {
        Row: {
          account_id: string | null
          created_at: string | null
          engine: string
          expires_at: string | null
          id: string
          query_params: Json
          response_json: Json
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          engine: string
          expires_at?: string | null
          id?: string
          query_params: Json
          response_json: Json
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          engine?: string
          expires_at?: string | null
          id?: string
          query_params?: Json
          response_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "searchapi_cache_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      serp_rank_results: {
        Row: {
          ai_overview_cited: boolean
          client_id: number
          competitors: Json
          created_at: string
          engine: string
          error: string | null
          id: number
          in_ai_overview: boolean
          local_pack_rank: number | null
          location: string | null
          organic_position: number | null
          query: string
          query_id: number | null
          raw_response: Json | null
          run_id: number
          status: string
          tracking_tag: string | null
        }
        Insert: {
          ai_overview_cited?: boolean
          client_id?: number
          competitors?: Json
          created_at?: string
          engine: string
          error?: string | null
          id?: never
          in_ai_overview?: boolean
          local_pack_rank?: number | null
          location?: string | null
          organic_position?: number | null
          query: string
          query_id?: number | null
          raw_response?: Json | null
          run_id: number
          status?: string
          tracking_tag?: string | null
        }
        Update: {
          ai_overview_cited?: boolean
          client_id?: number
          competitors?: Json
          created_at?: string
          engine?: string
          error?: string | null
          id?: never
          in_ai_overview?: boolean
          local_pack_rank?: number | null
          location?: string | null
          organic_position?: number | null
          query?: string
          query_id?: number | null
          raw_response?: Json | null
          run_id?: number
          status?: string
          tracking_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serp_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_weight"
            referencedColumns: ["query_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_score"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_score"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_score_weighted"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_totals"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_sentiment"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_trend"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_competitor_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_competitor_query_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_serp_query_history"
            referencedColumns: ["run_id"]
          },
        ]
      }
      "SerpAPI-review_sentiment": {
        Row: {
          amazon_domain: string | null
          asin: string
          avg_rating: number | null
          competitor_comparisons: Json | null
          created_at: string | null
          example_quotes: Json | null
          id: string
          last_updated: string | null
          negative_themes: Json | null
          overall_sentiment: string | null
          positive_themes: Json | null
          product_brand: string | null
          product_title: string | null
          raw_serpapi_response: Json | null
          review_count: number | null
          sentiment_summary: string | null
          standout_features: Json | null
          star_distribution: Json | null
          unmet_needs: Json | null
        }
        Insert: {
          amazon_domain?: string | null
          asin: string
          avg_rating?: number | null
          competitor_comparisons?: Json | null
          created_at?: string | null
          example_quotes?: Json | null
          id?: string
          last_updated?: string | null
          negative_themes?: Json | null
          overall_sentiment?: string | null
          positive_themes?: Json | null
          product_brand?: string | null
          product_title?: string | null
          raw_serpapi_response?: Json | null
          review_count?: number | null
          sentiment_summary?: string | null
          standout_features?: Json | null
          star_distribution?: Json | null
          unmet_needs?: Json | null
        }
        Update: {
          amazon_domain?: string | null
          asin?: string
          avg_rating?: number | null
          competitor_comparisons?: Json | null
          created_at?: string | null
          example_quotes?: Json | null
          id?: string
          last_updated?: string | null
          negative_themes?: Json | null
          overall_sentiment?: string | null
          positive_themes?: Json | null
          product_brand?: string | null
          product_title?: string | null
          raw_serpapi_response?: Json | null
          review_count?: number | null
          sentiment_summary?: string | null
          standout_features?: Json | null
          star_distribution?: Json | null
          unmet_needs?: Json | null
        }
        Relationships: []
      }
      sp_api_credentials: {
        Row: {
          account_name: string | null
          account_type: string
          authorized_at: string
          ba_marketplaces: string[] | null
          brand_registry: boolean
          home_marketplace_id: string | null
          id: string
          lwa_app_id: string | null
          marketplace: string | null
          raw: Json | null
          refresh_token: string
          region: string
          selling_partner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_type?: string
          authorized_at?: string
          ba_marketplaces?: string[] | null
          brand_registry?: boolean
          home_marketplace_id?: string | null
          id?: string
          lwa_app_id?: string | null
          marketplace?: string | null
          raw?: Json | null
          refresh_token: string
          region?: string
          selling_partner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_type?: string
          authorized_at?: string
          ba_marketplaces?: string[] | null
          brand_registry?: boolean
          home_marketplace_id?: string | null
          id?: string
          lwa_app_id?: string | null
          marketplace?: string | null
          raw?: Json | null
          refresh_token?: string
          region?: string
          selling_partner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sp_api_sales_traffic_test: {
        Row: {
          account_name: string | null
          buybox_percentage: number | null
          currency: string | null
          id: string
          marketplace_id: string | null
          ordered_product_sales_amount: number | null
          page_views: number | null
          pulled_at: string
          raw: Json | null
          record_date: string | null
          selling_partner_id: string | null
          sessions: number | null
          total_order_items: number | null
          unit_session_percentage: number | null
          units_ordered: number | null
        }
        Insert: {
          account_name?: string | null
          buybox_percentage?: number | null
          currency?: string | null
          id?: string
          marketplace_id?: string | null
          ordered_product_sales_amount?: number | null
          page_views?: number | null
          pulled_at?: string
          raw?: Json | null
          record_date?: string | null
          selling_partner_id?: string | null
          sessions?: number | null
          total_order_items?: number | null
          unit_session_percentage?: number | null
          units_ordered?: number | null
        }
        Update: {
          account_name?: string | null
          buybox_percentage?: number | null
          currency?: string | null
          id?: string
          marketplace_id?: string | null
          ordered_product_sales_amount?: number | null
          page_views?: number | null
          pulled_at?: string
          raw?: Json | null
          record_date?: string | null
          selling_partner_id?: string | null
          sessions?: number | null
          total_order_items?: number | null
          unit_session_percentage?: number | null
          units_ordered?: number | null
        }
        Relationships: []
      }
      spapi_listings_stockprice_staging: {
        Row: {
          account_name: string
          asin: string | null
          country: string | null
          created_at: string | null
          fulfillment_channel: string | null
          id: string
          item_name: string | null
          marketplace_id: string | null
          open_date: string | null
          price: number | null
          quantity: number | null
          record_date: string
          seller_sku: string | null
          status: string | null
        }
        Insert: {
          account_name: string
          asin?: string | null
          country?: string | null
          created_at?: string | null
          fulfillment_channel?: string | null
          id?: string
          item_name?: string | null
          marketplace_id?: string | null
          open_date?: string | null
          price?: number | null
          quantity?: number | null
          record_date: string
          seller_sku?: string | null
          status?: string | null
        }
        Update: {
          account_name?: string
          asin?: string | null
          country?: string | null
          created_at?: string | null
          fulfillment_channel?: string | null
          id?: string
          item_name?: string | null
          marketplace_id?: string | null
          open_date?: string | null
          price?: number | null
          quantity?: number | null
          record_date?: string
          seller_sku?: string | null
          status?: string | null
        }
        Relationships: []
      }
      spapi_notification_subscriptions: {
        Row: {
          account_name: string
          created_at: string
          destination_id: string | null
          http_status: number | null
          id: number
          notification_type: string
          region: string | null
          subscription_id: string | null
        }
        Insert: {
          account_name: string
          created_at?: string
          destination_id?: string | null
          http_status?: number | null
          id?: never
          notification_type: string
          region?: string | null
          subscription_id?: string | null
        }
        Update: {
          account_name?: string
          created_at?: string
          destination_id?: string | null
          http_status?: number | null
          id?: never
          notification_type?: string
          region?: string | null
          subscription_id?: string | null
        }
        Relationships: []
      }
      st_sync_queue: {
        Row: {
          account_name: string | null
          amazon_report_id: string | null
          attempts: number | null
          created_at: string | null
          date_end: string | null
          date_start: string | null
          error: string | null
          id: string
          merchant_token: string | null
          region: string | null
          rows_upserted: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          amazon_report_id?: string | null
          attempts?: number | null
          created_at?: string | null
          date_end?: string | null
          date_start?: string | null
          error?: string | null
          id?: string
          merchant_token?: string | null
          region?: string | null
          rows_upserted?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          amazon_report_id?: string | null
          attempts?: number | null
          created_at?: string | null
          date_end?: string | null
          date_start?: string | null
          error?: string | null
          id?: string
          merchant_token?: string | null
          region?: string | null
          rows_upserted?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      steady_opt_accounts: {
        Row: {
          account_name: string
          approval_mode: string
          bid_ceiling: number
          bid_floor: number
          campaign_exclude: string[]
          cooldown_days: number
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          max_change_abs: number
          max_change_pct: number
          min_clicks_7d: number
          profile_id: number
          runs_per_week: number
          target_acos: number | null
          tracker_client_name: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          approval_mode?: string
          bid_ceiling?: number
          bid_floor?: number
          campaign_exclude?: string[]
          cooldown_days?: number
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          max_change_abs?: number
          max_change_pct?: number
          min_clicks_7d?: number
          profile_id: number
          runs_per_week?: number
          target_acos?: number | null
          tracker_client_name?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          approval_mode?: string
          bid_ceiling?: number
          bid_floor?: number
          campaign_exclude?: string[]
          cooldown_days?: number
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          max_change_abs?: number
          max_change_pct?: number
          min_clicks_7d?: number
          profile_id?: number
          runs_per_week?: number
          target_acos?: number | null
          tracker_client_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      steady_opt_changes: {
        Row: {
          account_name: string
          ad_group_id: number | null
          approved_at: string | null
          campaign_id: number
          campaign_name: string | null
          change_pct: number
          created_at: string
          direction: string
          evaluated_at: string | null
          id: string
          keyword_text: string | null
          metrics_after: Json | null
          metrics_before: Json | null
          new_bid: number
          old_bid: number
          pending_bid_id: string | null
          profile_id: number
          pushed_at: string | null
          reason: string
          run_id: string | null
          status: string
          target_id: number
          verdict: string | null
          verdict_detail: string | null
        }
        Insert: {
          account_name: string
          ad_group_id?: number | null
          approved_at?: string | null
          campaign_id: number
          campaign_name?: string | null
          change_pct: number
          created_at?: string
          direction: string
          evaluated_at?: string | null
          id?: string
          keyword_text?: string | null
          metrics_after?: Json | null
          metrics_before?: Json | null
          new_bid: number
          old_bid: number
          pending_bid_id?: string | null
          profile_id: number
          pushed_at?: string | null
          reason: string
          run_id?: string | null
          status?: string
          target_id: number
          verdict?: string | null
          verdict_detail?: string | null
        }
        Update: {
          account_name?: string
          ad_group_id?: number | null
          approved_at?: string | null
          campaign_id?: number
          campaign_name?: string | null
          change_pct?: number
          created_at?: string
          direction?: string
          evaluated_at?: string | null
          id?: string
          keyword_text?: string | null
          metrics_after?: Json | null
          metrics_before?: Json | null
          new_bid?: number
          old_bid?: number
          pending_bid_id?: string | null
          profile_id?: number
          pushed_at?: string | null
          reason?: string
          run_id?: string | null
          status?: string
          target_id?: number
          verdict?: string | null
          verdict_detail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "steady_opt_changes_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "steady_opt_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      steady_opt_config: {
        Row: {
          enabled: boolean
          id: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      steady_opt_runs: {
        Row: {
          account_name: string
          changes_proposed: number | null
          changes_pushed: number | null
          derived_target_acos: number | null
          dry_run: boolean
          eligible_targets: number | null
          error: string | null
          est_daily_spend_delta: number | null
          finished_at: string | null
          id: string
          profile_id: number
          run_date: string
          started_at: string
          status: string
          summary: string | null
          tracker_logged: boolean
        }
        Insert: {
          account_name: string
          changes_proposed?: number | null
          changes_pushed?: number | null
          derived_target_acos?: number | null
          dry_run?: boolean
          eligible_targets?: number | null
          error?: string | null
          est_daily_spend_delta?: number | null
          finished_at?: string | null
          id?: string
          profile_id: number
          run_date?: string
          started_at?: string
          status?: string
          summary?: string | null
          tracker_logged?: boolean
        }
        Update: {
          account_name?: string
          changes_proposed?: number | null
          changes_pushed?: number | null
          derived_target_acos?: number | null
          dry_run?: boolean
          eligible_targets?: number | null
          error?: string | null
          est_daily_spend_delta?: number | null
          finished_at?: string | null
          id?: string
          profile_id?: number
          run_date?: string
          started_at?: string
          status?: string
          summary?: string | null
          tracker_logged?: boolean
        }
        Relationships: []
      }
      stockout_events: {
        Row: {
          account_name: string
          asin: string | null
          created_at: string | null
          days_out_of_stock: number | null
          estimated_recovery_lost_revenue: number | null
          estimated_recovery_lost_units: number | null
          estimated_stockout_lost_revenue: number | null
          estimated_stockout_lost_units: number | null
          id: string
          pre_stockout_avg_price: number | null
          pre_stockout_daily_units: number | null
          product_name: string | null
          recovery_end_date: string | null
          recovery_period_days: number | null
          sku: string
          status: string | null
          stockout_end: string | null
          stockout_start: string
          total_estimated_lost_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          asin?: string | null
          created_at?: string | null
          days_out_of_stock?: number | null
          estimated_recovery_lost_revenue?: number | null
          estimated_recovery_lost_units?: number | null
          estimated_stockout_lost_revenue?: number | null
          estimated_stockout_lost_units?: number | null
          id?: string
          pre_stockout_avg_price?: number | null
          pre_stockout_daily_units?: number | null
          product_name?: string | null
          recovery_end_date?: string | null
          recovery_period_days?: number | null
          sku: string
          status?: string | null
          stockout_end?: string | null
          stockout_start: string
          total_estimated_lost_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          asin?: string | null
          created_at?: string | null
          days_out_of_stock?: number | null
          estimated_recovery_lost_revenue?: number | null
          estimated_recovery_lost_units?: number | null
          estimated_stockout_lost_revenue?: number | null
          estimated_stockout_lost_units?: number | null
          id?: string
          pre_stockout_avg_price?: number | null
          pre_stockout_daily_units?: number | null
          product_name?: string | null
          recovery_end_date?: string | null
          recovery_period_days?: number | null
          sku?: string
          status?: string | null
          stockout_end?: string | null
          stockout_start?: string
          total_estimated_lost_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sunshine_campaigns: {
        Row: {
          ad_type: string | null
          auto_approve: boolean | null
          auto_approve_max_change_pct: number | null
          auto_approve_min_confidence: number | null
          bid_ceiling: number | null
          bid_floor: number | null
          campaign_id: number | null
          campaign_name: string | null
          check_frequency: string | null
          created_at: string | null
          id: string
          low_vis_boost_cap: number | null
          max_acos_rampup: number | null
          max_bid_increase_pct: number | null
          non_convert_click_threshold: number | null
          non_convert_spend_threshold: number | null
          notes: string | null
          profile_id: number
          ramp_aggression: string | null
          rampup_end_date: string | null
          rampup_start_date: string | null
          sniper_boost_enabled: boolean | null
          sniper_boost_max_pct: number | null
          status: string
          sustain_start_date: string | null
          target_acos_sustain: number | null
          updated_at: string | null
          use_case: string | null
          winner_scale_enabled: boolean | null
        }
        Insert: {
          ad_type?: string | null
          auto_approve?: boolean | null
          auto_approve_max_change_pct?: number | null
          auto_approve_min_confidence?: number | null
          bid_ceiling?: number | null
          bid_floor?: number | null
          campaign_id?: number | null
          campaign_name?: string | null
          check_frequency?: string | null
          created_at?: string | null
          id?: string
          low_vis_boost_cap?: number | null
          max_acos_rampup?: number | null
          max_bid_increase_pct?: number | null
          non_convert_click_threshold?: number | null
          non_convert_spend_threshold?: number | null
          notes?: string | null
          profile_id: number
          ramp_aggression?: string | null
          rampup_end_date?: string | null
          rampup_start_date?: string | null
          sniper_boost_enabled?: boolean | null
          sniper_boost_max_pct?: number | null
          status?: string
          sustain_start_date?: string | null
          target_acos_sustain?: number | null
          updated_at?: string | null
          use_case?: string | null
          winner_scale_enabled?: boolean | null
        }
        Update: {
          ad_type?: string | null
          auto_approve?: boolean | null
          auto_approve_max_change_pct?: number | null
          auto_approve_min_confidence?: number | null
          bid_ceiling?: number | null
          bid_floor?: number | null
          campaign_id?: number | null
          campaign_name?: string | null
          check_frequency?: string | null
          created_at?: string | null
          id?: string
          low_vis_boost_cap?: number | null
          max_acos_rampup?: number | null
          max_bid_increase_pct?: number | null
          non_convert_click_threshold?: number | null
          non_convert_spend_threshold?: number | null
          notes?: string | null
          profile_id?: number
          ramp_aggression?: string | null
          rampup_end_date?: string | null
          rampup_start_date?: string | null
          sniper_boost_enabled?: boolean | null
          sniper_boost_max_pct?: number | null
          status?: string
          sustain_start_date?: string | null
          target_acos_sustain?: number | null
          updated_at?: string | null
          use_case?: string | null
          winner_scale_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sunshine_campaigns_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "amazon_api_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      sunshine_competitor_events: {
        Row: {
          asin: string | null
          brand: string | null
          consumed_by_engine: boolean
          detail: string | null
          details: Json | null
          detected_at: string | null
          event_type: string
          from_value: number | null
          id: string
          keyword: string | null
          keyword_text: string
          observed_at: string
          profile_id: string
          run_id: string | null
          severity: string
          to_value: number | null
          watchlist_id: string | null
        }
        Insert: {
          asin?: string | null
          brand?: string | null
          consumed_by_engine?: boolean
          detail?: string | null
          details?: Json | null
          detected_at?: string | null
          event_type: string
          from_value?: number | null
          id?: string
          keyword?: string | null
          keyword_text: string
          observed_at?: string
          profile_id: string
          run_id?: string | null
          severity?: string
          to_value?: number | null
          watchlist_id?: string | null
        }
        Update: {
          asin?: string | null
          brand?: string | null
          consumed_by_engine?: boolean
          detail?: string | null
          details?: Json | null
          detected_at?: string | null
          event_type?: string
          from_value?: number | null
          id?: string
          keyword?: string | null
          keyword_text?: string
          observed_at?: string
          profile_id?: string
          run_id?: string | null
          severity?: string
          to_value?: number | null
          watchlist_id?: string | null
        }
        Relationships: []
      }
      sunshine_competitor_keywords: {
        Row: {
          actioned: boolean | null
          competitor_asin: string | null
          competitor_name: string | null
          competitor_organic_rank: number | null
          discovered_at: string | null
          id: string
          keyword: string
          opportunity_score: number | null
          profile_id: number
          search_volume: number | null
          sunshine_campaign_id: string | null
          your_organic_rank: number | null
          your_ppc_impression_share: number | null
        }
        Insert: {
          actioned?: boolean | null
          competitor_asin?: string | null
          competitor_name?: string | null
          competitor_organic_rank?: number | null
          discovered_at?: string | null
          id?: string
          keyword: string
          opportunity_score?: number | null
          profile_id: number
          search_volume?: number | null
          sunshine_campaign_id?: string | null
          your_organic_rank?: number | null
          your_ppc_impression_share?: number | null
        }
        Update: {
          actioned?: boolean | null
          competitor_asin?: string | null
          competitor_name?: string | null
          competitor_organic_rank?: number | null
          discovered_at?: string | null
          id?: string
          keyword?: string
          opportunity_score?: number | null
          profile_id?: number
          search_volume?: number | null
          sunshine_campaign_id?: string | null
          your_organic_rank?: number | null
          your_ppc_impression_share?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sunshine_competitor_keywords_sunshine_campaign_id_fkey"
            columns: ["sunshine_campaign_id"]
            isOneToOne: false
            referencedRelation: "sunshine_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sunshine_competitor_presence: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_in_stock: boolean | null
          keyword: string
          organic_rank: number | null
          overall_rank: number | null
          price: number | null
          run_id: string | null
          search_volume: number | null
          snapshot_date: string
          sov_organic: number | null
          sov_sponsored: number | null
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword?: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunshine_competitor_presence_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      sunshine_competitor_presence_2026_03: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_in_stock: boolean | null
          keyword: string
          organic_rank: number | null
          overall_rank: number | null
          price: number | null
          run_id: string | null
          search_volume: number | null
          snapshot_date: string
          sov_organic: number | null
          sov_sponsored: number | null
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword?: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: []
      }
      sunshine_competitor_presence_2026_04: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_in_stock: boolean | null
          keyword: string
          organic_rank: number | null
          overall_rank: number | null
          price: number | null
          run_id: string | null
          search_volume: number | null
          snapshot_date: string
          sov_organic: number | null
          sov_sponsored: number | null
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword?: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: []
      }
      sunshine_competitor_presence_2026_05: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_in_stock: boolean | null
          keyword: string
          organic_rank: number | null
          overall_rank: number | null
          price: number | null
          run_id: string | null
          search_volume: number | null
          snapshot_date: string
          sov_organic: number | null
          sov_sponsored: number | null
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword?: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: []
      }
      sunshine_competitor_presence_2026_06: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_in_stock: boolean | null
          keyword: string
          organic_rank: number | null
          overall_rank: number | null
          price: number | null
          run_id: string | null
          search_volume: number | null
          snapshot_date: string
          sov_organic: number | null
          sov_sponsored: number | null
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword?: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: []
      }
      sunshine_competitor_presence_2026_07: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_in_stock: boolean | null
          keyword: string
          organic_rank: number | null
          overall_rank: number | null
          price: number | null
          run_id: string | null
          search_volume: number | null
          snapshot_date: string
          sov_organic: number | null
          sov_sponsored: number | null
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword?: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: []
      }
      sunshine_competitor_presence_2026_08: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_in_stock: boolean | null
          keyword: string
          organic_rank: number | null
          overall_rank: number | null
          price: number | null
          run_id: string | null
          search_volume: number | null
          snapshot_date: string
          sov_organic: number | null
          sov_sponsored: number | null
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword?: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: []
      }
      sunshine_competitor_presence_2026_09: {
        Row: {
          asin: string
          created_at: string
          id: string
          is_in_stock: boolean | null
          keyword: string
          organic_rank: number | null
          overall_rank: number | null
          price: number | null
          run_id: string | null
          search_volume: number | null
          snapshot_date: string
          sov_organic: number | null
          sov_sponsored: number | null
          sponsored_rank: number | null
          watchlist_id: string
        }
        Insert: {
          asin: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id: string
        }
        Update: {
          asin?: string
          created_at?: string
          id?: string
          is_in_stock?: boolean | null
          keyword?: string
          organic_rank?: number | null
          overall_rank?: number | null
          price?: number | null
          run_id?: string | null
          search_volume?: number | null
          snapshot_date?: string
          sov_organic?: number | null
          sov_sponsored?: number | null
          sponsored_rank?: number | null
          watchlist_id?: string
        }
        Relationships: []
      }
      sunshine_competitor_runs: {
        Row: {
          calls_remaining_month: number | null
          calls_used: number
          completed_at: string | null
          errors: string[]
          id: string
          profile_id: string
          projected_monthly_cost: number | null
          run_type: string
          started_at: string
          status: string
        }
        Insert: {
          calls_remaining_month?: number | null
          calls_used?: number
          completed_at?: string | null
          errors: string[]
          id?: string
          profile_id: string
          projected_monthly_cost?: number | null
          run_type?: string
          started_at?: string
          status?: string
        }
        Update: {
          calls_remaining_month?: number | null
          calls_used?: number
          completed_at?: string | null
          errors?: string[]
          id?: string
          profile_id?: string
          projected_monthly_cost?: number | null
          run_type?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      sunshine_competitor_snapshots: {
        Row: {
          endpoint: string
          fetched_at: string
          id: string
          parsed_at: string | null
          profile_id: string
          raw_json: Json | null
          request_key: string
          status: string
        }
        Insert: {
          endpoint: string
          fetched_at?: string
          id?: string
          parsed_at?: string | null
          profile_id: string
          raw_json?: Json | null
          request_key: string
          status?: string
        }
        Update: {
          endpoint?: string
          fetched_at?: string
          id?: string
          parsed_at?: string | null
          profile_id?: string
          raw_json?: Json | null
          request_key?: string
          status?: string
        }
        Relationships: []
      }
      sunshine_competitor_targets: {
        Row: {
          check_frequency_hours: number
          created_at: string
          id: string
          is_active: boolean
          keyword: string | null
          keyword_text: string
          last_checked_at: string | null
          last_scanned_at: string | null
          next_check_at: string | null
          profile_id: string
          source: string
          tier: string | null
          tracking_tier: string
          watchlist_id: string | null
        }
        Insert: {
          check_frequency_hours?: number
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string | null
          keyword_text: string
          last_checked_at?: string | null
          last_scanned_at?: string | null
          next_check_at?: string | null
          profile_id: string
          source?: string
          tier?: string | null
          tracking_tier?: string
          watchlist_id?: string | null
        }
        Update: {
          check_frequency_hours?: number
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string | null
          keyword_text?: string
          last_checked_at?: string | null
          last_scanned_at?: string | null
          next_check_at?: string | null
          profile_id?: string
          source?: string
          tier?: string | null
          tracking_tier?: string
          watchlist_id?: string | null
        }
        Relationships: []
      }
      sunshine_competitor_tasks: {
        Row: {
          attempts: number
          claimed_at: string | null
          completed_at: string | null
          dead_letter_at: string | null
          dead_letter_reason: string | null
          id: string
          payload: Json
          run_id: string | null
          status: string
          task_type: string
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          dead_letter_at?: string | null
          dead_letter_reason?: string | null
          id?: string
          payload?: Json
          run_id?: string | null
          status?: string
          task_type: string
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          completed_at?: string | null
          dead_letter_at?: string | null
          dead_letter_reason?: string | null
          id?: string
          payload?: Json
          run_id?: string | null
          status?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunshine_competitor_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "sunshine_competitor_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sunshine_competitor_watchlists: {
        Row: {
          aggression_level: string
          conquest_acos_multiplier: number
          conquest_budget_daily: number | null
          created_at: string
          id: string
          marketplace: string
          max_daily_bid_delta_pct: number
          name: string | null
          profile_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          aggression_level?: string
          conquest_acos_multiplier?: number
          conquest_budget_daily?: number | null
          created_at?: string
          id?: string
          marketplace?: string
          max_daily_bid_delta_pct?: number
          name?: string | null
          profile_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          aggression_level?: string
          conquest_acos_multiplier?: number
          conquest_budget_daily?: number | null
          created_at?: string
          id?: string
          marketplace?: string
          max_daily_bid_delta_pct?: number
          name?: string | null
          profile_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sunshine_competitors: {
        Row: {
          asin: string | null
          competitor_type: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          status: string | null
          value: string
          watchlist_id: string
        }
        Insert: {
          asin?: string | null
          competitor_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          status?: string | null
          value: string
          watchlist_id: string
        }
        Update: {
          asin?: string | null
          competitor_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          status?: string | null
          value?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunshine_competitors_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "sunshine_competitor_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      sunshine_log: {
        Row: {
          acos: number | null
          action_type: string
          ad_group_id: number | null
          bid_pushed: boolean | null
          campaign_id: number
          clicks_7d: number | null
          cpi_value: number | null
          executed_at: string | null
          id: string
          impressions_7d: number | null
          influenced_by_competitor: boolean
          keyword_text: string | null
          model_used: string | null
          new_value: number | null
          old_value: number | null
          reason: string | null
          success: boolean | null
          sunshine_campaign_id: string | null
          target_id: number | null
        }
        Insert: {
          acos?: number | null
          action_type: string
          ad_group_id?: number | null
          bid_pushed?: boolean | null
          campaign_id: number
          clicks_7d?: number | null
          cpi_value?: number | null
          executed_at?: string | null
          id?: string
          impressions_7d?: number | null
          influenced_by_competitor?: boolean
          keyword_text?: string | null
          model_used?: string | null
          new_value?: number | null
          old_value?: number | null
          reason?: string | null
          success?: boolean | null
          sunshine_campaign_id?: string | null
          target_id?: number | null
        }
        Update: {
          acos?: number | null
          action_type?: string
          ad_group_id?: number | null
          bid_pushed?: boolean | null
          campaign_id?: number
          clicks_7d?: number | null
          cpi_value?: number | null
          executed_at?: string | null
          id?: string
          impressions_7d?: number | null
          influenced_by_competitor?: boolean
          keyword_text?: string | null
          model_used?: string | null
          new_value?: number | null
          old_value?: number | null
          reason?: string | null
          success?: boolean | null
          sunshine_campaign_id?: string | null
          target_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sunshine_log_sunshine_campaign_id_fkey"
            columns: ["sunshine_campaign_id"]
            isOneToOne: false
            referencedRelation: "sunshine_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sunshine_log_competitor_events: {
        Row: {
          competitor_event_id: string
          id: string
          log_id: string
        }
        Insert: {
          competitor_event_id: string
          id?: string
          log_id: string
        }
        Update: {
          competitor_event_id?: string
          id?: string
          log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunshine_log_competitor_events_competitor_event_id_fkey"
            columns: ["competitor_event_id"]
            isOneToOne: false
            referencedRelation: "sunshine_competitor_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sunshine_log_competitor_events_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "sunshine_log"
            referencedColumns: ["id"]
          },
        ]
      }
      sunshine_pending_bids: {
        Row: {
          account_name: string | null
          ad_group_id: number | null
          campaign_id: number
          created_at: string
          current_bid: number | null
          id: string
          keyword_text: string | null
          profile_id: number
          pushed_at: string | null
          reason: string | null
          recommended_bid: number
          retry_count: number
          source: string
          status: string
          sunshine_campaign_id: string | null
          target_id: number | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id: number
          created_at?: string
          current_bid?: number | null
          id?: string
          keyword_text?: string | null
          profile_id: number
          pushed_at?: string | null
          reason?: string | null
          recommended_bid: number
          retry_count?: number
          source?: string
          status?: string
          sunshine_campaign_id?: string | null
          target_id?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          ad_group_id?: number | null
          campaign_id?: number
          created_at?: string
          current_bid?: number | null
          id?: string
          keyword_text?: string | null
          profile_id?: number
          pushed_at?: string | null
          reason?: string | null
          recommended_bid?: number
          retry_count?: number
          source?: string
          status?: string
          sunshine_campaign_id?: string | null
          target_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sunshine_pending_bids_sunshine_campaign_id_fkey"
            columns: ["sunshine_campaign_id"]
            isOneToOne: false
            referencedRelation: "sunshine_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sunshine_write_lock: {
        Row: {
          campaign_id: number
          expires_at: string
          id: string
          keyword_text: string
          locked_at: string
          locked_by: string
        }
        Insert: {
          campaign_id: number
          expires_at?: string
          id?: string
          keyword_text: string
          locked_at?: string
          locked_by: string
        }
        Update: {
          campaign_id?: number
          expires_at?: string
          id?: string
          keyword_text?: string
          locked_at?: string
          locked_by?: string
        }
        Relationships: []
      }
      sync_execution_log: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: number
          response_body: string | null
          response_status: number | null
          started_at: string | null
          status: string | null
          sync_name: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: number
          response_body?: string | null
          response_status?: number | null
          started_at?: string | null
          status?: string | null
          sync_name: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: number
          response_body?: string | null
          response_status?: number | null
          started_at?: string | null
          status?: string | null
          sync_name?: string
        }
        Relationships: []
      }
      system_reminders: {
        Row: {
          action_sql: string | null
          completed: boolean | null
          created_at: string | null
          description: string
          id: number
          reminder_date: string
        }
        Insert: {
          action_sql?: string | null
          completed?: boolean | null
          created_at?: string | null
          description: string
          id?: number
          reminder_date: string
        }
        Update: {
          action_sql?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string
          id?: number
          reminder_date?: string
        }
        Relationships: []
      }
      tracked_competitors: {
        Row: {
          category: string | null
          competitor_asin: string
          competitor_name: string | null
          created_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          our_asin: string
        }
        Insert: {
          category?: string | null
          competitor_asin: string
          competitor_name?: string | null
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          our_asin: string
        }
        Update: {
          category?: string | null
          competitor_asin?: string
          competitor_name?: string | null
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          our_asin?: string
        }
        Relationships: []
      }
      tracked_keywords: {
        Row: {
          asin: string
          created_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          keyword: string
        }
        Insert: {
          asin: string
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          keyword: string
        }
        Update: {
          asin?: string
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          keyword?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vendor_daily_metrics: {
        Row: {
          account_name: string
          asin: string
          average_sales_discount: number | null
          average_selling_price: number | null
          confirmed_units: number | null
          contra_cogs: number | null
          contra_cogs_per_unit: number | null
          created_at: string
          currency: string | null
          customer_returns: number | null
          glance_views: number | null
          lost_featured_offer: number | null
          marketplace_id: string
          most_recent_submitted: number | null
          net_ordered_gms: number | null
          net_ppm: number | null
          net_received_units: number | null
          net_received_value: number | null
          net_shipment_gms: number | null
          open_purchase_order_qty: number | null
          ordered_revenue: number | null
          ordered_units: number | null
          overall_vendor_lead_time: number | null
          procurable_product_oos: number | null
          raw: Json | null
          received_fill_rate: number | null
          record_date: string
          sales_discount: number | null
          selling_partner_id: string | null
          shipped_cogs: number | null
          shipped_revenue: number | null
          shipped_units: number | null
          unfilled_ordered_units: number | null
          updated_at: string
          vendor_confirmation_rate: number | null
          view_name: string
        }
        Insert: {
          account_name: string
          asin: string
          average_sales_discount?: number | null
          average_selling_price?: number | null
          confirmed_units?: number | null
          contra_cogs?: number | null
          contra_cogs_per_unit?: number | null
          created_at?: string
          currency?: string | null
          customer_returns?: number | null
          glance_views?: number | null
          lost_featured_offer?: number | null
          marketplace_id: string
          most_recent_submitted?: number | null
          net_ordered_gms?: number | null
          net_ppm?: number | null
          net_received_units?: number | null
          net_received_value?: number | null
          net_shipment_gms?: number | null
          open_purchase_order_qty?: number | null
          ordered_revenue?: number | null
          ordered_units?: number | null
          overall_vendor_lead_time?: number | null
          procurable_product_oos?: number | null
          raw?: Json | null
          received_fill_rate?: number | null
          record_date: string
          sales_discount?: number | null
          selling_partner_id?: string | null
          shipped_cogs?: number | null
          shipped_revenue?: number | null
          shipped_units?: number | null
          unfilled_ordered_units?: number | null
          updated_at?: string
          vendor_confirmation_rate?: number | null
          view_name?: string
        }
        Update: {
          account_name?: string
          asin?: string
          average_sales_discount?: number | null
          average_selling_price?: number | null
          confirmed_units?: number | null
          contra_cogs?: number | null
          contra_cogs_per_unit?: number | null
          created_at?: string
          currency?: string | null
          customer_returns?: number | null
          glance_views?: number | null
          lost_featured_offer?: number | null
          marketplace_id?: string
          most_recent_submitted?: number | null
          net_ordered_gms?: number | null
          net_ppm?: number | null
          net_received_units?: number | null
          net_received_value?: number | null
          net_shipment_gms?: number | null
          open_purchase_order_qty?: number | null
          ordered_revenue?: number | null
          ordered_units?: number | null
          overall_vendor_lead_time?: number | null
          procurable_product_oos?: number | null
          raw?: Json | null
          received_fill_rate?: number | null
          record_date?: string
          sales_discount?: number | null
          selling_partner_id?: string | null
          shipped_cogs?: number | null
          shipped_revenue?: number | null
          shipped_units?: number | null
          unfilled_ordered_units?: number | null
          updated_at?: string
          vendor_confirmation_rate?: number | null
          view_name?: string
        }
        Relationships: []
      }
      vendor_dk_jobs: {
        Row: {
          account_name: string
          attempts: number
          created_at: string
          currency: string
          end_date: string
          error: string | null
          id: string
          is_backfill: boolean
          query_id: string | null
          region: string
          rows_inserted: number | null
          selling_partner_id: string | null
          start_date: string
          status: string
          updated_at: string
          view_name: string
        }
        Insert: {
          account_name: string
          attempts?: number
          created_at?: string
          currency?: string
          end_date: string
          error?: string | null
          id?: string
          is_backfill?: boolean
          query_id?: string | null
          region?: string
          rows_inserted?: number | null
          selling_partner_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
          view_name?: string
        }
        Update: {
          account_name?: string
          attempts?: number
          created_at?: string
          currency?: string
          end_date?: string
          error?: string | null
          id?: string
          is_backfill?: boolean
          query_id?: string | null
          region?: string
          rows_inserted?: number | null
          selling_partner_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          view_name?: string
        }
        Relationships: []
      }
      vendor_inventory_data: {
        Row: {
          account_id: string | null
          account_name: string
          asin: string
          average_vendor_lead_time_days: number | null
          id: string
          marketplace_country: string | null
          net_received_inventory_units: number | null
          open_purchase_order_units: number | null
          procurable_product_out_of_stock_rate: number | null
          product_title: string | null
          receive_fill_rate: number | null
          record_date: string
          sell_through_rate: number | null
          sellable_on_hand_cost: number | null
          sellable_on_hand_units: number | null
          synced_at: string | null
          unfilled_customer_ordered_units: number | null
          unhealthy_inventory_units: number | null
          unsellable_on_hand_units: number | null
          vendor_confirmation_rate: number | null
        }
        Insert: {
          account_id?: string | null
          account_name: string
          asin: string
          average_vendor_lead_time_days?: number | null
          id?: string
          marketplace_country?: string | null
          net_received_inventory_units?: number | null
          open_purchase_order_units?: number | null
          procurable_product_out_of_stock_rate?: number | null
          product_title?: string | null
          receive_fill_rate?: number | null
          record_date: string
          sell_through_rate?: number | null
          sellable_on_hand_cost?: number | null
          sellable_on_hand_units?: number | null
          synced_at?: string | null
          unfilled_customer_ordered_units?: number | null
          unhealthy_inventory_units?: number | null
          unsellable_on_hand_units?: number | null
          vendor_confirmation_rate?: number | null
        }
        Update: {
          account_id?: string | null
          account_name?: string
          asin?: string
          average_vendor_lead_time_days?: number | null
          id?: string
          marketplace_country?: string | null
          net_received_inventory_units?: number | null
          open_purchase_order_units?: number | null
          procurable_product_out_of_stock_rate?: number | null
          product_title?: string | null
          receive_fill_rate?: number | null
          record_date?: string
          sell_through_rate?: number | null
          sellable_on_hand_cost?: number | null
          sellable_on_hand_units?: number | null
          synced_at?: string | null
          unfilled_customer_ordered_units?: number | null
          unhealthy_inventory_units?: number | null
          unsellable_on_hand_units?: number | null
          vendor_confirmation_rate?: number | null
        }
        Relationships: []
      }
      vendor_review_jobs: {
        Row: {
          account_name: string
          attempts: number
          created_at: string
          end_date: string
          error: string | null
          grain: string
          id: string
          query_id: string | null
          region: string
          rows_inserted: number | null
          selling_partner_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          attempts?: number
          created_at?: string
          end_date: string
          error?: string | null
          grain?: string
          id?: string
          query_id?: string | null
          region?: string
          rows_inserted?: number | null
          selling_partner_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          attempts?: number
          created_at?: string
          end_date?: string
          error?: string | null
          grain?: string
          id?: string
          query_id?: string | null
          region?: string
          rows_inserted?: number | null
          selling_partner_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_review_return_topics: {
        Row: {
          account_name: string
          asin: string
          browse_node_review_topics: Json | null
          customer_returns: number | null
          grain: string
          marketplace_id: string
          negative_review_topic_trends: Json | null
          negative_review_topics: Json | null
          negative_topic_star_impact: Json | null
          period_end: string
          period_start: string
          positive_review_topic_trends: Json | null
          positive_review_topics: Json | null
          positive_topic_star_impact: Json | null
          pulled_at: string
          raw: Json | null
          return_topic_trends: Json | null
          return_topics: Json | null
          selling_partner_id: string | null
        }
        Insert: {
          account_name: string
          asin: string
          browse_node_review_topics?: Json | null
          customer_returns?: number | null
          grain: string
          marketplace_id: string
          negative_review_topic_trends?: Json | null
          negative_review_topics?: Json | null
          negative_topic_star_impact?: Json | null
          period_end: string
          period_start: string
          positive_review_topic_trends?: Json | null
          positive_review_topics?: Json | null
          positive_topic_star_impact?: Json | null
          pulled_at?: string
          raw?: Json | null
          return_topic_trends?: Json | null
          return_topics?: Json | null
          selling_partner_id?: string | null
        }
        Update: {
          account_name?: string
          asin?: string
          browse_node_review_topics?: Json | null
          customer_returns?: number | null
          grain?: string
          marketplace_id?: string
          negative_review_topic_trends?: Json | null
          negative_review_topics?: Json | null
          negative_topic_star_impact?: Json | null
          period_end?: string
          period_start?: string
          positive_review_topic_trends?: Json | null
          positive_review_topics?: Json | null
          positive_topic_star_impact?: Json | null
          pulled_at?: string
          raw?: Json | null
          return_topic_trends?: Json | null
          return_topics?: Json | null
          selling_partner_id?: string | null
        }
        Relationships: []
      }
      weak_parent_report: {
        Row: {
          char_len: number | null
          child_asins: string | null
          child_count: number | null
          parent_asin: string | null
          parent_title: string | null
          portwest_children: number | null
          word_count: number | null
          wwd_children: number | null
        }
        Insert: {
          char_len?: number | null
          child_asins?: string | null
          child_count?: number | null
          parent_asin?: string | null
          parent_title?: string | null
          portwest_children?: number | null
          word_count?: number | null
          wwd_children?: number | null
        }
        Update: {
          char_len?: number | null
          child_asins?: string | null
          child_count?: number | null
          parent_asin?: string | null
          parent_title?: string | null
          portwest_children?: number | null
          word_count?: number | null
          wwd_children?: number | null
        }
        Relationships: []
      }
      windsor_drain_progress: {
        Row: {
          checked_at: string
          delta: number | null
          id: number
          missing_cells: number
          note: string | null
          recent_fail: boolean | null
        }
        Insert: {
          checked_at?: string
          delta?: number | null
          id?: number
          missing_cells: number
          note?: string | null
          recent_fail?: boolean | null
        }
        Update: {
          checked_at?: string
          delta?: number | null
          id?: number
          missing_cells?: number
          note?: string | null
          recent_fail?: boolean | null
        }
        Relationships: []
      }
      windsor_marketplace_map: {
        Row: {
          base_token: string
          marketplace: string
          windsor_account: string
        }
        Insert: {
          base_token: string
          marketplace: string
          windsor_account: string
        }
        Update: {
          base_token?: string
          marketplace?: string
          windsor_account?: string
        }
        Relationships: []
      }
      WM_alerts: {
        Row: {
          account_id: string
          asin: string | null
          id: string
          marketplace: string | null
          note: string | null
          raised_at: string
          run_id: string | null
          seller_name: string | null
          severity: string
          status: string
          type: string
        }
        Insert: {
          account_id: string
          asin?: string | null
          id?: string
          marketplace?: string | null
          note?: string | null
          raised_at?: string
          run_id?: string | null
          seller_name?: string | null
          severity?: string
          status?: string
          type: string
        }
        Update: {
          account_id?: string
          asin?: string | null
          id?: string
          marketplace?: string | null
          note?: string | null
          raised_at?: string
          run_id?: string | null
          seller_name?: string | null
          severity?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "WM_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "WM_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "WM_scan_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      WM_offers: {
        Row: {
          account_id: string
          asin: string
          captured_at: string
          currency: string | null
          first_seen: string | null
          fulfilment: string | null
          id: string
          is_buybox: boolean
          marketplace: string
          price: number | null
          run_id: string | null
          seller_id: string | null
          seller_name: string | null
        }
        Insert: {
          account_id: string
          asin: string
          captured_at?: string
          currency?: string | null
          first_seen?: string | null
          fulfilment?: string | null
          id?: string
          is_buybox?: boolean
          marketplace?: string
          price?: number | null
          run_id?: string | null
          seller_id?: string | null
          seller_name?: string | null
        }
        Update: {
          account_id?: string
          asin?: string
          captured_at?: string
          currency?: string | null
          first_seen?: string | null
          fulfilment?: string | null
          id?: string
          is_buybox?: boolean
          marketplace?: string
          price?: number | null
          run_id?: string | null
          seller_id?: string | null
          seller_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "WM_offers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "WM_offers_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "WM_scan_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      WM_resellers: {
        Row: {
          account_id: string
          created_at: string
          id: string
          last_contacted: string | null
          name: string
          notes: string | null
          permitted_territory: string | null
          relationship: string
          seller_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          last_contacted?: string | null
          name: string
          notes?: string | null
          permitted_territory?: string | null
          relationship?: string
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          last_contacted?: string | null
          name?: string
          notes?: string | null
          permitted_territory?: string | null
          relationship?: string
          seller_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "WM_resellers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      WM_scan_config: {
        Row: {
          account_id: string
          cadence: string
          enabled: boolean
          last_scan_at: string | null
          marketplaces: string[]
          next_scan_at: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          cadence?: string
          enabled?: boolean
          last_scan_at?: string | null
          marketplaces?: string[]
          next_scan_at?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          cadence?: string
          enabled?: boolean
          last_scan_at?: string | null
          marketplaces?: string[]
          next_scan_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "WM_scan_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      WM_scan_runs: {
        Row: {
          account_id: string
          alerts_raised: number
          asin_count: number
          completed_at: string | null
          credits_spent: number
          error: string | null
          id: string
          marketplace: string | null
          new_sellers_found: number
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          account_id: string
          alerts_raised?: number
          asin_count?: number
          completed_at?: string | null
          credits_spent?: number
          error?: string | null
          id?: string
          marketplace?: string | null
          new_sellers_found?: number
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Update: {
          account_id?: string
          alerts_raised?: number
          asin_count?: number
          completed_at?: string | null
          credits_spent?: number
          error?: string | null
          id?: string
          marketplace?: string | null
          new_sellers_found?: number
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "WM_scan_runs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      WM_watch_asins: {
        Row: {
          account_id: string
          active: boolean
          asin: string
          created_at: string
          ean: string | null
          id: string
          image_url: string | null
          is_own_listing: boolean
          marketplace: string
          title: string | null
        }
        Insert: {
          account_id: string
          active?: boolean
          asin: string
          created_at?: string
          ean?: string | null
          id?: string
          image_url?: string | null
          is_own_listing?: boolean
          marketplace?: string
          title?: string | null
        }
        Update: {
          account_id?: string
          active?: boolean
          asin?: string
          created_at?: string
          ean?: string | null
          id?: string
          image_url?: string | null
          is_own_listing?: boolean
          marketplace?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "WM_watch_asins_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_master"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_account_mapping: {
        Row: {
          account_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_mapped: boolean | null
          updated_at: string | null
          xero_contact_id: string | null
          xero_contact_name: string | null
        }
        Insert: {
          account_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_mapped?: boolean | null
          updated_at?: string | null
          xero_contact_id?: string | null
          xero_contact_name?: string | null
        }
        Update: {
          account_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_mapped?: boolean | null
          updated_at?: string | null
          xero_contact_id?: string | null
          xero_contact_name?: string | null
        }
        Relationships: []
      }
      xero_client_payment_grades: {
        Row: {
          client_name: string
          created_at: string | null
          grade: string
          grade_reason: string | null
          id: string
          invoice_count: number | null
          last_payment_date: string | null
          last_synced_at: string | null
          max_days_overdue: number | null
          oldest_unpaid_date: string | null
          overdue_amount: number | null
          overdue_invoice_count: number | null
          total_owed: number | null
          updated_at: string | null
          xero_contact_id: string
        }
        Insert: {
          client_name: string
          created_at?: string | null
          grade?: string
          grade_reason?: string | null
          id?: string
          invoice_count?: number | null
          last_payment_date?: string | null
          last_synced_at?: string | null
          max_days_overdue?: number | null
          oldest_unpaid_date?: string | null
          overdue_amount?: number | null
          overdue_invoice_count?: number | null
          total_owed?: number | null
          updated_at?: string | null
          xero_contact_id: string
        }
        Update: {
          client_name?: string
          created_at?: string | null
          grade?: string
          grade_reason?: string | null
          id?: string
          invoice_count?: number | null
          last_payment_date?: string | null
          last_synced_at?: string | null
          max_days_overdue?: number | null
          oldest_unpaid_date?: string | null
          overdue_amount?: number | null
          overdue_invoice_count?: number | null
          total_owed?: number | null
          updated_at?: string | null
          xero_contact_id?: string
        }
        Relationships: []
      }
      xero_contacts: {
        Row: {
          account_number: string | null
          contact_name: string
          contact_status: string | null
          created_at: string | null
          email: string | null
          id: string
          is_customer: boolean | null
          is_supplier: boolean | null
          last_synced_at: string | null
          outstanding_balance: number | null
          overdue_balance: number | null
          phone: string | null
          updated_at: string | null
          xero_contact_id: string
        }
        Insert: {
          account_number?: string | null
          contact_name: string
          contact_status?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_customer?: boolean | null
          is_supplier?: boolean | null
          last_synced_at?: string | null
          outstanding_balance?: number | null
          overdue_balance?: number | null
          phone?: string | null
          updated_at?: string | null
          xero_contact_id: string
        }
        Update: {
          account_number?: string | null
          contact_name?: string
          contact_status?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_customer?: boolean | null
          is_supplier?: boolean | null
          last_synced_at?: string | null
          outstanding_balance?: number | null
          overdue_balance?: number | null
          phone?: string | null
          updated_at?: string | null
          xero_contact_id?: string
        }
        Relationships: []
      }
      xero_invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          contact_name: string
          created_at: string | null
          currency_code: string | null
          date: string | null
          due_date: string | null
          fully_paid_on_date: string | null
          id: string
          invoice_number: string | null
          invoice_type: string | null
          last_synced_at: string | null
          status: string | null
          total: number | null
          updated_at: string | null
          xero_contact_id: string
          xero_invoice_id: string
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          contact_name: string
          created_at?: string | null
          currency_code?: string | null
          date?: string | null
          due_date?: string | null
          fully_paid_on_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_type?: string | null
          last_synced_at?: string | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
          xero_contact_id: string
          xero_invoice_id: string
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          contact_name?: string
          created_at?: string | null
          currency_code?: string | null
          date?: string | null
          due_date?: string | null
          fully_paid_on_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_type?: string | null
          last_synced_at?: string | null
          status?: string | null
          total?: number | null
          updated_at?: string | null
          xero_contact_id?: string
          xero_invoice_id?: string
        }
        Relationships: []
      }
      xero_sync_log: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          records_processed: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      a1_lawn_historical_sales: {
        Row: {
          date: string | null
          id: string | null
          revenue: number | null
          units_sold: number | null
        }
        Insert: {
          date?: string | null
          id?: never
          revenue?: number | null
          units_sold?: number | null
        }
        Update: {
          date?: string | null
          id?: never
          revenue?: number | null
          units_sold?: number | null
        }
        Relationships: []
      }
      a1_lawn_live_sales: {
        Row: {
          date: string | null
          id: string | null
          revenue: number | null
          units_sold: number | null
        }
        Insert: {
          date?: string | null
          id?: never
          revenue?: number | null
          units_sold?: number | null
        }
        Update: {
          date?: string | null
          id?: never
          revenue?: number | null
          units_sold?: number | null
        }
        Relationships: []
      }
      amazon_api_view_ad_groups: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_group_id: number | null
          ad_group_name: string | null
          ad_product: string | null
          campaign_id: number | null
          clicks: number | null
          config_campaign_id: number | null
          country_code: string | null
          cpc: number | null
          created_at_amazon: string | null
          ctr: number | null
          date: string | null
          default_bid: number | null
          impressions: number | null
          last_updated_amazon: string | null
          name: string | null
          orders_7d: number | null
          profile_id: number | null
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          spend: number | null
          state: string | null
        }
        Relationships: []
      }
      amazon_api_view_ads: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_group_id: number | null
          ad_id: number | null
          ad_product: string | null
          asin: string | null
          campaign_id: number | null
          clicks: number | null
          config_ad_group_id: number | null
          config_asin: string | null
          config_campaign_id: number | null
          config_sku: string | null
          country_code: string | null
          cpc: number | null
          created_at_amazon: string | null
          ctr: number | null
          date: string | null
          impressions: number | null
          last_updated_amazon: string | null
          orders_7d: number | null
          profile_id: number | null
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          sku: string | null
          spend: number | null
          state: string | null
        }
        Relationships: []
      }
      amazon_api_view_campaigns: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_product: string | null
          bid_strategy: string | null
          brand_entity_id: string | null
          budget: number | null
          budget_period: string | null
          budget_type: string | null
          campaign_budget: number | null
          campaign_id: number | null
          campaign_name: string | null
          campaign_status: string | null
          clicks: number | null
          cost_type: string | null
          country_code: string | null
          cpc: number | null
          created_at_amazon: string | null
          ctr: number | null
          currency: string | null
          date: string | null
          delivery_reasons: string | null
          delivery_status: string | null
          end_date: string | null
          impressions: number | null
          last_updated_amazon: string | null
          name: string | null
          orders_7d: number | null
          placement_adjustments: string | null
          portfolio_id: string | null
          profile_id: number | null
          pulled_at: string | null
          roas_7d: number | null
          rule_amount: number | null
          sales_7d: number | null
          spend: number | null
          start_date: string | null
          state: string | null
          tags: string | null
          targeting: string | null
        }
        Relationships: []
      }
      amazon_api_view_search_terms: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_group_id: number | null
          ad_group_name: string | null
          ad_keyword_status: string | null
          campaign_id: number | null
          campaign_name: string | null
          clicks: number | null
          country_code: string | null
          cpc: number | null
          ctr: number | null
          date_end: string | null
          date_start: string | null
          impressions: number | null
          keyword: string | null
          keyword_id: number | null
          keyword_type: string | null
          match_type: string | null
          orders_7d: number | null
          portfolio_id: number | null
          pr_account_id: string | null
          pr_account_name: string | null
          pr_country_code: string | null
          profile_id: number | null
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          search_term: string | null
          spend: number | null
          targeting: string | null
        }
        Relationships: []
      }
      amazon_api_view_targets: {
        Row: {
          account_id: string | null
          account_name: string | null
          acos_7d: number | null
          ad_product: string | null
          clicks: number | null
          config_ad_group_id: number | null
          config_bid: number | null
          config_campaign_id: number | null
          config_match_type: string | null
          country_code: string | null
          cpc: number | null
          created_at_amazon: string | null
          ctr: number | null
          date: string | null
          delivery_reasons: string | null
          delivery_status: string | null
          impressions: number | null
          keyword: string | null
          keyword_bid: number | null
          keyword_expression: string | null
          keyword_type: string | null
          last_updated_amazon: string | null
          match_type: string | null
          negative: boolean | null
          orders_7d: number | null
          profile_id: number | null
          pulled_at: string | null
          roas_7d: number | null
          sales_7d: number | null
          spend: number | null
          state: string | null
          target_id: number | null
          target_type: string | null
        }
        Relationships: []
      }
      daily_amazon_ppc_campaigns: {
        Row: {
          account_id: string | null
          account_name: string | null
          attributed_sales_14d: number | null
          clicks: number | null
          cost: number | null
          cpc: number | null
          created_at: string | null
          ctr: number | null
          datasource: string | null
          id: string | null
          impressions: number | null
          last_synced_at: string | null
          record_date: string | null
          source: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          attributed_sales_14d?: number | null
          clicks?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          datasource?: string | null
          id?: string | null
          impressions?: number | null
          last_synced_at?: string | null
          record_date?: string | null
          source?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          attributed_sales_14d?: number | null
          clicks?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          datasource?: string | null
          id?: string | null
          impressions?: number | null
          last_synced_at?: string | null
          record_date?: string | null
          source?: string | null
        }
        Relationships: []
      }
      daily_sales_data: {
        Row: {
          account_id: string | null
          account_name: string | null
          browser_pageviews: number | null
          browser_sessions: number | null
          buybox_percentage: number | null
          created_at: string | null
          datasource: string | null
          id: string | null
          negative_feedback_received: number | null
          ordered_product_sales_amount: number | null
          ordered_product_sales_currency: string | null
          record_date: string | null
          source: string | null
          unit_session_percentage: number | null
          units_ordered: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          browser_pageviews?: number | null
          browser_sessions?: number | null
          buybox_percentage?: number | null
          created_at?: string | null
          datasource?: string | null
          id?: string | null
          negative_feedback_received?: number | null
          ordered_product_sales_amount?: number | null
          ordered_product_sales_currency?: string | null
          record_date?: string | null
          source?: string | null
          unit_session_percentage?: number | null
          units_ordered?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          browser_pageviews?: number | null
          browser_sessions?: number | null
          buybox_percentage?: number | null
          created_at?: string | null
          datasource?: string | null
          id?: string | null
          negative_feedback_received?: number | null
          ordered_product_sales_amount?: number | null
          ordered_product_sales_currency?: string | null
          record_date?: string | null
          source?: string | null
          unit_session_percentage?: number | null
          units_ordered?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mv_asin_titles: {
        Row: {
          asin: string | null
          title: string | null
        }
        Relationships: []
      }
      mv_bid_change_history: {
        Row: {
          acos_7d: number | null
          actual_keyword_bid: number | null
          actual_previous_keyword_bid: number | null
          ad_group_id: number | null
          bid_change: number | null
          bid_change_pct: number | null
          campaign_id: number | null
          clicks: number | null
          impressions: number | null
          keyword_id: number | null
          keyword_text: string | null
          match_type: string | null
          new_bid: number | null
          orders_7d: number | null
          previous_bid: number | null
          sales_7d: number | null
          sellername: string | null
          snapshot_date: string | null
          spend: number | null
        }
        Relationships: []
      }
      mv_bid_change_history_v2: {
        Row: {
          acos_after: number | null
          acos_before: number | null
          acos_current: number | null
          ad_group_id: string | null
          ad_group_name: string | null
          after_snapshot_date: string | null
          before_snapshot_date: string | null
          bid_change: number | null
          bid_change_pct: number | null
          campaign_id: string | null
          campaign_name: string | null
          clicks_after: number | null
          clicks_before: number | null
          clicks_current: number | null
          impressions_after: number | null
          impressions_before: number | null
          impressions_current: number | null
          keyword_id: string | null
          keyword_text: string | null
          match_type: string | null
          new_bid: number | null
          previous_bid: number | null
          sales_after: number | null
          sales_before: number | null
          sales_current: number | null
          sellername: string | null
          snapshot_date: string | null
          spend_after: number | null
          spend_before: number | null
          spend_current: number | null
        }
        Relationships: []
      }
      mv_keyword_priority: {
        Row: {
          account_name: string | null
          account_type: string | null
          acos: number | null
          brand_basket_adds: number | null
          brand_clicks: number | null
          brand_impressions: number | null
          brand_purchases: number | null
          bucket: string | null
          clicks_14d: number | null
          confidence: string | null
          data_source: string | null
          has_ba: boolean | null
          has_ppc: boolean | null
          impressions_share_pct: number | null
          is_branded: boolean | null
          js_organic_rank: number | null
          js_search_volume: number | null
          keyword: string | null
          latest_data_date: string | null
          market_cvr_pct: number | null
          mkt_basket_adds: number | null
          mkt_clicks: number | null
          mkt_impressions: number | null
          mkt_purchases: number | null
          momentum_share_pp: number | null
          orders_14d: number | null
          our_cvr_pct: number | null
          ppc_clicks: number | null
          ppc_impressions: number | null
          ppc_orders: number | null
          ppc_sales: number | null
          ppc_spend: number | null
          priority_score: number | null
          profile_id: number | null
          purchase_share_pct: number | null
          rel_conversion: number | null
          relevance_score: number | null
          sales_14d: number | null
          share_efficiency: number | null
          spend_14d: number | null
          sq_volume: number | null
          target_acos: number | null
          verdict: string | null
          verdict_reason: string | null
          weeks_with_data: number | null
          window_weeks: number | null
        }
        Relationships: []
      }
      v_daily_asin_sync_health: {
        Row: {
          cron_failed_14d: number | null
          cron_succeeded_14d: number | null
          days_behind: number | null
          expected_date: string | null
          last_cron_msg: string | null
          last_cron_status: string | null
          last_cron_success: string | null
          latest_record_date: string | null
          zero_record_completions_14d: number | null
        }
        Relationships: []
      }
      vendor_daily_summary: {
        Row: {
          account_name: string | null
          asins_with_shipments: number | null
          currency: string | null
          customer_returns: number | null
          glance_views: number | null
          marketplace_id: string | null
          ordered_revenue: number | null
          ordered_units: number | null
          record_date: string | null
          shipped_cogs: number | null
          shipped_revenue: number | null
          shipped_units: number | null
        }
        Relationships: []
      }
      vw_ai_crawler_daily: {
        Row: {
          bot: string | null
          client_id: number | null
          day: string | null
          hits: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_crawler_hits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_crawler_summary: {
        Row: {
          bot: string | null
          client_id: number | null
          engine: string | null
          first_seen: string | null
          hits: number | null
          hits_30d: number | null
          hits_7d: number | null
          last_seen: string | null
          purpose: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_crawler_hits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_rank_descriptors_latest: {
        Row: {
          client_id: number | null
          descriptor: string | null
          freq: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_rank_latest: {
        Row: {
          answer_excerpt: string | null
          brand_mentioned: boolean | null
          brand_rank: number | null
          client_id: number | null
          competitors: Json | null
          descriptors: Json | null
          grounded: boolean | null
          intent_group: string | null
          model: string | null
          named_in_answer: boolean | null
          query_id: number | null
          query_text: string | null
          repeats: number | null
          run_id: number | null
          sentiment: string | null
          tracking_tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_weight"
            referencedColumns: ["query_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_score"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_score"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_score_weighted"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_totals"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_sentiment"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_trend"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_competitor_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_competitor_query_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "ai_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_serp_query_history"
            referencedColumns: ["run_id"]
          },
        ]
      }
      vw_ai_rank_query_history: {
        Row: {
          brand_mentioned: boolean | null
          brand_rank: number | null
          client_id: number | null
          grounded: boolean | null
          intent_group: string | null
          model: string | null
          named_in_answer: boolean | null
          query_id: number | null
          run_id: number | null
          started_at: string | null
          tracking_tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_weight"
            referencedColumns: ["query_id"]
          },
        ]
      }
      vw_ai_rank_query_score: {
        Row: {
          best_rank: number | null
          client_id: number | null
          intent_group: string | null
          models_named: number | null
          models_tested: number | null
          query_id: number | null
          run_id: number | null
          started_at: string | null
          tracking_tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_weight"
            referencedColumns: ["query_id"]
          },
        ]
      }
      vw_ai_rank_query_weight: {
        Row: {
          client_id: number | null
          query_id: number | null
          search_volume: number | null
          tracking_tag: string | null
          weight: number | null
        }
        Insert: {
          client_id?: number | null
          query_id?: number | null
          search_volume?: number | null
          tracking_tag?: string | null
          weight?: number | null
        }
        Update: {
          client_id?: number | null
          query_id?: number | null
          search_volume?: number | null
          tracking_tag?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_queries_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_rank_recommendations_latest: {
        Row: {
          client_id: number | null
          competitors: Json | null
          created_at: string | null
          id: number | null
          priority: number | null
          query_id: number | null
          rationale: string | null
          recommendation: string | null
          run_id: number | null
          status: string | null
          tracking_tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_recommendations_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_rank_run_score: {
        Row: {
          client_id: number | null
          max_points: number | null
          raw_points: number | null
          run_id: number | null
          score: number | null
          started_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_rank_run_score_weighted: {
        Row: {
          client_id: number | null
          max_points: number | null
          raw_points: number | null
          run_id: number | null
          score: number | null
          started_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_rank_run_totals: {
        Row: {
          client_id: number | null
          model_query_hits: number | null
          queries_named_any_model: number | null
          queries_tested: number | null
          run_id: number | null
          started_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_rank_sentiment: {
        Row: {
          client_id: number | null
          negative: number | null
          neutral: number | null
          positive: number | null
          run_id: number | null
          started_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ai_rank_trend: {
        Row: {
          client_id: number | null
          model: string | null
          queries_named: number | null
          queries_tested: number | null
          run_id: number | null
          started_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_asin_titles: {
        Row: {
          asin: string | null
          title: string | null
        }
        Relationships: []
      }
      vw_buy_box_monitoring: {
        Row: {
          account_name: string | null
          alert_level: string | null
          alert_message: string | null
          buy_box_percentage: number | null
          child_asin: string | null
          consecutive_days_at_zero: number | null
          day_over_day_change: number | null
          previous_day_bb: number | null
          previous_record_date: string | null
          record_date: string | null
        }
        Relationships: []
      }
      vw_citation_sources: {
        Row: {
          client_id: number | null
          is_own: boolean | null
          last_seen: string | null
          models: number | null
          queries: number | null
          source_domain: string | null
          times_cited: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_competitor_history: {
        Row: {
          client_id: number | null
          competitor: string | null
          competitor_key: string | null
          models_naming: number | null
          queries: number | null
          run_id: number | null
          started_at: string | null
          times_named: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_competitor_leaderboard: {
        Row: {
          client_id: number | null
          competitor: string | null
          competitor_key: string | null
          last_seen: string | null
          models_naming: number | null
          runs_seen: number | null
          times_named: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_competitor_query_history: {
        Row: {
          client_id: number | null
          competitor: string | null
          competitor_key: string | null
          models_naming: number | null
          query_id: number | null
          run_id: number | null
          started_at: string | null
          tracking_tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_weight"
            referencedColumns: ["query_id"]
          },
        ]
      }
      vw_fx_latest: {
        Row: {
          quote: string | null
          rate: number | null
          rate_date: string | null
        }
        Relationships: []
      }
      vw_hugo_activity: {
        Row: {
          account_id: string | null
          kind: string | null
          notable: boolean | null
          text: string | null
          ts: string | null
        }
        Relationships: []
      }
      vw_keyword_priority: {
        Row: {
          account_name: string | null
          account_type: string | null
          acos: number | null
          brand_basket_adds: number | null
          brand_clicks: number | null
          brand_impressions: number | null
          brand_purchases: number | null
          bucket: string | null
          clicks_14d: number | null
          confidence: string | null
          data_source: string | null
          has_ba: boolean | null
          has_ppc: boolean | null
          impressions_share_pct: number | null
          is_branded: boolean | null
          js_organic_rank: number | null
          js_search_volume: number | null
          keyword: string | null
          latest_data_date: string | null
          market_cvr_pct: number | null
          mkt_basket_adds: number | null
          mkt_clicks: number | null
          mkt_impressions: number | null
          mkt_purchases: number | null
          momentum_share_pp: number | null
          orders_14d: number | null
          our_cvr_pct: number | null
          ppc_clicks: number | null
          ppc_impressions: number | null
          ppc_orders: number | null
          ppc_sales: number | null
          ppc_spend: number | null
          priority_score: number | null
          profile_id: number | null
          purchase_share_pct: number | null
          rel_conversion: number | null
          relevance_score: number | null
          sales_14d: number | null
          share_efficiency: number | null
          spend_14d: number | null
          sq_volume: number | null
          target_acos: number | null
          verdict: string | null
          verdict_reason: string | null
          weeks_with_data: number | null
          window_weeks: number | null
        }
        Relationships: []
      }
      vw_keyword_priority_summary: {
        Row: {
          account_name: string | null
          bucket: string | null
          keywords: number | null
          sales: number | null
          search_volume: number | null
          spend: number | null
          verdict: string | null
          window_weeks: number | null
        }
        Relationships: []
      }
      vw_keyword_themes: {
        Row: {
          acos: number | null
          campaign_count: number | null
          ctr: number | null
          keyword_text: string | null
          match_type: string | null
          sellername: string | null
          total_clicks: number | null
          total_impressions: number | null
          total_orders: number | null
          total_sales: number | null
          total_spend: number | null
        }
        Relationships: []
      }
      vw_lockabox_war_battleground: {
        Row: {
          competitor_best_rank: number | null
          competitors_ranking: number | null
          keyword: string | null
          lockabox_rank: number | null
          marketplace: string | null
          ppc_bid_exact: number | null
          search_volume: number | null
        }
        Relationships: []
      }
      vw_lockabox_war_keyword_gaps: {
        Row: {
          competitor_best_rank: number | null
          competitors_ranking: number | null
          keyword: string | null
          lockabox_rank: number | null
          marketplace: string | null
          ppc_bid_exact: number | null
          search_volume: number | null
        }
        Relationships: []
      }
      vw_lockabox_war_leaderboard: {
        Row: {
          avg_price: number | null
          avg_rating: number | null
          avg_sov_pct: number | null
          best_bsr: number | null
          brand: string | null
          marketplace: string | null
          newest_launch: string | null
          products: number | null
          revenue_month: number | null
          role: string | null
          total_reviews: number | null
          units_month: number | null
        }
        Relationships: []
      }
      vw_lockabox_war_movers: {
        Row: {
          asin: string | null
          brand: string | null
          bsr: number | null
          bsr_improvement: number | null
          marketplace: string | null
          new_reviews: number | null
          prev_bsr: number | null
          prev_price: number | null
          prev_reviews: number | null
          price: number | null
          price_pct_change: number | null
          review_count: number | null
          role: string | null
          snapshot_date: string | null
        }
        Relationships: []
      }
      vw_lockabox_war_new_entrants: {
        Row: {
          asin: string | null
          brand: string | null
          bsr: number | null
          date_first_available: string | null
          est_revenue_month: number | null
          est_units_month: number | null
          marketplace: string | null
          price: number | null
          rating: number | null
          review_count: number | null
          role: string | null
          title: string | null
        }
        Relationships: []
      }
      vw_lockabox_war_overview: {
        Row: {
          competitor_units_month: number | null
          keyword_gaps: number | null
          lockabox_best_rank: number | null
          lockabox_sov_pct: number | null
          lockabox_units_month: number | null
          marketplace: string | null
          new_entrants_180d: number | null
          tracked_competitors: number | null
        }
        Relationships: []
      }
      vw_lockabox_war_sov_brand: {
        Row: {
          avg_position: number | null
          avg_price: number | null
          avg_sov_pct: number | null
          brand: string | null
          keywords_present: number | null
          marketplace: string | null
          role: string | null
          sponsored_products: number | null
        }
        Relationships: []
      }
      vw_own_pages_cited: {
        Row: {
          client_id: number | null
          models: number | null
          page: string | null
          queries: number | null
          times_cited: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ppc_spend_daily_country: {
        Row: {
          brand_name: string | null
          clicks: number | null
          country_code: string | null
          currency: string | null
          impressions: number | null
          marketplace_id: string | null
          record_date: string | null
          region: string | null
          selling_partner_id: string | null
          spend_gbp: number | null
          spend_native: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_marketplaces_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "amazon_marketplaces"
            referencedColumns: ["marketplace_id"]
          },
        ]
      }
      vw_pw_latest_avail: {
        Row: {
          account_name: string | null
          buyable: boolean | null
          child_asin: string | null
          currency: string | null
          has_featured_offer: boolean | null
          listing_price: number | null
          offer_count: number | null
          record_date: string | null
          source: string | null
        }
        Relationships: []
      }
      vw_pw_latest_buybox: {
        Row: {
          asin: string | null
          buybox_price: number | null
          country_code: string | null
          is_fba: boolean | null
          marketplace_id: string | null
          offer_count: number | null
          record_date: string | null
          winner_class: string | null
          winner_seller_id: string | null
        }
        Relationships: []
      }
      vw_pw_platform_decision: {
        Row: {
          action_needed: boolean | null
          colour: string | null
          competitor_name: string | null
          country_code: string | null
          match_tier: string | null
          misallocated_spend_30d: number | null
          reason: string | null
          recommended: string | null
          s_ad: boolean | null
          s_price: number | null
          s_sid: string | null
          s_spend30: number | null
          s_spend7: number | null
          s_win: string | null
          s_winner_name: string | null
          seller_asin: string | null
          size_norm: string | null
          style_code: string | null
          v_ad: boolean | null
          v_price: number | null
          v_sid: string | null
          v_spend30: number | null
          v_spend7: number | null
          v_win: string | null
          v_winner_name: string | null
          vendor_asin: string | null
        }
        Relationships: []
      }
      vw_pw_size_weight: {
        Row: {
          account_name: string | null
          colour: string | null
          demand_share_pct: number | null
          gap_pp: number | null
          size_norm: string | null
          size_rank: number | null
          spend_30d: number | null
          spend_share_pct: number | null
          style_key: string | null
          style_name: string | null
          style_units: number | null
          units: number | null
          weight_mult: number | null
        }
        Relationships: []
      }
      vw_pw_style_health: {
        Row: {
          account_name: string | null
          advertised_asins: string[] | null
          advertised_children: number | null
          avail_date: string | null
          available_sizes: string | null
          clicks_30d: number | null
          colour: string | null
          country_code: string | null
          dead_sizes: string | null
          is_advertised: boolean | null
          last_ad_date: string | null
          orders_7d: number | null
          parent_asin: string | null
          pct_available: number | null
          sizes_available: number | null
          sizes_checked: number | null
          sizes_total: number | null
          sizes_unknown: number | null
          spend_30d: number | null
          spend_7d: number | null
          style_code: string | null
          style_key: string | null
          style_name: string | null
          variation_theme: string | null
        }
        Relationships: []
      }
      vw_pw_style_platform: {
        Row: {
          amazon_sizes: number | null
          colour: string | null
          competitor_sizes: number | null
          dominance_pct: number | null
          nobody_sizes: number | null
          recommended: string | null
          s_ad: boolean | null
          s_spend30: number | null
          seller_asins: string[] | null
          sizes_checked: number | null
          sizes_total: number | null
          style_code: string | null
          style_key: string | null
          style_name: string | null
          v_ad: boolean | null
          v_spend30: number | null
          vendor_asins: string[] | null
          wwd_sizes: number | null
        }
        Relationships: []
      }
      vw_python_brand_weekly: {
        Row: {
          account_name: string | null
          acos: number | null
          brand: string | null
          clicks: number | null
          ctr: number | null
          cvr: number | null
          impressions: number | null
          n_ba_terms: number | null
          n_ppc_terms: number | null
          n_terms: number | null
          orders: number | null
          profile_id: number | null
          roas: number | null
          sales: number | null
          spend: number | null
          units: number | null
          week_end: string | null
          week_start: string | null
          zero_sale_spend: number | null
          zero_sale_spend_pct: number | null
        }
        Relationships: []
      }
      vw_python_financial_weekly: {
        Row: {
          account_name: string | null
          advertising_cost: number | null
          avg_sales_price: number | null
          brand: string | null
          cogs: number | null
          fba_fulfilment_fee: number | null
          fulfilment_cost: number | null
          net_margin_pct: number | null
          net_proceeds: number | null
          net_sales_revenue: number | null
          other_charges: number | null
          product_asin: string | null
          product_product_name: string | null
          product_sku: string | null
          profile_id: number | null
          referral_fee: number | null
          return_rate: number | null
          return_recovery_cost: number | null
          selling_fees: number | null
          sponsored_products_charges: number | null
          storage_cost: number | null
          total_sales_revenue: number | null
          total_units_sold: number | null
          units_refunded: number | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: []
      }
      vw_python_kw_weekly: {
        Row: {
          account_name: string | null
          acos: number | null
          basket_add_rate_pct: number | null
          basket_adds_brand_count: number | null
          basket_adds_brand_share_pct: number | null
          basket_adds_total_count: number | null
          brand: string | null
          click_rate_pct: number | null
          clicks: number | null
          clicks_brand_count: number | null
          clicks_brand_share_pct: number | null
          clicks_total_count: number | null
          cpc: number | null
          ctr: number | null
          cvr: number | null
          exact_exists: string | null
          has_ba: boolean | null
          has_ppc: boolean | null
          impressions: number | null
          impressions_brand_count: number | null
          impressions_brand_share_pct: number | null
          impressions_total_count: number | null
          is_asin: boolean | null
          keyword: string | null
          orders: number | null
          profile_id: number | null
          purchase_rate_pct: number | null
          purchases_brand_count: number | null
          purchases_brand_share_pct: number | null
          purchases_total_count: number | null
          roas: number | null
          sales: number | null
          search_query_score: number | null
          search_query_volume: number | null
          sellername: string | null
          source: string | null
          spend: number | null
          units: number | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: []
      }
      vw_sales_daily_country: {
        Row: {
          brand_name: string | null
          country_code: string | null
          currency: string | null
          marketplace_id: string | null
          record_date: string | null
          region: string | null
          sales_gbp: number | null
          sales_native: number | null
          spid: string | null
          units: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_marketplaces_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "amazon_marketplaces"
            referencedColumns: ["marketplace_id"]
          },
        ]
      }
      vw_sales_performance_monitoring: {
        Row: {
          account_name: string | null
          change_amount: number | null
          change_percentage: number | null
          child_asin: string | null
          current_value: number | null
          current_week_end: string | null
          current_week_start: string | null
          metric_type: string | null
          parent_asin: string | null
          performance_date: string | null
          previous_value: number | null
          previous_week_end: string | null
          previous_week_start: string | null
          severity: string | null
        }
        Relationships: []
      }
      vw_search_term_keyword_map: {
        Row: {
          acos: number | null
          ad_group_name: string | null
          campaign_name: string | null
          ctr: number | null
          customer_search_term: string | null
          is_negative_candidate: boolean | null
          keyword_text: string | null
          match_type: string | null
          sellername: string | null
          total_clicks: number | null
          total_impressions: number | null
          total_orders: number | null
          total_sales: number | null
          total_spend: number | null
        }
        Relationships: []
      }
      vw_serp_latest: {
        Row: {
          ai_overview_cited: boolean | null
          client_id: number | null
          competitors: Json | null
          created_at: string | null
          engine: string | null
          in_ai_overview: boolean | null
          local_pack_rank: number | null
          location: string | null
          organic_position: number | null
          query: string | null
          query_id: number | null
          run_id: number | null
          tracking_tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serp_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_weight"
            referencedColumns: ["query_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_score"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_score"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_score_weighted"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_run_totals"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_sentiment"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_trend"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_competitor_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_competitor_query_history"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "serp_rank_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "vw_serp_query_history"
            referencedColumns: ["run_id"]
          },
        ]
      }
      vw_serp_query_history: {
        Row: {
          ai_overview_cited: boolean | null
          client_id: number | null
          engine: string | null
          in_ai_overview: boolean | null
          local_pack_rank: number | null
          location: string | null
          organic_position: number | null
          query_id: number | null
          run_id: number | null
          started_at: string | null
          tracking_tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serp_rank_results_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "ai_rank_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serp_rank_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "vw_ai_rank_query_weight"
            referencedColumns: ["query_id"]
          },
        ]
      }
      vw_sqp_brand: {
        Row: {
          account_name: string | null
          brand_clicks: number | null
          brand_impression_share: number | null
          brand_impressions: number | null
          est_brand_purchases: number | null
          market_clicks: number | null
          market_impressions: number | null
          market_purchases: number | null
          marketplace_id: string | null
          period_end: string | null
          period_start: string | null
          period_type: string | null
          ranking_asins: number | null
          search_query: string | null
          search_query_score: number | null
          search_query_volume: number | null
        }
        Relationships: []
      }
      vw_top_search_terms: {
        Row: {
          acos: number | null
          campaign_count: number | null
          ctr: number | null
          customer_search_term: string | null
          roas: number | null
          sellername: string | null
          total_clicks: number | null
          total_impressions: number | null
          total_orders: number | null
          total_sales: number | null
          total_spend: number | null
        }
        Relationships: []
      }
      vw_vendor_daily_country: {
        Row: {
          country_code: string | null
          currency: string | null
          customer_returns: number | null
          glance_views: number | null
          marketplace_id: string | null
          ordered_revenue_gbp: number | null
          ordered_revenue_native: number | null
          ordered_units: number | null
          record_date: string | null
          region: string | null
          shipped_revenue_gbp: number | null
          shipped_revenue_native: number | null
          shipped_units: number | null
          spid: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_marketplaces_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "amazon_marketplaces"
            referencedColumns: ["marketplace_id"]
          },
        ]
      }
    }
    Functions: {
      _median_numeric: { Args: { arr: number[] }; Returns: number }
      ads_pause_plan: {
        Args: { p_account: string; p_asin: string }
        Returns: {
          ad_group_id: string
          ad_id: string
          campaign_id: string
          sales: number
          spend: number
        }[]
      }
      ads_push_plan: {
        Args: { p_account: string; p_asin: string; p_target_acos: number }
        Returns: {
          acos: number
          current_bid: number
          current_state: string
          keyword: string
          match_type: string
          sales: number
          spend: number
          target_id: string
        }[]
      }
      ai_rank_fire_alert: {
        Args: { p_client_id?: number; p_run_id: number }
        Returns: undefined
      }
      ai_rank_fire_next: {
        Args: {
          p_client_id?: number
          p_models: string[]
          p_offset: number
          p_repeats: number
          p_run_id: number
        }
        Returns: undefined
      }
      ai_rank_fire_report_all: { Args: never; Returns: number }
      ai_rank_fire_run_all: { Args: { p_repeats?: number }; Returns: number }
      apply_case5_competitor_bids: {
        Args: {
          p_cooldown_hours?: number
          p_max_bid_cap?: number
          p_max_daily_changes?: number
        }
        Returns: Json
      }
      auto_approve_pending_bids: { Args: never; Returns: number }
      budget_fy_start_month: { Args: { p_spid: string }; Returns: number }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_cpi_scores: {
        Args: { p_watchlist_id: string }
        Returns: number
      }
      check_buy_box_alerts: {
        Args: { target_date?: string }
        Returns: {
          alerts_found: number
          critical_count: number
          urgent_count: number
          warning_count: number
        }[]
      }
      check_daily_asin_freshness: {
        Args: never
        Returns: {
          accounts_with_data: number
          active_accounts: number
          expected_date: string
          latest_date: string
          missing_accounts: string[]
          status: string
        }[]
      }
      check_sales_performance_alerts: {
        Args: never
        Returns: {
          alerts_found: number
          critical_count: number
          positive_increase_count: number
          positive_surge_count: number
          urgent_count: number
          warning_count: number
        }[]
      }
      cleanup_searchapi_cache: { Args: never; Returns: undefined }
      create_competitor_presence_partition: { Args: never; Returns: undefined }
      daily_sb_v2_all_profiles: { Args: never; Returns: number }
      detect_keyword_gaps: { Args: { p_watchlist_id: string }; Returns: number }
      detect_stockouts: { Args: never; Returns: Json }
      evaluate_search_terms: { Args: { p_dry_run?: boolean }; Returns: Json }
      exec_sql: { Args: { query: string }; Returns: undefined }
      generate_bid_recommendations: {
        Args: { p_watchlist_id: string }
        Returns: number
      }
      get_advertised_product_aggregates: {
        Args: { p_account_name: string; p_start_date: string }
        Returns: {
          advertised_asin: string
          campaign_count: number
          clicks: number
          impressions: number
          orders: number
          sales: number
          spend: number
        }[]
      }
      get_all_rank_checks: {
        Args: never
        Returns: {
          asin: string
          checked_at: string
          domain: string
          id: string
          is_prime: boolean
          is_sponsored: boolean
          keyword: string
          page: number
          position: number
          price: number
          total_results: number
        }[]
      }
      get_all_snapshots: {
        Args: never
        Returns: {
          asin: string
          availability: string
          bought_past_month: string
          brand: string
          buybox_seller: string
          domain: string
          feature_bullets: Json
          id: string
          images_json: Json
          is_amazon_sold: boolean
          original_price: number
          price: number
          rating: number
          reviews_count: number
          reviews_json: Json
          snapshot_at: string
          title: string
        }[]
      }
      get_bid_impact_analysis: {
        Args: { p_days_back?: number; p_limit?: number; p_sellername: string }
        Returns: {
          acos_after: number
          acos_before: number
          acos_delta_pct: number
          ad_group_name: string
          after_snapshot_date: string
          before_snapshot_date: string
          bid_change_date: string
          bid_change_pct: number
          campaign_name: string
          change_direction: string
          clicks_after: number
          clicks_before: number
          clicks_delta_pct: number
          data_maturity_pct: number
          days_since_change: number
          impact_verdict: string
          impressions_after: number
          impressions_before: number
          impressions_delta_pct: number
          keyword_id: string
          keyword_text: string
          match_type: string
          new_bid: number
          previous_bid: number
          sales_after: number
          sales_before: number
          sales_delta_pct: number
          sellername: string
          spend_after: number
          spend_before: number
        }[]
      }
      get_cache_detail: { Args: { p_id: string }; Returns: Json }
      get_cache_entries: {
        Args: never
        Returns: {
          created_at: string
          engine: string
          expires_at: string
          id: string
          query_params: Json
        }[]
      }
      get_latest_meetings: {
        Args: never
        Returns: {
          account_name: string
          latest_meeting: string
          meeting_count: number
        }[]
      }
      get_ppc_monthly_performance:
        | {
            Args: { p_account_name: string }
            Returns: {
              acos: number
              ad_cost_pct: number
              ad_sales: number
              ad_sales_pct: number
              ad_spend: number
              clicks: number
              client_name: string
              cpc: number
              ctr: number
              currency: string
              impressions: number
              marketplace: string
              month: string
              overall_sales: number
            }[]
          }
        | {
            Args: { p_account_name: string; p_marketplace?: string }
            Returns: {
              acos: number
              ad_cost_pct: number
              ad_sales: number
              ad_sales_pct: number
              ad_spend: number
              clicks: number
              client_name: string
              cpc: number
              ctr: number
              currency: string
              impressions: number
              marketplace: string
              month: string
              overall_sales: number
            }[]
          }
      get_product_stock_history: {
        Args: { p_merchant_token: string; p_seller_sku: string }
        Returns: {
          price: number
          quantity: number
          record_date: string
          status: string
        }[]
      }
      get_stock_current_listings: {
        Args: { p_merchant_token: string }
        Returns: {
          asin: string
          fulfillment_channel: string
          item_name: string
          open_date: string
          price: number
          quantity: number
          seller_sku: string
          status: string
        }[]
      }
      get_stock_daily_summary: {
        Args: { p_merchant_token: string }
        Returns: {
          active_listings: number
          avg_price: number
          inactive_listings: number
          record_date: string
          total_listings: number
          total_quantity: number
          total_value: number
        }[]
      }
      get_stock_listings_data: {
        Args: { p_merchant_token: string }
        Returns: {
          asin: string
          fulfillment_channel: string
          item_name: string
          price: number
          quantity: number
          record_date: string
          seller_sku: string
          status: string
        }[]
      }
      get_table_columns: {
        Args: { target_table: string }
        Returns: {
          column_name: string
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      hugo_account_window: {
        Args: { p_account: string; p_days?: number }
        Returns: Json
      }
      hugo_ad_type_mix: {
        Args: { p_account: string }
        Returns: {
          campaigns: number
          is_amazon: boolean
          key: string
          label: string
          method: string
          sort: number
        }[]
      }
      hugo_asin_movers: {
        Args: { p_account: string; p_days?: number }
        Returns: {
          asin: string
          curr_aov: number
          curr_bb: number
          curr_cvr: number
          curr_pv: number
          curr_sales: number
          curr_units: number
          delta_sales: number
          direction: string
          driver: string
          pct_change: number
          prev_aov: number
          prev_bb: number
          prev_cvr: number
          prev_pv: number
          prev_sales: number
          prev_units: number
          product_title: string
        }[]
      }
      hugo_auto_negative_candidates: {
        Args: { p_account: string }
        Returns: Json
      }
      hugo_auto_negative_candidates_impl: {
        Args: {
          p_account: string
          p_acos_min_clicks: number
          p_acos_pct: number
          p_clicks_nosale: number
          p_min_spend: number
        }
        Returns: Json
      }
      hugo_auto_negative_simulate: {
        Args: {
          p_account: string
          p_acos_min_clicks: number
          p_acos_pct: number
          p_clicks_nosale: number
          p_min_spend: number
        }
        Returns: Json
      }
      hugo_auto_negative_status: { Args: never; Returns: Json }
      hugo_budget_capped: {
        Args: { p_profile_id: number }
        Returns: {
          acos: number
          budget: number
          campaign_id: number
          campaign_name: string
          spend: number
          util: number
        }[]
      }
      hugo_campaign_builder: {
        Args: { p_account: string; p_asin: string }
        Returns: Json
      }
      hugo_client_contact: {
        Args: { p_account_name: string }
        Returns: {
          contact_email: string
          contact_name: string
          source: string
        }[]
      }
      hugo_client_profile: { Args: { p_account: string }; Returns: Json }
      hugo_competitor_targets: {
        Args: { p_profile_id: number }
        Returns: {
          acos: number
          asin: string
          orders: number
          spend: number
        }[]
      }
      hugo_da_names: { Args: { p_account: string }; Returns: string[] }
      hugo_days_of_cover: {
        Args: { p_merchant_token: string }
        Returns: {
          asin: string
          daily_velocity: number
          days_cover: number
          qty: number
        }[]
      }
      hugo_deals: {
        Args: { p_account: string; p_days?: number }
        Returns: Json
      }
      hugo_detect_campaign_types: { Args: never; Returns: number }
      hugo_fire_next: {
        Args: { p_dry_run: boolean; p_offset: number; p_run_id: string }
        Returns: number
      }
      hugo_harvest_campaigns: {
        Args: { p_account: string; p_max_acos?: number; p_min_orders?: number }
        Returns: Json
      }
      hugo_harvest_candidates: {
        Args: { p_profile_id: number }
        Returns: {
          acos: number
          clicks: number
          orders: number
          spend: number
          term: string
        }[]
      }
      hugo_high_acos_terms: {
        Args: {
          p_account: string
          p_limit?: number
          p_min_clicks?: number
          p_threshold?: number
        }
        Returns: {
          acos: number
          clicks: number
          orders: number
          sales: number
          spend: number
          term: string
        }[]
      }
      hugo_hourly_sales: {
        Args: { p_account: string; p_asin?: string; p_date?: string }
        Returns: Json
      }
      hugo_inventory: {
        Args: { p_account: string; p_asin?: string }
        Returns: Json
      }
      hugo_inventory_trend: {
        Args: { p_account: string; p_weeks?: number }
        Returns: Json
      }
      hugo_margin_bids: {
        Args: { p_account: string; p_days?: number }
        Returns: Json
      }
      hugo_negative_candidates: {
        Args: { p_account: string; p_min_acos?: number; p_min_clicks?: number }
        Returns: Json
      }
      hugo_open_inquiries: { Args: { p_account: string }; Returns: Json }
      hugo_placement_opps: {
        Args: { p_profile_id: number }
        Returns: {
          campaign_id: number
          campaign_name: string
          other_roas: number
          tos_roas: number
          tos_spend: number
        }[]
      }
      hugo_portfolio_movers: {
        Args: { p_days?: number; p_level?: string; p_limit?: number }
        Returns: {
          account_id: string
          asin: string
          curr_sales: number
          delta_sales: number
          direction: string
          driver: string
          n_variations: number
          pct_change: number
          prev_sales: number
          product_title: string
        }[]
      }
      hugo_ppc_reliance: {
        Args: { p_account: string; p_asin?: string; p_days?: number }
        Returns: Json
      }
      hugo_product_detail: {
        Args: { p_account: string; p_asin: string; p_days?: number }
        Returns: Json
      }
      hugo_product_movers: {
        Args: { p_account: string; p_days?: number; p_level?: string }
        Returns: {
          asin: string
          curr_aov: number
          curr_bb: number
          curr_cvr: number
          curr_pv: number
          curr_sales: number
          curr_units: number
          delta_sales: number
          direction: string
          driver: string
          n_variations: number
          pct_change: number
          prev_aov: number
          prev_bb: number
          prev_cvr: number
          prev_pv: number
          prev_sales: number
          prev_units: number
          product_title: string
        }[]
      }
      hugo_promo_suggestions: {
        Args: { p_account: string; p_days?: number }
        Returns: Json
      }
      hugo_refresh_source_health: { Args: never; Returns: number }
      hugo_refresh_stock_alerts: { Args: never; Returns: number }
      hugo_refresh_titles: { Args: never; Returns: undefined }
      hugo_sales_why: {
        Args: { p_account: string; p_days?: number }
        Returns: Json
      }
      hugo_sbsd_opportunities: {
        Args: { p_profile_id: number }
        Returns: {
          acos: number
          ad_type: string
          campaign_name: string
          cost: number
          issue: string
          sales: number
        }[]
      }
      hugo_source_health: {
        Args: { p_account: string }
        Returns: {
          days_old: number
          detail: string
          latest_date: string
          rows_30d: number
          source: string
          status: string
        }[]
      }
      hugo_source_health_compute: {
        Args: { p_account: string }
        Returns: {
          days_old: number
          detail: string
          latest_date: string
          rows_30d: number
          source: string
          status: string
        }[]
      }
      hugo_stock_alerts: {
        Args: { p_account?: string }
        Returns: {
          account_id: string
          alert: string
          asin: string
          days_cover: number
          on_hand_units: number
          recommend_units: number
          surge_ratio: number
          title: string
          velocity_7d: number
          velocity_prior_7d: number
        }[]
      }
      hugo_stock_alerts_compute: {
        Args: { p_account?: string }
        Returns: {
          account_id: string
          alert: string
          asin: string
          days_cover: number
          on_hand_units: number
          recommend_units: number
          surge_ratio: number
          title: string
          velocity_7d: number
          velocity_prior_7d: number
        }[]
      }
      hugo_waste_candidates: {
        Args: { p_profile_id: number }
        Returns: {
          clicks: number
          spend: number
          term: string
        }[]
      }
      hugo_weather_sales: {
        Args: { p_account: string; p_days?: number }
        Returns: Json
      }
      invoke_daily_asin_sync: {
        Args: { p_target_date: string }
        Returns: number
      }
      invoke_windsor_asin_backfill: {
        Args: { p_target_date: string }
        Returns: number
      }
      is_staff: { Args: never; Returns: boolean }
      lockabox_war_detect_changes: { Args: never; Returns: number }
      nk_batch_prune: {
        Args: never
        Returns: {
          action_taken: string
          creationdate_val: string
          rows_affected: number
          tbl_name: string
        }[]
      }
      nk_snapshot_and_prune: { Args: never; Returns: undefined }
      parse_nk_date: { Args: { raw_date: string }; Returns: string }
      pipeline_get_secrets: {
        Args: { secret_names: string[] }
        Returns: {
          decrypted_secret: string
          name: string
        }[]
      }
      pp_num: { Args: { t: string }; Returns: number }
      preview_negative_candidates: {
        Args: { p_profile_id?: number }
        Returns: {
          account_name: string
          ad_group_name: string
          calculated_acos: number
          campaign_id: number
          campaign_name: string
          keyword_text: string
          lookback_window: string
          negative_type: string
          profile_id: number
          rule_triggered: string
          search_term: string
          total_clicks: number
          total_orders: number
          total_sales: number
          total_spend: number
        }[]
      }
      process_sb_v2_backfill: { Args: { batch_size?: number }; Returns: number }
      pw_advertised_asins: {
        Args: { p_account: string; p_days?: number }
        Returns: {
          advertised_asin: string
          impressions: number
          spend: number
        }[]
      }
      pw_arbitrate_daily: { Args: { p_country?: string }; Returns: Json }
      pw_avail_worklist: {
        Args: { p_account: string }
        Returns: {
          child_asin: string
          spend_30d: number
        }[]
      }
      pw_buybox_worklist: {
        Args: never
        Returns: {
          asin: string
        }[]
      }
      pw_canon_colour: { Args: { c: string }; Returns: string }
      pw_flag_styles: {
        Args: { p_account: string; p_min_spend?: number; p_threshold?: number }
        Returns: number
      }
      pw_flag_switches: {
        Args: { p_country?: string; p_min_spend?: number }
        Returns: number
      }
      pw_rebuild_product_map: {
        Args: { p_country?: string }
        Returns: {
          n: number
          tier: string
        }[]
      }
      pw_recovered_styles: {
        Args: { p_account: string }
        Returns: {
          colour: string
          pct_available: number
          queue_id: string
          style_name: string
          threshold_pct: number
        }[]
      }
      pw_refresh_ad_spend: { Args: { p_account: string }; Returns: number }
      pw_refresh_size_demand: {
        Args: { p_account?: string; p_days?: number; p_vendor?: string }
        Returns: number
      }
      pw_style_key: {
        Args: {
          child: string
          colour: string
          parent: string
          style_code: string
        }
        Returns: string
      }
      pw_top_competitors: {
        Args: { p_limit?: number }
        Returns: {
          buybox_asins: number
          name: string
          seller_id: string
        }[]
      }
      recalculate_stockout_days: { Args: never; Returns: Json }
      refresh_demo_data: { Args: never; Returns: Json }
      resolve_account_from_email: { Args: { p_email: string }; Returns: string }
      rpc_agency_summary: {
        Args: { p_end: string; p_start: string }
        Returns: {
          brand_name: string
          countries: number
          sales_gbp: number
          spid: string
          units: number
        }[]
      }
      rpc_asin_performance_country: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          buy_box_percentage: number
          child_asin: string
          conversion_rate: number
          currency: string
          latest_date: string
          page_views: number
          parent_asin: string
          product_title: string
          sales_gbp: number
          sales_native: number
          units_sold: number
        }[]
      }
      rpc_ba_repeat_summary: {
        Args: { p_scope: string; p_spid: string }
        Returns: {
          asins: number
          repeat_customers: number
          repeat_rate: number
          repeat_sales_share: number
          unique_customers: number
        }[]
      }
      rpc_ba_search_queries: {
        Args: { p_limit?: number; p_scope: string; p_spid: string }
        Returns: {
          brand_clicks: number
          brand_impressions: number
          brand_purchases: number
          click_share: number
          impression_share: number
          marketplaces: number
          purchase_share: number
          search_query: string
          search_volume: number
        }[]
      }
      rpc_budget_actuals_monthly: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          actual_gbp: number
          actual_native: number
          currency: string
          metric: string
          period_month: string
        }[]
      }
      rpc_budget_actuals_weekly: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          actual_gbp: number
          actual_native: number
          currency: string
          metric: string
          period_start: string
        }[]
      }
      rpc_budget_alerts: {
        Args: {
          p_asof?: string
          p_fy_start_month?: number
          p_sales_floor?: number
          p_scope?: string
          p_spend_ceiling?: number
          p_spid: string
        }
        Returns: {
          full_year_budget_gbp: number
          message: string
          metric: string
          projected_full_year_gbp: number
          severity: string
          ytd_actual_gbp: number
          ytd_budget_gbp: number
          ytd_pace_pct: number
        }[]
      }
      rpc_budget_ingest_commit: { Args: { p_payload: Json }; Returns: string }
      rpc_budget_planned_monthly: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          budget_gbp: number
          budget_native: number
          currency: string
          metric: string
          period_month: string
        }[]
      }
      rpc_budget_planned_weekly: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          budget_gbp: number
          budget_native: number
          currency: string
          metric: string
          period_start: string
        }[]
      }
      rpc_budget_summary: {
        Args: {
          p_asof?: string
          p_fiscal_year?: number
          p_fy_start_month?: number
          p_scope?: string
          p_spid: string
        }
        Returns: {
          currency: string
          full_year_budget_gbp: number
          has_budget: boolean
          metric: string
          mtd_actual_gbp: number
          mtd_budget_gbp: number
          mtd_pace_pct: number
          projected_full_year_gbp: number
          projected_vs_budget_pct: number
          ytd_actual_gbp: number
          ytd_budget_gbp: number
          ytd_pace_pct: number
        }[]
      }
      rpc_budget_versions: {
        Args: { p_spid: string }
        Returns: {
          activated_at: string | null
          brand_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          fiscal_year: number
          id: string
          label: string
          notes: string | null
          selling_partner_id: string
          source_file_name: string | null
          source_file_path: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "budget_versions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_budget_vs_actual: {
        Args: {
          p_end?: string
          p_fiscal_year?: number
          p_fy_start_month?: number
          p_grain?: string
          p_metric?: string
          p_scope?: string
          p_spid: string
          p_start?: string
        }
        Returns: {
          actual_gbp: number
          actual_native: number
          budget_gbp: number
          budget_native: number
          currency: string
          is_future: boolean
          metric: string
          period_month: string
          variance_gbp: number
          variance_pct: number
        }[]
      }
      rpc_country_weather: {
        Args: { p_country: string; p_end: string; p_start: string }
        Returns: {
          precip_mm: number
          record_date: string
          sunshine_hours: number
          temp_max: number
          temp_mean: number
          temp_min: number
        }[]
      }
      rpc_dashboard_addons: {
        Args: { p_spid: string }
        Returns: {
          addon_key: string
          config: Json
          enabled: boolean
          sort_order: number
        }[]
      }
      rpc_events: {
        Args: { p_country: string; p_end: string; p_start: string }
        Returns: {
          color: string
          end_date: string
          event_type: string
          id: string
          name: string
          start_date: string
        }[]
      }
      rpc_inventory_fba_snapshot: {
        Args: { p_merchant_token: string; p_velocity_days?: number }
        Returns: {
          asin: string
          avg_daily: number
          fba_stock: number
          price: number
          product_name: string
          sku: string
          units_recent: number
        }[]
      }
      rpc_inventory_skus: {
        Args: { p_pool_key: string }
        Returns: {
          asin: string
          fulfillable: number
          inbound: number
          product_name: string
          reserved: number
          sku: string
          total: number
        }[]
      }
      rpc_inventory_summary: {
        Args: { p_scope: string; p_spid: string }
        Returns: {
          countries: string
          fulfillable: number
          fulfillable_skus: number
          inbound: number
          pool_key: string
          record_date: string
          reserved: number
          skus: number
          total: number
        }[]
      }
      rpc_inventory_velocity: {
        Args: { p_days?: number; p_merchant_token: string }
        Returns: {
          asin: string
          avg_daily: number
          days: number
          units: number
        }[]
      }
      rpc_metrics_daily_country: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          bucket: string
          buy_box_pct: number
          conversion: number
          currency: string
          page_views: number
          sales_gbp: number
          sales_native: number
          units: number
        }[]
      }
      rpc_pnl_fee_breakdown: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          amount_gbp: number
          category: string
          share: number
        }[]
      }
      rpc_pnl_products: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          ads_gbp: number
          ads_native: number
          asin: string
          cogs_gbp: number
          cogs_native: number
          currency: string
          fees_gbp: number
          fees_native: number
          has_cost: boolean
          net_proceeds_gbp: number
          net_proceeds_native: number
          product_name: string
          profit_gbp: number
          profit_native: number
          sales_gbp: number
          sales_native: number
          sku: string
          units: number
        }[]
      }
      rpc_pnl_summary: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          ads_gbp: number
          ads_native: number
          cogs_gbp: number
          cogs_native: number
          country_code: string
          currency: string
          fees_gbp: number
          fees_native: number
          marketplace_id: string
          net_proceeds_gbp: number
          net_proceeds_native: number
          profit_gbp: number
          profit_native: number
          sales_gbp: number
          sales_native: number
          units: number
        }[]
      }
      rpc_ppc_summary: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          acos: number
          ad_sales: number
          ad_spend_gbp: number
          country_code: string
          has_ads_perf: boolean
          marketplace_id: string
          sales_gbp: number
          tacos: number
        }[]
      }
      rpc_sales_summary: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          country_code: string
          currency: string
          marketplace_id: string
          sales_gbp: number
          sales_native: number
          units: number
        }[]
      }
      rpc_sales_summary_country: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          currency: string
          is_native: boolean
          sales_gbp: number
          sales_native: number
          units: number
        }[]
      }
      rpc_sales_timeseries: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          bucket: string
          currency: string
          sales_gbp: number
          sales_native: number
          units: number
        }[]
      }
      rpc_sales_timeseries_by_country: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          bucket: string
          country_code: string
          sales_gbp: number
          units: number
        }[]
      }
      rpc_set_asin_cost: {
        Args: { p_asin: string; p_cost: number; p_spid: string }
        Returns: undefined
      }
      rpc_set_cost_by_key: {
        Args: { p_cost: number; p_key: string; p_spid: string }
        Returns: string
      }
      rpc_vendor_by_country: {
        Args: { p_end: string; p_spid: string; p_start: string }
        Returns: {
          country_code: string
          currency: string
          ordered_revenue_gbp: number
          ordered_revenue_native: number
          ordered_units: number
        }[]
      }
      rpc_vendor_summary: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          countries: number
          currency: string
          customer_returns: number
          glance_views: number
          ordered_revenue_gbp: number
          ordered_revenue_native: number
          ordered_units: number
          shipped_revenue_gbp: number
          shipped_revenue_native: number
          shipped_units: number
        }[]
      }
      rpc_vendor_timeseries: {
        Args: {
          p_end: string
          p_scope: string
          p_spid: string
          p_start: string
        }
        Returns: {
          bucket: string
          currency: string
          ordered_revenue_gbp: number
          ordered_revenue_native: number
          ordered_units: number
        }[]
      }
      rpc_weather_daily: {
        Args: { p_end: string; p_spid: string; p_start: string }
        Returns: {
          precip_mm: number
          record_date: string
          sunshine_hours: number
          temp_max: number
          temp_mean: number
          temp_min: number
        }[]
      }
      simulate_negative_rules: {
        Args: {
          p_profile_id: number
          p_rule1_kw_click_threshold?: number
          p_rule1_pt_click_threshold?: number
          p_rule2_kw_max_acos?: number
          p_rule2_kw_min_spend?: number
          p_rule2_pt_max_acos?: number
          p_rule2_pt_min_spend?: number
        }
        Returns: {
          account_name: string
          ad_group_id: string
          ad_group_name: string
          already_pending: boolean
          calculated_acos: number
          campaign_id: string
          campaign_name: string
          keyword_text: string
          lookback_window: string
          match_type: string
          negative_type: string
          reason: string
          rule_triggered: string
          search_term: string
          total_clicks: number
          total_orders: number
          total_sales: number
          total_spend: number
        }[]
      }
      steady_opt_target_stats: {
        Args: { p_profile_id: number }
        Returns: {
          ad_group_id: number
          campaign_id: number
          campaign_name: string
          campaign_state: string
          clicks_30d: number
          clicks_7d: number
          current_bid: number
          impressions_7d: number
          is_sunshine: boolean
          keyword: string
          last_pulled: string
          orders_30d: number
          orders_7d: number
          sales_30d: number
          sales_7d: number
          spend_30d: number
          spend_7d: number
          target_id: number
        }[]
      }
      steady_opt_target_window: {
        Args: {
          p_from: string
          p_profile_id: number
          p_target_id: number
          p_to: string
        }
        Returns: {
          clicks: number
          days_with_data: number
          impressions: number
          orders: number
          sales: number
          spend: number
        }[]
      }
      sunshine_engine_calculate_bid: {
        Args: {
          p_acos?: number
          p_campaign_id: string
          p_clicks?: number
          p_current_bid: number
          p_impressions?: number
          p_keyword: string
          p_orders?: number
          p_spend?: number
        }
        Returns: Json
      }
      sunshine_engine_run: { Args: never; Returns: Json }
      text_to_bytea: { Args: { data: string }; Returns: string }
      to_gbp: { Args: { amount: number; ccy: string }; Returns: number }
      trigger_amazon_report_fetch: {
        Args: { p_report_type: string }
        Returns: undefined
      }
      trigger_amazon_report_fetch_weekly: {
        Args: { p_report_type: string }
        Returns: undefined
      }
      trigger_daily_sales_sync: { Args: never; Returns: undefined }
      trigger_daily_stockprice_sync: { Args: never; Returns: undefined }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      user_can_see_account: { Args: { p_account_id: string }; Returns: boolean }
      user_can_see_account_name: {
        Args: { p_account_name: string }
        Returns: boolean
      }
      user_can_see_brand: { Args: { p_brand: string }; Returns: boolean }
      windsor_autodetect_suspensions: {
        Args: { p_threshold?: number }
        Returns: {
          account_name: string
          action: string
          days_silent: number
          merchant_token: string
        }[]
      }
      windsor_backfill_chunk: { Args: { p_limit?: number }; Returns: number }
      windsor_backfill_date: {
        Args: { p_date: string }
        Returns: {
          body: string
          status_code: number
          windsor_account: string
        }[]
      }
      windsor_drain_live:
        | { Args: { p_batch?: number; p_sub?: number }; Returns: number }
        | {
            Args: { p_batch?: number; p_lookback?: number; p_sub?: number }
            Returns: number
          }
      windsor_drain_watchdog: { Args: never; Returns: undefined }
      windsor_fire_date: { Args: { p_date: string }; Returns: number }
      windsor_fire_missing: {
        Args: { p_batch?: number; p_lookback_days?: number; p_sub?: number }
        Returns: number
      }
      windsor_fire_pair: {
        Args: { p_date: string; p_token: string }
        Returns: number
      }
      windsor_selfheal_asin: {
        Args: {
          p_grace_days?: number
          p_lookback_days?: number
          p_max_heals?: number
        }
        Returns: {
          alerts_raised: number
          healed: number
          still_missing: number
        }[]
      }
      windsor_vendor_backfill_tick: {
        Args: { p_limit?: number }
        Returns: number
      }
      windsor_vendor_daily_refresh: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
      hugo_portfolio_mover_row: {
        account_id: string | null
        asin: string | null
        product_title: string | null
        curr_sales: number | null
        prev_sales: number | null
        delta_sales: number | null
        pct_change: number | null
        direction: string | null
        driver: string | null
        n_variations: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
