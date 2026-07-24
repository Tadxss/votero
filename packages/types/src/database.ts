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
      lobbies: {
        Row: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
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
          closed_at?: string | null
          closes_at?: string | null
          code: string
          created_at?: string
          creator_id: string
          id?: string
          joined_count?: number
          opened_at?: string | null
          otp_required?: boolean
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
          closed_at?: string | null
          closes_at?: string | null
          code?: string
          created_at?: string
          creator_id?: string
          id?: string
          joined_count?: number
          opened_at?: string | null
          otp_required?: boolean
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
        }
        Insert: {
          id?: string
          label: string
          lobby_id: string
          position: number
        }
        Update: {
          id?: string
          label?: string
          lobby_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "options_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          display_name: string | null
          has_voted: boolean
          id: string
          joined_at: string
          lobby_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          has_voted?: boolean
          id?: string
          joined_at?: string
          lobby_id: string
          user_id: string
        }
        Update: {
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
      votes: {
        Row: {
          created_at: string
          id: string
          lobby_id: string
          option_id: string
          participant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lobby_id: string
          option_id: string
          participant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lobby_id?: string
          option_id?: string
          participant_id?: string
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
            isOneToOne: true
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      rpc_cast_vote: {
        Args: { p_lobby_id: string; p_option_id: string }
        Returns: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
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
      rpc_create_lobby: {
        Args: {
          p_ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          p_closes_at?: string
          p_options: string[]
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
      rpc_set_lobby_status: {
        Args: { p_action: string; p_lobby_id: string }
        Returns: {
          ballot_mode: Database["public"]["Enums"]["ballot_mode"]
          closed_at: string | null
          closes_at: string | null
          code: string
          created_at: string
          creator_id: string
          id: string
          joined_count: number
          opened_at: string | null
          otp_required: boolean
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
      rpc_update_profile: {
        Args: {
          p_avatar_url?: string
          p_first_name: string
          p_last_name: string
          p_username: string
        }
        Returns: Json
      }
    }
    Enums: {
      ballot_mode: "anonymous" | "open"
      lobby_status: "draft" | "open" | "closed"
      lobby_visibility: "public" | "private"
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
      tally_visibility: ["live", "hidden"],
    },
  },
} as const

