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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      autopay_settings: {
        Row: {
          additional_requirements: string | null
          card_last_four: string | null
          card_name: string | null
          created_at: string
          customer_id: string
          enabled: boolean
          frequency: string
          id: string
          job_type: string | null
          lawn_size: string | null
          location: string | null
          location_name: string | null
          next_scheduled_date: string | null
          next_scheduled_date_2: string | null
          parish: string | null
          recurring_day: number
          recurring_day_2: number | null
          updated_at: string
        }
        Insert: {
          additional_requirements?: string | null
          card_last_four?: string | null
          card_name?: string | null
          created_at?: string
          customer_id: string
          enabled?: boolean
          frequency?: string
          id?: string
          job_type?: string | null
          lawn_size?: string | null
          location?: string | null
          location_name?: string | null
          next_scheduled_date?: string | null
          next_scheduled_date_2?: string | null
          parish?: string | null
          recurring_day: number
          recurring_day_2?: number | null
          updated_at?: string
        }
        Update: {
          additional_requirements?: string | null
          card_last_four?: string | null
          card_name?: string | null
          created_at?: string
          customer_id?: string
          enabled?: boolean
          frequency?: string
          id?: string
          job_type?: string | null
          lawn_size?: string | null
          location?: string | null
          location_name?: string | null
          next_scheduled_date?: string | null
          next_scheduled_date_2?: string | null
          parish?: string | null
          recurring_day?: number
          recurring_day_2?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_preferences: {
        Row: {
          additional_requirements: string | null
          created_at: string
          customer_id: string
          id: string
          job_type: string | null
          lawn_size: string | null
          location: string | null
          parish: string | null
          updated_at: string
        }
        Insert: {
          additional_requirements?: string | null
          created_at?: string
          customer_id: string
          id?: string
          job_type?: string | null
          lawn_size?: string | null
          location?: string | null
          parish?: string | null
          updated_at?: string
        }
        Update: {
          additional_requirements?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          job_type?: string | null
          lawn_size?: string | null
          location?: string | null
          parish?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dispute_messages: {
        Row: {
          created_at: string
          dispute_id: string
          id: string
          message: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          id?: string
          message: string
          sender_id: string
          sender_type: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "job_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_photos: {
        Row: {
          created_at: string
          dispute_id: string
          id: string
          photo_url: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          id?: string
          photo_url: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          id?: string
          photo_url?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_photos_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "job_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_response_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          response_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          response_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          response_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_response_photos_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "dispute_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_responses: {
        Row: {
          created_at: string
          dispute_id: string
          id: string
          provider_id: string
          response_text: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          id?: string
          provider_id: string
          response_text: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          id?: string
          provider_id?: string
          response_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_responses_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "job_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          invoice_number: string
          job_id: string
          job_location: string
          job_title: string
          lawn_size: string | null
          parish: string
          payment_date: string
          payment_reference: string
          pdf_url: string | null
          platform_fee: number
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          invoice_number: string
          job_id: string
          job_location: string
          job_title: string
          lawn_size?: string | null
          parish: string
          payment_date: string
          payment_reference: string
          pdf_url?: string | null
          platform_fee: number
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          invoice_number?: string
          job_id?: string
          job_location?: string
          job_title?: string
          lawn_size?: string | null
          parish?: string
          payment_date?: string
          payment_reference?: string
          pdf_url?: string | null
          platform_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_completion_photos: {
        Row: {
          created_at: string
          id: string
          job_id: string
          photo_type: string
          photo_url: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          photo_type?: string
          photo_url: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          photo_type?: string
          photo_url?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_completion_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_disputes: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          job_id: string
          reason: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          reason: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_disputes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          photo_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          photo_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_proposals: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          message: string | null
          proposed_price: number
          provider_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          message?: string | null
          proposed_price: number
          provider_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          message?: string | null
          proposed_price?: number
          provider_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_proposals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requests: {
        Row: {
          accepted_provider_id: string | null
          additional_requirements: string | null
          base_price: number
          completed_at: string | null
          created_at: string | null
          customer_id: string
          customer_offer: number | null
          description: string | null
          final_price: number | null
          id: string
          is_late_completion: boolean | null
          lawn_size: string | null
          location: string
          parish: string
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_reference: string | null
          payment_status: string | null
          platform_fee: number | null
          preferred_date: string | null
          preferred_time: string | null
          provider_completed_at: string | null
          provider_payout: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          accepted_provider_id?: string | null
          additional_requirements?: string | null
          base_price?: number
          completed_at?: string | null
          created_at?: string | null
          customer_id: string
          customer_offer?: number | null
          description?: string | null
          final_price?: number | null
          id?: string
          is_late_completion?: boolean | null
          lawn_size?: string | null
          location: string
          parish?: string
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_completed_at?: string | null
          provider_payout?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          accepted_provider_id?: string | null
          additional_requirements?: string | null
          base_price?: number
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string
          customer_offer?: number | null
          description?: string | null
          final_price?: number | null
          id?: string
          is_late_completion?: boolean | null
          lawn_size?: string | null
          location?: string
          parish?: string
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          preferred_date?: string | null
          preferred_time?: string | null
          provider_completed_at?: string | null
          provider_payout?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          job_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          job_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          updated_at: string | null
          user_role: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_role?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_role?: string
        }
        Relationships: []
      }
      provider_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          job_ids: string[]
          jobs_count: number
          payout_date: string
          provider_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          job_ids?: string[]
          jobs_count?: number
          payout_date?: string
          provider_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          job_ids?: string[]
          jobs_count?: number
          payout_date?: string
          provider_id?: string
        }
        Relationships: []
      }
      provider_verifications: {
        Row: {
          created_at: string
          document_back_url: string | null
          document_type: Database["public"]["Enums"]["id_document_type"]
          document_url: string
          id: string
          provider_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_back_url?: string | null
          document_type: Database["public"]["Enums"]["id_document_type"]
          document_url: string
          id?: string
          provider_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_back_url?: string | null
          document_type?: Database["public"]["Enums"]["id_document_type"]
          document_url?: string
          id?: string
          provider_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      proxy_sessions: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          job_id: string
          provider_id: string
          status: string
          twilio_proxy_number: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string
          id?: string
          job_id: string
          provider_id: string
          status?: string
          twilio_proxy_number: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          job_id?: string
          provider_id?: string
          status?: string
          twilio_proxy_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "proxy_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_id: string
          id: string
          job_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: string
          consent_version: string
          consented_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          consent_version: string
          consented_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consent_version?: string
          consented_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      provider_public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          user_role: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          user_role?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_profile_safe: {
        Args: { target_user_id: string }
        Returns: {
          address: string
          avatar_url: string
          bio: string
          company_name: string
          first_name: string
          id: string
          last_name: string
          phone_number: string
          user_role: string
        }[]
      }
      get_provider_completed_jobs_count: {
        Args: { provider_id: string }
        Returns: number
      }
      get_provider_disputes_this_month: {
        Args: { provider_id: string }
        Returns: number
      }
      get_provider_job_listings: {
        Args: never
        Returns: {
          additional_requirements: string
          base_price: number
          created_at: string
          customer_offer: number
          description: string
          final_price: number
          id: string
          lawn_size: string
          location: string
          parish: string
          preferred_date: string
          preferred_time: string
          provider_payout: number
          status: string
          title: string
        }[]
      }
      get_provider_late_jobs_this_month: {
        Args: { provider_id: string }
        Returns: number
      }
      get_public_provider_profile: {
        Args: { provider_id: string }
        Returns: {
          avatar_url: string
          bio: string
          company_name: string
          first_name: string
          full_name: string
          id: string
          user_role: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_provider: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      id_document_type: "drivers_license" | "passport" | "national_id"
      verification_status: "pending" | "approved" | "rejected"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
      id_document_type: ["drivers_license", "passport", "national_id"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
