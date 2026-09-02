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
    PostgrestVersion: "14.5"
  }
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
      expense_splits: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          member_id: string
          share_amount_paise: number
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          member_id: string
          share_amount_paise: number
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          member_id?: string
          share_amount_paise?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "flat_members"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_paise: number
          category: string
          client_dedupe_key: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          flat_id: string
          id: string
          paid_by: string
          split_type: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_paise: number
          category: string
          client_dedupe_key?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date: string
          flat_id: string
          id?: string
          paid_by: string
          split_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          category?: string
          client_dedupe_key?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          flat_id?: string
          id?: string
          paid_by?: string
          split_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "flat_members"
            referencedColumns: ["id"]
          },
        ]
      }
      flat_members: {
        Row: {
          flat_id: string
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          flat_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          flat_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flat_members_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flats: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_user_id: string | null
          amount_paise: number | null
          context_text: string | null
          created_at: string
          flat_id: string
          id: string
          is_read: boolean
          read_at: string | null
          recipient_user_id: string
          related_expense_id: string | null
          related_settlement_request_id: string | null
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          amount_paise?: number | null
          context_text?: string | null
          created_at?: string
          flat_id: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_user_id: string
          related_expense_id?: string | null
          related_settlement_request_id?: string | null
          type: string
        }
        Update: {
          actor_user_id?: string | null
          amount_paise?: number | null
          context_text?: string | null
          created_at?: string
          flat_id?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_user_id?: string
          related_expense_id?: string | null
          related_settlement_request_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_expense_id_fkey"
            columns: ["related_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_settlement_request_id_fkey"
            columns: ["related_settlement_request_id"]
            isOneToOne: false
            referencedRelation: "settlement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      settlement_requests: {
        Row: {
          amount_paise: number
          created_at: string
          created_by: string | null
          expense_id: string | null
          flat_id: string
          id: string
          method: string
          note: string | null
          payer_member_id: string
          receiver_member_id: string
          resolved_at: string | null
          resolved_by: string | null
          settlement_id: string | null
          status: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          flat_id: string
          id?: string
          method?: string
          note?: string | null
          payer_member_id: string
          receiver_member_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          settlement_id?: string | null
          status?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          flat_id?: string
          id?: string
          method?: string
          note?: string | null
          payer_member_id?: string
          receiver_member_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          settlement_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_requests_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_requests_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_requests_payer_member_id_fkey"
            columns: ["payer_member_id"]
            isOneToOne: false
            referencedRelation: "flat_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_requests_receiver_member_id_fkey"
            columns: ["receiver_member_id"]
            isOneToOne: false
            referencedRelation: "flat_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_requests_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount_paise: number
          created_at: string
          created_by: string | null
          expense_id: string | null
          flat_id: string
          from_member_id: string
          id: string
          method: string
          notes: string | null
          settled_at: string
          to_member_id: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          flat_id: string
          from_member_id: string
          id?: string
          method?: string
          notes?: string | null
          settled_at?: string
          to_member_id: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          flat_id?: string
          from_member_id?: string
          id?: string
          method?: string
          notes?: string | null
          settled_at?: string
          to_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "flat_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "flat_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_settlement_request: {
        Args: { request_id: string }
        Returns: {
          amount_paise: number
          created_at: string
          created_by: string | null
          expense_id: string | null
          flat_id: string
          from_member_id: string
          id: string
          method: string
          notes: string | null
          settled_at: string
          to_member_id: string
        }
        SetofOptions: {
          from: "*"
          to: "settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_flat: {
        Args: { flat_name: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "flats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_settlement_request: {
        Args: {
          amount_paise: number
          method?: string
          note?: string
          p_expense_id?: string
          receiver_member_id: string
        }
        Returns: {
          amount_paise: number
          created_at: string
          created_by: string | null
          expense_id: string | null
          flat_id: string
          id: string
          method: string
          note: string | null
          payer_member_id: string
          receiver_member_id: string
          resolved_at: string | null
          resolved_by: string | null
          settlement_id: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "settlement_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invite_code: { Args: never; Returns: string }
      is_active_flat_member: {
        Args: { target_flat_id: string }
        Returns: boolean
      }
      is_expense_payer: {
        Args: { target_expense_id: string }
        Returns: boolean
      }
      is_flat_member: { Args: { target_flat_id: string }; Returns: boolean }
      is_flat_owner: { Args: { target_flat_id: string }; Returns: boolean }
      join_flat_with_invite_code: {
        Args: { code: string }
        Returns: {
          flat_id: string
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "flat_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      leave_flat: {
        Args: { target_flat_id: string }
        Returns: {
          flat_id: string
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          role: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "flat_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      // Hand-added to match supabase/migrations/20260902000002_expense_split_integrity.sql.
      // Regenerate this file with `supabase gen types typescript --linked`
      // once that migration is applied, and these entries will be produced
      // automatically.
      create_expense_with_splits: {
        Args: {
          p_flat_id: string
          p_title: string
          p_description: string | null
          p_category: string
          p_amount_paise: number
          p_expense_date: string
          p_split_type: string
          p_paid_by: string
          p_splits: Json
          p_dedupe_key?: string
        }
        Returns: {
          amount_paise: number
          category: string
          client_dedupe_key: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          flat_id: string
          id: string
          paid_by: string
          split_type: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_expense_with_splits: {
        Args: {
          p_expense_id: string
          p_title: string
          p_description: string | null
          p_category: string
          p_amount_paise: number
          p_expense_date: string
          p_split_type: string
          p_paid_by: string
          p_splits: Json
        }
        Returns: {
          amount_paise: number
          category: string
          client_dedupe_key: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          flat_id: string
          id: string
          paid_by: string
          split_type: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_settlement_request: {
        Args: { request_id: string }
        Returns: {
          amount_paise: number
          created_at: string
          created_by: string | null
          expense_id: string | null
          flat_id: string
          id: string
          method: string
          note: string | null
          payer_member_id: string
          receiver_member_id: string
          resolved_at: string | null
          resolved_by: string | null
          settlement_id: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "settlement_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      shares_flat_with: { Args: { target_user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
