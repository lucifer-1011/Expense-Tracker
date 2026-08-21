/**
 * Hand-written to match supabase/migrations/*.sql. If a real Supabase project is
 * linked later, this can be regenerated from the live schema with:
 *   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 * (safe to re-run -- it will overwrite this file with the same shape).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DbMemberRole = "owner" | "member";
export type DbExpenseCategory =
  | "groceries"
  | "rent"
  | "utilities"
  | "internet"
  | "food"
  | "transport"
  | "household"
  | "entertainment"
  | "other";
export type DbSplitType = "equal" | "custom";
export type DbSettlementMethod = "cash" | "upi" | "bank_transfer" | "other";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      flats: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["flats"]["Insert"]>;
      };
      flat_members: {
        Row: {
          id: string;
          flat_id: string;
          user_id: string;
          role: DbMemberRole;
          is_active: boolean;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          flat_id: string;
          user_id: string;
          role?: DbMemberRole;
          is_active?: boolean;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["flat_members"]["Insert"]>;
      };
      expenses: {
        Row: {
          id: string;
          flat_id: string;
          title: string;
          description: string | null;
          category: DbExpenseCategory;
          amount_paise: number;
          expense_date: string;
          split_type: DbSplitType;
          paid_by: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          flat_id: string;
          title: string;
          description?: string | null;
          category: DbExpenseCategory;
          amount_paise: number;
          expense_date: string;
          split_type?: DbSplitType;
          paid_by: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          member_id: string;
          share_amount_paise: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          member_id: string;
          share_amount_paise: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["expense_splits"]["Insert"]>;
      };
      settlements: {
        Row: {
          id: string;
          flat_id: string;
          from_member_id: string;
          to_member_id: string;
          amount_paise: number;
          method: DbSettlementMethod;
          notes: string | null;
          settled_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          flat_id: string;
          from_member_id: string;
          to_member_id: string;
          amount_paise: number;
          method?: DbSettlementMethod;
          notes?: string | null;
          settled_at?: string;
          created_by?: string | null;
          created_at?: string;
        };
        // Intentionally no Update type exported for use -- settlements are append-only
        // (no UPDATE grant exists in the database either; see the RLS migration).
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_flat: {
        Args: { flat_name: string };
        Returns: Database["public"]["Tables"]["flats"]["Row"];
      };
      join_flat_with_invite_code: {
        Args: { code: string };
        Returns: Database["public"]["Tables"]["flat_members"]["Row"];
      };
      leave_flat: {
        Args: { target_flat_id: string };
        Returns: Database["public"]["Tables"]["flat_members"]["Row"];
      };
      is_flat_member: {
        Args: { target_flat_id: string };
        Returns: boolean;
      };
      is_active_flat_member: {
        Args: { target_flat_id: string };
        Returns: boolean;
      };
      is_flat_owner: {
        Args: { target_flat_id: string };
        Returns: boolean;
      };
      shares_flat_with: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}
