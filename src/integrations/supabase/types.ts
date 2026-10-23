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
      agent_versions: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          owner_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          owner_id: string
          snapshot: Json
          version: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      api_idempotency: {
        Row: {
          created_at: string
          key: string
          owner_id: string
          response: Json
        }
        Insert: {
          created_at?: string
          key: string
          owner_id: string
          response: Json
        }
        Update: {
          created_at?: string
          key?: string
          owner_id?: string
          response?: Json
        }
        Relationships: []
      }
      arena_battles: {
        Row: {
          blind: boolean
          created_at: string
          credits: number
          id: string
          model_a: string
          model_b: string
          owner_id: string
          voted_at: string | null
          winner: string | null
        }
        Insert: {
          blind?: boolean
          created_at?: string
          credits?: number
          id?: string
          model_a: string
          model_b: string
          owner_id: string
          voted_at?: string | null
          winner?: string | null
        }
        Update: {
          blind?: boolean
          created_at?: string
          credits?: number
          id?: string
          model_a?: string
          model_b?: string
          owner_id?: string
          voted_at?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      agents: {
        Row: {
          created_at: string
          description: string
          id: string
          instructions: string
          max_cost: number
          max_tokens: number
          memory: string
          model: string
          name: string
          owner_id: string
          tools: string[]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          instructions?: string
          max_cost?: number
          max_tokens?: number
          memory?: string
          model?: string
          name: string
          owner_id: string
          tools?: string[]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          instructions?: string
          max_cost?: number
          max_tokens?: number
          memory?: string
          model?: string
          name?: string
          owner_id?: string
          tools?: string[]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          owner_id: string
          prefix: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          owner_id?: string
          prefix: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          owner_id?: string
          prefix?: string
        }
        Relationships: []
      }
      app_user_connections: {
        Row: {
          account_label: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          parts: Json
          role: string
          sdk_id: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          parts?: Json
          role: string
          sdk_id: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          parts?: Json
          role?: string
          sdk_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          pinned: boolean
          share_token: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          pinned?: boolean
          share_token?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          pinned?: boolean
          share_token?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_adjustments: {
        Row: {
          admin_id: string | null
          amount: number
          created_at: string
          id: string
          owner_id: string
          reason: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          created_at?: string
          id?: string
          owner_id: string
          reason?: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          owner_id?: string
          reason?: string
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          active: boolean
          created_at: string
          credits: number
          display_order: number
          featured: boolean
          id: string
          metadata: Json
          name: string
          price_xof: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credits: number
          display_order?: number
          featured?: boolean
          id?: string
          metadata?: Json
          name: string
          price_xof: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credits?: number
          display_order?: number
          featured?: boolean
          id?: string
          metadata?: Json
          name?: string
          price_xof?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_pricing_rules: {
        Row: {
          active: boolean
          created_at: string
          estimate_category: string | null
          id: string
          margin_target: number
          max_allowed_cost: number | null
          model: string
          price_verified: boolean
          provider: string
          provider_cost: number
          technova_cost: number
          unit_label: string
          verified_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          estimate_category?: string | null
          id?: string
          margin_target?: number
          max_allowed_cost?: number | null
          model: string
          price_verified?: boolean
          provider?: string
          provider_cost?: number
          technova_cost?: number
          unit_label?: string
          verified_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          estimate_category?: string | null
          id?: string
          margin_target?: number
          max_allowed_cost?: number | null
          model?: string
          price_verified?: boolean
          provider?: string
          provider_cost?: number
          technova_cost?: number
          unit_label?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      credit_reservations: {
        Row: {
          amount: number
          created_at: string
          id: string
          label: string
          owner_id: string
          settled_at: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          label?: string
          owner_id: string
          settled_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
          settled_at?: string | null
          status?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          label: string
          owner_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          label?: string
          owner_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string
          owner_id?: string
        }
        Relationships: []
      }
      credit_transfers: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          id: string
          idempotency_key: string
          reason: string
          to_user_id: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          id?: string
          idempotency_key: string
          reason?: string
          to_user_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          reason?: string
          to_user_id?: string
        }
        Relationships: []
      }
      credit_wallets: {
        Row: {
          balance: number
          owner_id: string
          reserved_balance: number
          updated_at: string
        }
        Insert: {
          balance?: number
          owner_id: string
          reserved_balance?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          owner_id?: string
          reserved_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      media_generations: {
        Row: {
          archived_paths: Json
          aspect_ratio: string
          charged_credits: number | null
          created_at: string
          duration: string | null
          error: string | null
          expires_at: string | null
          id: string
          kind: string
          model: string
          owner_id: string
          prompt: string
          reserved_credits: number
          result_urls: Json
          settled: boolean
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          archived_paths?: Json
          aspect_ratio: string
          charged_credits?: number | null
          created_at?: string
          duration?: string | null
          error?: string | null
          expires_at?: string | null
          id?: string
          kind: string
          model: string
          owner_id: string
          prompt: string
          reserved_credits?: number
          result_urls?: Json
          settled?: boolean
          status?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          archived_paths?: Json
          aspect_ratio?: string
          charged_credits?: number | null
          created_at?: string
          duration?: string | null
          error?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          model?: string
          owner_id?: string
          prompt?: string
          reserved_credits?: number
          result_urls?: Json
          settled?: boolean
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_xof: number
          checkout_url: string | null
          created_at: string
          credited: boolean
          credits: number
          id: string
          livemode: boolean
          owner_id: string
          pack_slug: string
          provider: string
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_xof: number
          checkout_url?: string | null
          created_at?: string
          credited?: boolean
          credits: number
          id?: string
          livemode?: boolean
          owner_id: string
          pack_slug: string
          provider?: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_xof?: number
          checkout_url?: string | null
          created_at?: string
          credited?: boolean
          credits?: number
          id?: string
          livemode?: boolean
          owner_id?: string
          pack_slug?: string
          provider?: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          access: string[]
          active: boolean
          display_order: number
          key: string
          label_en: string
          label_fr: string
          status: string
          updated_at: string
        }
        Insert: {
          access: string[]
          active?: boolean
          display_order?: number
          key: string
          label_en: string
          label_fr: string
          status?: string
          updated_at?: string
        }
        Update: {
          access?: string[]
          active?: boolean
          display_order?: number
          key?: string
          label_en?: string
          label_fr?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          display_name?: string
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
      published_sites: {
        Row: {
          created_at: string
          files: Json
          id: string
          owner_id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          files: Json
          id?: string
          owner_id: string
          slug: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          files?: Json
          id?: string
          owner_id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          user_id: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          user_id: string
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      registry_favorites: {
        Row: {
          created_at: string
          item_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registry_favorites_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "registry_items"
            referencedColumns: ["id"]
          },
        ]
      }
      registry_items: {
        Row: {
          attribution_required: boolean
          author: string
          category: string
          commercial_use: boolean
          content: string
          created_at: string
          description: string
          downloads: number
          file_ext: string
          id: string
          license: string
          modification: boolean
          owner_id: string | null
          redistribution: boolean
          remix_of: string | null
          source: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          attribution_required?: boolean
          author?: string
          category: string
          commercial_use?: boolean
          content?: string
          created_at?: string
          description?: string
          downloads?: number
          file_ext?: string
          id?: string
          license?: string
          modification?: boolean
          owner_id?: string | null
          redistribution?: boolean
          remix_of?: string | null
          source?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          attribution_required?: boolean
          author?: string
          category?: string
          commercial_use?: boolean
          content?: string
          created_at?: string
          description?: string
          downloads?: number
          file_ext?: string
          id?: string
          license?: string
          modification?: boolean
          owner_id?: string | null
          redistribution?: boolean
          remix_of?: string | null
          source?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "registry_items_remix_of_fkey"
            columns: ["remix_of"]
            isOneToOne: false
            referencedRelation: "registry_items"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          kind: string
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          kind: string
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      studio_jobs: {
        Row: {
          answers: string
          attempts: number
          charged: boolean
          created_at: string
          error: string | null
          id: string
          lang: string
          lease_until: string | null
          message_id: string
          output: string
          owner_id: string
          plan: Json
          reservation_id: string | null
          request: string
          status: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          answers?: string
          attempts?: number
          charged?: boolean
          created_at?: string
          error?: string | null
          id?: string
          lang?: string
          lease_until?: string | null
          message_id: string
          output?: string
          owner_id: string
          plan: Json
          reservation_id?: string | null
          request: string
          status?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          answers?: string
          attempts?: number
          charged?: boolean
          created_at?: string
          error?: string | null
          id?: string
          lang?: string
          lease_until?: string | null
          message_id?: string
          output?: string
          owner_id?: string
          plan?: Json
          reservation_id?: string | null
          request?: string
          status?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_jobs_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_previews: {
        Row: {
          created_at: string
          expires_at: string
          files: Json
          id: string
          owner_id: string
          title: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          files: Json
          id?: string
          owner_id: string
          title: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          files?: Json
          id?: string
          owner_id?: string
          title?: string
          token?: string
        }
        Relationships: []
      }
      studio_worker_config: {
        Row: {
          app_url: string | null
          id: number
          token: string
        }
        Insert: {
          app_url?: string | null
          id?: number
          token?: string
        }
        Update: {
          app_url?: string | null
          id?: number
          token?: string
        }
        Relationships: []
      }
      supabase_connections: {
        Row: {
          access_token_ciphertext: string
          created_at: string
          expires_at: string | null
          id: string
          owner_id: string
          project_name: string | null
          project_ref: string | null
          refresh_token_ciphertext: string
          scope: string
          updated_at: string
        }
        Insert: {
          access_token_ciphertext: string
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id: string
          project_name?: string | null
          project_ref?: string | null
          refresh_token_ciphertext?: string
          scope?: string
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id?: string
          project_name?: string | null
          project_ref?: string | null
          refresh_token_ciphertext?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          credits: number
          id: string
          input_tokens: number
          latency_ms: number
          model: string
          output_tokens: number
          owner_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          input_tokens?: number
          latency_ms?: number
          model: string
          output_tokens?: number
          owner_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          input_tokens?: number
          latency_ms?: number
          model?: string
          output_tokens?: number
          owner_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      arena_leaderboard: {
        Args: never
        Returns: { battles: number; model: string; ties: number; wins: number }[]
      }
      admin_find_user: {
        Args: { _email: string }
        Returns: { balance: number; display_name: string; email: string; id: string }[]
      }
      admin_transfer_credits: {
        Args: { _admin: string; _amount: number; _key: string; _reason: string; _to: string }
        Returns: Json
      }
      claim_welcome_bonus: { Args: never; Returns: number }
      confirm_credits: {
        Args: { _real_amount: number; _reservation: string }
        Returns: boolean
      }
      get_pack_estimates: { Args: never; Returns: Json }
      get_shared_thread: { Args: { _token: string }; Returns: Json }
      get_wallet_balance: { Args: { _owner: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_video_access: { Args: { _user: string }; Returns: boolean }
      has_site_access: { Args: { _user: string }; Returns: boolean }
      hit_rate_limit: {
        Args: {
          _bucket: string
          _limit: number
          _user: string
          _window_seconds: number
        }
        Returns: boolean
      }
      media_purge_arm: { Args: never; Returns: undefined }
      refund_credits: {
        Args: { _amount: number; _label: string; _owner: string }
        Returns: boolean
      }
      registry_download: { Args: { _item: string }; Returns: string }
      registry_remix: { Args: { _item: string }; Returns: string }
      release_credits: { Args: { _reservation: string }; Returns: boolean }
      reserve_credits: {
        Args: { _amount: number; _label: string; _owner: string }
        Returns: boolean
      }
      reserve_credits_v2: {
        Args: { _amount: number; _label: string; _owner: string }
        Returns: string
      }
      settle_payment: { Args: { _payment: string }; Returns: boolean }
      studio_worker_arm: { Args: never; Returns: undefined }
      studio_worker_disarm: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
