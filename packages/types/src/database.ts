// GENERATED FILE — do not hand-edit.
// Regenerate after any schema/RPC change with (from repo root, local Supabase stack running):
//   docker run --rm --network supabase_network_votero \
//     --env PG_META_DB_URL="postgresql://postgres:postgres@db:5432/postgres" \
//     --env PG_CONN_TIMEOUT_SECS=15 --env PG_QUERY_TIMEOUT_SECS=15 \
//     --env PG_META_GENERATE_TYPES=typescript \
//     --env PG_META_GENERATE_TYPES_INCLUDED_SCHEMAS=public,graphql_public \
//     --env PG_META_GENERATE_TYPES_SWIFT_ACCESS_CONTROL=internal \
//     --env PG_META_GENERATE_TYPES_DETECT_ONE_TO_ONE_RELATIONSHIPS=true \
//     public.ecr.aws/supabase/postgres-meta:v0.96.6 node dist/server/server.js > packages/types/src/database.ts
// (The documented `supabase gen types typescript --local` currently fails on this machine — it
// shells out to `podman` unconditionally rather than the configured Docker runtime. The command
// above runs the same postgres-meta image it would have used, directly via `docker run` on the
// Supabase-created network, as a workaround. Try the plain CLI command first in case a future
// CLI version fixes this.)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lobbies: {
        Row: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          brand_color: string | null
          brand_logo_url: string | null
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
          question_count: number
          status: Database["public"]["Enums"]["lobby_status"]
          tally_visibility: Database["public"]["Enums"]["tally_visibility"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["lobby_visibility"]
          voter_cap: number
          votes_count: number
        }
        Insert: {
          ballot_mode?: Database["public"]["Enums"]["ballot_mode"]
          brand_color?: string | null
          brand_logo_url?: string | null
          closed_at?: string | null
          closes_at?: string | null
          code: string
          created_at?: string
          creator_id: string
          id?: string
          joined_count?: number
          opened_at?: string | null
          otp_required?: boolean
          question_count?: number
          status?: Database["public"]["Enums"]["lobby_status"]
          tally_visibility?: Database["public"]["Enums"]["tally_visibility"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["lobby_visibility"]
          voter_cap: number
          votes_count?: number
        }
        Update: {
          ballot_mode?: Database["public"]["Enums"]["ballot_mode"]
          brand_color?: string | null
          brand_logo_url?: string | null
          closed_at?: string | null
          closes_at?: string | null
          code?: string
          created_at?: string
          creator_id?: string
          id?: string
          joined_count?: number
          opened_at?: string | null
          otp_required?: boolean
          question_count?: number
          status?: Database["public"]["Enums"]["lobby_status"]
          tally_visibility?: Database["public"]["Enums"]["tally_visibility"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["lobby_visibility"]
          voter_cap?: number
          votes_count?: number
        }
        Relationships: []
      }
      options: {
        Row: {
          id: string
          label: string
          lobby_id: string
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          label: string
          lobby_id: string
          position: number
          question_id: string
        }
        Update: {
          id?: string
          label?: string
          lobby_id?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          answered_count: number
          display_name: string | null
          has_voted: boolean
          id: string
          joined_at: string
          lobby_id: string
          user_id: string
        }
        Insert: {
          answered_count?: number
          display_name?: string | null
          has_voted?: boolean
          id?: string
          joined_at?: string
          lobby_id: string
          user_id: string
        }
        Update: {
          answered_count?: number
          display_name?: string | null
          has_voted?: boolean
          id?: string
          joined_at?: string
          lobby_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          is_anonymous: boolean
          last_name: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          is_anonymous?: boolean
          last_name?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          is_anonymous?: boolean
          last_name?: string | null
          username?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          id: string
          lobby_id: string
          max_selections: number
          position: number
          title: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          id?: string
          lobby_id: string
          max_selections?: number
          position: number
          title: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          id?: string
          lobby_id?: string
          max_selections?: number
          position?: number
          title?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_hits: {
        Row: {
          action: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          lobby_id: string
          option_id: string | null
          participant_id: string
          question_id: string
          rank: number | null
          response_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lobby_id: string
          option_id?: string | null
          participant_id: string
          question_id: string
          rank?: number | null
          response_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lobby_id?: string
          option_id?: string | null
          participant_id?: string
          question_id?: string
          rank?: number | null
          response_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_lobby_id_participant_id_fkey"
            columns: ["lobby_id", "participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["lobby_id", "id"]
          },
          {
            foreignKeyName: "votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contains_profanity: { Args: { p_text: string }; Returns: boolean }
      generate_lobby_code: { Args: never; Returns: string }
      lobby_to_json: {
        Args: { l: Database["public"]["Tables"]["lobbies"]["Row"] }
        Returns: Json
      }
      option_to_json: {
        Args: { o: Database["public"]["Tables"]["options"]["Row"] }
        Returns: Json
      }
      profile_to_json: {
        Args: { p: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: Json
      }
      question_to_json: {
        Args: { q: Database["public"]["Tables"]["questions"]["Row"] }
        Returns: Json
      }
      relative_luminance: {
        Args: { b: number; g: number; r: number }
        Returns: number
      }
      rpc_cast_vote: {
        Args: { p_lobby_id: string; p_option_id: string }
        Returns: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          brand_color: string | null
          brand_logo_url: string | null
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
          question_count: number
          status: Database["public"]["Enums"]["lobby_status"]
          tally_visibility: Database["public"]["Enums"]["tally_visibility"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["lobby_visibility"]
          voter_cap: number
          votes_count: number
        }
        SetofOptions: {
          from: "*"
          to: "lobbies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_cast_vote_multi: {
        Args: {
          p_lobby_id: string
          p_option_ids: string[]
          p_question_id: string
        }
        Returns: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          brand_color: string | null
          brand_logo_url: string | null
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
          question_count: number
          status: Database["public"]["Enums"]["lobby_status"]
          tally_visibility: Database["public"]["Enums"]["tally_visibility"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["lobby_visibility"]
          voter_cap: number
          votes_count: number
        }
        SetofOptions: {
          from: "*"
          to: "lobbies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_cast_vote_ranked: {
        Args: {
          p_lobby_id: string
          p_question_id: string
          p_ranked_option_ids: string[]
        }
        Returns: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          brand_color: string | null
          brand_logo_url: string | null
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
          question_count: number
          status: Database["public"]["Enums"]["lobby_status"]
          tally_visibility: Database["public"]["Enums"]["tally_visibility"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["lobby_visibility"]
          voter_cap: number
          votes_count: number
        }
        SetofOptions: {
          from: "*"
          to: "lobbies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_check_rate_limit: {
        Args: { p_action: string; p_max_count: number; p_window: string }
        Returns: undefined
      }
      rpc_compute_irv: { Args: { p_question_id: string }; Returns: Json }
      rpc_count_completed_participants: {
        Args: { p_lobby_id: string }
        Returns: number
      }
      rpc_create_api_key: { Args: { p_name: string }; Returns: Json }
      rpc_create_lobby: {
        Args: {
          p_ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          p_closes_at?: string
          p_questions: Json
          p_tally_visibility: Database["public"]["Enums"]["tally_visibility"]
          p_title: string
          p_voter_cap: number
        }
        Returns: Json
      }
      rpc_get_ballot_detail: { Args: { p_lobby_id: string }; Returns: Json }
      rpc_get_tally: { Args: { p_lobby_id: string }; Returns: Json }
      rpc_join_lobby: {
        Args: { p_code: string; p_display_name?: string }
        Returns: Json
      }
      rpc_revoke_api_key: { Args: { p_id: string }; Returns: undefined }
      rpc_set_lobby_status: {
        Args: { p_action: string; p_lobby_id: string }
        Returns: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          brand_color: string | null
          brand_logo_url: string | null
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
          question_count: number
          status: Database["public"]["Enums"]["lobby_status"]
          tally_visibility: Database["public"]["Enums"]["tally_visibility"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["lobby_visibility"]
          voter_cap: number
          votes_count: number
        }
        SetofOptions: {
          from: "*"
          to: "lobbies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_submit_text_response: {
        Args: {
          p_lobby_id: string
          p_question_id: string
          p_response_text: string
        }
        Returns: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          brand_color: string | null
          brand_logo_url: string | null
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
          question_count: number
          status: Database["public"]["Enums"]["lobby_status"]
          tally_visibility: Database["public"]["Enums"]["tally_visibility"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["lobby_visibility"]
          voter_cap: number
          votes_count: number
        }
        SetofOptions: {
          from: "*"
          to: "lobbies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_update_lobby_branding: {
        Args: {
          p_brand_color: string
          p_brand_logo_url: string
          p_lobby_id: string
        }
        Returns: Json
      }
      rpc_update_lobby_questions: {
        Args: { p_lobby_id: string; p_questions: Json }
        Returns: Json
      }
      rpc_update_profile: {
        Args: {
          p_avatar_url?: string
          p_first_name: string
          p_last_name: string
          p_username: string
        }
        Returns: Json
      }
      srgb_to_linear: { Args: { c: number }; Returns: number }
      validate_lobby_questions: {
        Args: { p_questions: Json }
        Returns: undefined
      }
    }
    Enums: {
      ballot_mode: "anonymous" | "open"
      lobby_status: "draft" | "open" | "closed"
      lobby_visibility: "public" | "private"
      question_type: "choice" | "text" | "ranked"
      tally_visibility: "live" | "hidden"
    }
    CompositeTypes: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ballot_mode: ["anonymous", "open"],
      lobby_status: ["draft", "open", "closed"],
      lobby_visibility: ["public", "private"],
      question_type: ["choice", "text", "ranked"],
      tally_visibility: ["live", "hidden"],
    },
  },
} as const

