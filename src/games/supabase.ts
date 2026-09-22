import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * The games tables live in the Insight Central Supabase project but are not in the
 * generated Database type (src/integrations/supabase/types.ts, 20k lines, regenerated
 * from the whole schema). Rather than hand-edit that file, the games see the ONE shared
 * client through a widened type: the same instance, so there is no second GoTrue
 * client and no extra session storage, just typed access to the cp_games_* tables.
 *
 * No auth is required: the original app has no login, and the cp_games_* tables are
 * the only ones whose RLS policies let anon write. If a staff member happens to be
 * signed in to the dashboard, the same policies cover `authenticated`.
 */

type Uuid = string;

export type GamesDatabase = {
  public: {
    Tables: {
      cp_games_players: {
        Row: { id: Uuid; name: string; created_at: string };
        Insert: { id?: Uuid; name: string; created_at?: string };
        Update: { id?: Uuid; name?: string; created_at?: string };
        Relationships: [];
      };
      cp_games_events: {
        Row: { id: Uuid; name: string; event_date: string; created_at: string };
        Insert: { id?: Uuid; name: string; event_date?: string; created_at?: string };
        Update: { id?: Uuid; name?: string; event_date?: string; created_at?: string };
        Relationships: [];
      };
      cp_games_scores: {
        Row: { id: Uuid; event_id: Uuid; player_id: Uuid; position: number; points: number; created_at: string };
        Insert: { id?: Uuid; event_id: Uuid; player_id: Uuid; position: number; points: number; created_at?: string };
        Update: { id?: Uuid; event_id?: Uuid; player_id?: Uuid; position?: number; points?: number; created_at?: string };
        Relationships: [
          { foreignKeyName: "cp_games_scores_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "cp_games_events"; referencedColumns: ["id"] },
          { foreignKeyName: "cp_games_scores_player_id_fkey"; columns: ["player_id"]; isOneToOne: false; referencedRelation: "cp_games_players"; referencedColumns: ["id"] },
        ];
      };
      cp_games_mini_golf_rounds: {
        Row: { id: Uuid; event_name: string; holes_count: number; status: string; current_hole: number; current_player_index: number; created_at: string };
        Insert: { id?: Uuid; event_name: string; holes_count: number; status?: string; current_hole?: number; current_player_index?: number; created_at?: string };
        Update: { id?: Uuid; event_name?: string; holes_count?: number; status?: string; current_hole?: number; current_player_index?: number; created_at?: string };
        Relationships: [];
      };
      cp_games_mini_golf_hole_scores: {
        Row: { id: Uuid; round_id: Uuid; player_id: Uuid; hole_number: number; strokes: number; created_at: string };
        Insert: { id?: Uuid; round_id: Uuid; player_id: Uuid; hole_number: number; strokes: number; created_at?: string };
        Update: { id?: Uuid; round_id?: Uuid; player_id?: Uuid; hole_number?: number; strokes?: number; created_at?: string };
        Relationships: [
          { foreignKeyName: "cp_games_mini_golf_hole_scores_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "cp_games_mini_golf_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "cp_games_mini_golf_hole_scores_player_id_fkey"; columns: ["player_id"]; isOneToOne: false; referencedRelation: "cp_games_players"; referencedColumns: ["id"] },
        ];
      };
      cp_games_mini_golf_round_players: {
        Row: { id: Uuid; round_id: Uuid; player_id: Uuid; created_at: string };
        Insert: { id?: Uuid; round_id: Uuid; player_id: Uuid; created_at?: string };
        Update: { id?: Uuid; round_id?: Uuid; player_id?: Uuid; created_at?: string };
        Relationships: [
          { foreignKeyName: "cp_games_mini_golf_round_players_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "cp_games_mini_golf_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "cp_games_mini_golf_round_players_player_id_fkey"; columns: ["player_id"]; isOneToOne: false; referencedRelation: "cp_games_players"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type GamesTables = GamesDatabase["public"]["Tables"];

type DashboardAndGamesDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & GamesTables;
  };
};

export const gamesDb = supabase as unknown as SupabaseClient<DashboardAndGamesDatabase>;

export type GamesPlayer = GamesDatabase["public"]["Tables"]["cp_games_players"]["Row"];

/** Sentinel for "delete every row": PostgREST refuses an unfiltered DELETE. */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";
