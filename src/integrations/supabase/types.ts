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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      billing_codes: {
        Row: {
          active: number
          code: string
          code_key: string
          executive_ids_json: string
          firm_id: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          active?: number
          code: string
          code_key: string
          executive_ids_json?: string
          firm_id?: string
          id: string
          label: string
          updated_at: string
        }
        Update: {
          active?: number
          code?: string
          code_key?: string
          executive_ids_json?: string
          firm_id?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_templates: {
        Row: {
          firm_id: string
          template_json: string
          traveler_id: string
          traveler_name: string
          updated_at: string
        }
        Insert: {
          firm_id?: string
          template_json: string
          traveler_id: string
          traveler_name: string
          updated_at: string
        }
        Update: {
          firm_id?: string
          template_json?: string
          traveler_id?: string
          traveler_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      decision_batches: {
        Row: {
          batch_json: string
          executive_id: string
          firm_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          batch_json: string
          executive_id: string
          firm_id?: string
          id: string
          status?: string
          updated_at: string
        }
        Update: {
          batch_json?: string
          executive_id?: string
          firm_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      decision_responses: {
        Row: {
          action_json: string
          batch_id: string
          firm_id: string
          id: string
          item_id: string
          recorded_at: string
        }
        Insert: {
          action_json: string
          batch_id: string
          firm_id?: string
          id: string
          item_id: string
          recorded_at: string
        }
        Update: {
          action_json?: string
          batch_id?: string
          firm_id?: string
          id?: string
          item_id?: string
          recorded_at?: string
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          product: string | null
          team_size: string | null
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          product?: string | null
          team_size?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          product?: string | null
          team_size?: string | null
        }
        Relationships: []
      }
      executive_deferred_uploads: {
        Row: {
          executive_id: string
          firm_id: string
          id: string
          row_json: string
          updated_at: string
        }
        Insert: {
          executive_id: string
          firm_id?: string
          id: string
          row_json: string
          updated_at: string
        }
        Update: {
          executive_id?: string
          firm_id?: string
          id?: string
          row_json?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_profiles: {
        Row: {
          executive_id: string
          firm_id: string
          name: string
          profile_json: string
          updated_at: string
        }
        Insert: {
          executive_id: string
          firm_id?: string
          name: string
          profile_json: string
          updated_at: string
        }
        Update: {
          executive_id?: string
          firm_id?: string
          name?: string
          profile_json?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_unassigned_uploads: {
        Row: {
          executive_id: string
          executive_name: string
          firm_id: string
          id: string
          row_json: string
          updated_at: string
        }
        Insert: {
          executive_id: string
          executive_name: string
          firm_id?: string
          id: string
          row_json: string
          updated_at: string
        }
        Update: {
          executive_id?: string
          executive_name?: string
          firm_id?: string
          id?: string
          row_json?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_upload_exclusions: {
        Row: {
          approved_at: string
          executive_id: string
          firm_id: string
          id: string
          row_json: string
          source_file_id: string
        }
        Insert: {
          approved_at: string
          executive_id: string
          firm_id?: string
          id: string
          row_json: string
          source_file_id: string
        }
        Update: {
          approved_at?: string
          executive_id?: string
          firm_id?: string
          id?: string
          row_json?: string
          source_file_id?: string
        }
        Relationships: []
      }
      executive_upload_files: {
        Row: {
          content_type: string
          created_at: string
          executive_id: string
          filename: string
          firm_id: string
          id: string
          object_key: string
        }
        Insert: {
          content_type: string
          created_at: string
          executive_id: string
          filename: string
          firm_id?: string
          id: string
          object_key: string
        }
        Update: {
          content_type?: string
          created_at?: string
          executive_id?: string
          filename?: string
          firm_id?: string
          id?: string
          object_key?: string
        }
        Relationships: []
      }
      executive_upload_trips: {
        Row: {
          executive_id: string
          firm_id: string
          trip_id: string
          trip_json: string
          updated_at: string
        }
        Insert: {
          executive_id: string
          firm_id?: string
          trip_id: string
          trip_json: string
          updated_at: string
        }
        Update: {
          executive_id?: string
          firm_id?: string
          trip_id?: string
          trip_json?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_vendor_rules: {
        Row: {
          executive_id: string
          firm_id: string
          id: string
          rule_json: string
          updated_at: string
        }
        Insert: {
          executive_id: string
          firm_id?: string
          id: string
          rule_json: string
          updated_at: string
        }
        Update: {
          executive_id?: string
          firm_id?: string
          id?: string
          rule_json?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_approval_requests: {
        Row: {
          approver_email: string
          clarification: string
          created_at: string
          documents_json: string
          executive_id: string
          firm_id: string
          id: string
          message_id: string | null
          notes: string | null
          send_token_hash: string
          signature_name: string | null
          signed_at: string | null
          snapshot_json: string
          status: string
          token_hash: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          approver_email: string
          clarification?: string
          created_at: string
          documents_json: string
          executive_id: string
          firm_id?: string
          id: string
          message_id?: string | null
          notes?: string | null
          send_token_hash: string
          signature_name?: string | null
          signed_at?: string | null
          snapshot_json: string
          status: string
          token_hash: string
          trip_id: string
          updated_at: string
        }
        Update: {
          approver_email?: string
          clarification?: string
          created_at?: string
          documents_json?: string
          executive_id?: string
          firm_id?: string
          id?: string
          message_id?: string | null
          notes?: string | null
          send_token_hash?: string
          signature_name?: string | null
          signed_at?: string | null
          snapshot_json?: string
          status?: string
          token_hash?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_learning_decisions: {
        Row: {
          active: number
          decision_json: string
          executive_id: string
          firm_id: string
          id: string
          recorded_at: string
          row_key: string
        }
        Insert: {
          active?: number
          decision_json: string
          executive_id: string
          firm_id?: string
          id: string
          recorded_at: string
          row_key: string
        }
        Update: {
          active?: number
          decision_json?: string
          executive_id?: string
          firm_id?: string
          id?: string
          recorded_at?: string
          row_key?: string
        }
        Relationships: []
      }
      expense_learning_preferences: {
        Row: {
          active: number
          executive_id: string
          firm_id: string
          id: string
          preference_json: string
          updated_at: string
        }
        Insert: {
          active?: number
          executive_id: string
          firm_id?: string
          id: string
          preference_json: string
          updated_at: string
        }
        Update: {
          active?: number
          executive_id?: string
          firm_id?: string
          id?: string
          preference_json?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_learning_settings: {
        Row: {
          enabled: number
          executive_id: string
          firm_id: string
          updated_at: string
        }
        Insert: {
          enabled?: number
          executive_id: string
          firm_id?: string
          updated_at: string
        }
        Update: {
          enabled?: number
          executive_id?: string
          firm_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      firm_invites: {
        Row: {
          created_at: string
          email: string
          firm_id: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["firm_role"]
        }
        Insert: {
          created_at?: string
          email: string
          firm_id: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["firm_role"]
        }
        Update: {
          created_at?: string
          email?: string
          firm_id?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["firm_role"]
        }
        Relationships: [
          {
            foreignKeyName: "firm_invites_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_members: {
        Row: {
          created_at: string
          email: string
          firm_id: string
          role: Database["public"]["Enums"]["firm_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          firm_id: string
          role?: Database["public"]["Enums"]["firm_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          firm_id?: string
          role?: Database["public"]["Enums"]["firm_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_members_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          id: string
          name: string
          sso_domain: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sso_domain?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sso_domain?: string | null
        }
        Relationships: []
      }
      itinerary_attachments: {
        Row: {
          byte_count: number
          created_at: string
          entry_id: string
          executive_id: string
          firm_id: string
          id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          byte_count: number
          created_at: string
          entry_id: string
          executive_id: string
          firm_id?: string
          id: string
          trip_id: string
          updated_at: string
        }
        Update: {
          byte_count?: number
          created_at?: string
          entry_id?: string
          executive_id?: string
          firm_id?: string
          id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_library: {
        Row: {
          firm_id: string
          id: string
          template_json: string
          updated_at: string
        }
        Insert: {
          firm_id?: string
          id: string
          template_json: string
          updated_at: string
        }
        Update: {
          firm_id?: string
          id?: string
          template_json?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anya_exec: { Args: { batch: Json; firm: string }; Returns: Json }
    }
    Enums: {
      firm_role: "owner" | "admin" | "editor" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      firm_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
