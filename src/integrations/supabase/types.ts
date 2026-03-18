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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          max_price: number
          min_price: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          max_price?: number
          min_price?: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          max_price?: number
          min_price?: number
          name?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          created_at: string
          day_number: number
          description: string
          estimated_time: string | null
          id: string
          job_account_id: string
          points: number | null
          title: string
        }
        Insert: {
          created_at?: string
          day_number: number
          description: string
          estimated_time?: string | null
          id?: string
          job_account_id: string
          points?: number | null
          title: string
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string
          estimated_time?: string | null
          id?: string
          job_account_id?: string
          points?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_job_account_id_fkey"
            columns: ["job_account_id"]
            isOneToOne: false
            referencedRelation: "job_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_accounts: {
        Row: {
          category_id: string | null
          company: string | null
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_available: boolean
          monthly_earnings: string | null
          price: number
          skills_required: string[] | null
          sold_count: number | null
          title: string
          total_stock: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company?: string | null
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          monthly_earnings?: string | null
          price: number
          skills_required?: string[] | null
          sold_count?: number | null
          title: string
          total_stock?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          monthly_earnings?: string | null
          price?: number
          skills_required?: string[] | null
          sold_count?: number | null
          title?: string
          total_stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          job_account_id: string | null
          mpesa_checkout_request_id: string | null
          mpesa_receipt_number: string | null
          payment_status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          job_account_id?: string | null
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          job_account_id?: string | null
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_job_account_id_fkey"
            columns: ["job_account_id"]
            isOneToOne: false
            referencedRelation: "job_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          email: string
          id: string
          metadata: Json | null
          order_id: string | null
          payment_method: string | null
          paystack_transaction_id: string | null
          reference: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          email: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_method?: string | null
          paystack_transaction_id?: string | null
          reference: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_method?: string | null
          paystack_transaction_id?: string | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          county: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          id_number: string | null
          is_registration_complete: boolean | null
          phone_number: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          is_registration_complete?: boolean | null
          phone_number?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          is_registration_complete?: boolean | null
          phone_number?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          avatar_url: string | null
          comment: string
          created_at: string
          earnings_amount: string | null
          id: string
          is_featured: boolean | null
          location: string | null
          rating: number
          reviewer_name: string
        }
        Insert: {
          avatar_url?: string | null
          comment: string
          created_at?: string
          earnings_amount?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          rating: number
          reviewer_name: string
        }
        Update: {
          avatar_url?: string | null
          comment?: string
          created_at?: string
          earnings_amount?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          rating?: number
          reviewer_name?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_from_admin: boolean
          is_read: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_from_admin?: boolean
          is_read?: boolean
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_from_admin?: boolean
          is_read?: boolean
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_support_tickets: {
        Row: {
          admin_message_id: number | null
          admin_reply: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          telegram_chat_id: number
          telegram_first_name: string | null
          telegram_user_id: number
          telegram_username: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_message_id?: number | null
          admin_reply?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          telegram_chat_id: number
          telegram_first_name?: string | null
          telegram_user_id: number
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_message_id?: number | null
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          telegram_chat_id?: number
          telegram_first_name?: string | null
          telegram_user_id?: number
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_payment_methods: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          branch_code: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          method_type: string
          mpesa_name: string | null
          mpesa_phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_code?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          method_type: string
          mpesa_name?: string | null
          mpesa_phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_code?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          method_type?: string
          mpesa_name?: string | null
          mpesa_phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          created_at: string
          end_date: string
          id: string
          job_account_id: string | null
          order_id: string | null
          purchase_date: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string
          id?: string
          job_account_id?: string | null
          order_id?: string | null
          purchase_date?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          job_account_id?: string | null
          order_id?: string | null
          purchase_date?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_job_account_id_fkey"
            columns: ["job_account_id"]
            isOneToOne: false
            referencedRelation: "job_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_task_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          purchase_id: string
          status: string
          submission_notes: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          purchase_id: string
          status?: string
          submission_notes?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          purchase_id?: string
          status?: string
          submission_notes?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_progress_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "user_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_orders_by_phone: {
        Args: { phone_input: string }
        Returns: {
          amount: number
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          job_account_id: string | null
          mpesa_checkout_request_id: string | null
          mpesa_receipt_number: string | null
          payment_status: string
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
