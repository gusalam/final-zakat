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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      detail_zakat: {
        Row: {
          harga_beras_per_liter: number | null
          id: string
          jenis_zakat: string
          jumlah_beras: number | null
          jumlah_jiwa: number | null
          jumlah_uang: number | null
          metode_pembayaran: string | null
          transaksi_id: string
        }
        Insert: {
          harga_beras_per_liter?: number | null
          id?: string
          jenis_zakat: string
          jumlah_beras?: number | null
          jumlah_jiwa?: number | null
          jumlah_uang?: number | null
          metode_pembayaran?: string | null
          transaksi_id: string
        }
        Update: {
          harga_beras_per_liter?: number | null
          id?: string
          jenis_zakat?: string
          jumlah_beras?: number | null
          jumlah_jiwa?: number | null
          jumlah_uang?: number | null
          metode_pembayaran?: string | null
          transaksi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detail_zakat_transaksi_id_fkey"
            columns: ["transaksi_id"]
            isOneToOne: false
            referencedRelation: "transaksi_zakat"
            referencedColumns: ["id"]
          },
        ]
      }
      distribusi: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          jenis_bantuan: string | null
          jumlah: number
          jumlah_beras: number | null
          mustahik_id: string
          sumber_zakat: string | null
          tanggal: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          jenis_bantuan?: string | null
          jumlah?: number
          jumlah_beras?: number | null
          mustahik_id: string
          sumber_zakat?: string | null
          tanggal?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          jenis_bantuan?: string | null
          jumlah?: number
          jumlah_beras?: number | null
          mustahik_id?: string
          sumber_zakat?: string | null
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribusi_mustahik_id_fkey"
            columns: ["mustahik_id"]
            isOneToOne: false
            referencedRelation: "mustahik"
            referencedColumns: ["id"]
          },
        ]
      }
      mustahik: {
        Row: {
          alamat: string | null
          created_at: string | null
          created_by: string | null
          id: string
          kategori: string | null
          nama: string
          rt_id: string | null
          status: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          kategori?: string | null
          nama: string
          rt_id?: string | null
          status?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          kategori?: string | null
          nama?: string
          rt_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mustahik_rt_id_fkey"
            columns: ["rt_id"]
            isOneToOne: false
            referencedRelation: "rt"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      rt: {
        Row: {
          created_at: string | null
          id: string
          nama_rt: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nama_rt: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nama_rt?: string
        }
        Relationships: []
      }
      transaksi_zakat: {
        Row: {
          alamat_muzakki: string | null
          created_at: string | null
          created_by: string | null
          id: string
          nama_muzakki: string
          nomor_kwitansi: number
          receipt_number: string | null
          rt_id: string | null
          status_muzakki: string | null
          tanggal: string
        }
        Insert: {
          alamat_muzakki?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nama_muzakki: string
          nomor_kwitansi?: number
          receipt_number?: string | null
          rt_id?: string | null
          status_muzakki?: string | null
          tanggal?: string
        }
        Update: {
          alamat_muzakki?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nama_muzakki?: string
          nomor_kwitansi?: number
          receipt_number?: string | null
          rt_id?: string | null
          status_muzakki?: string | null
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_zakat_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaksi_zakat_rt_id_fkey"
            columns: ["rt_id"]
            isOneToOne: false
            referencedRelation: "rt"
            referencedColumns: ["id"]
          },
        ]
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
      zakat: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          jenis_zakat: string
          jumlah_beras: number | null
          jumlah_jiwa: number
          jumlah_uang: number | null
          nama_muzakki: string
          nomor_kwitansi: number
          rt_id: string | null
          status_muzakki: string | null
          tanggal: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          jenis_zakat: string
          jumlah_beras?: number | null
          jumlah_jiwa?: number
          jumlah_uang?: number | null
          nama_muzakki: string
          nomor_kwitansi?: number
          rt_id?: string | null
          status_muzakki?: string | null
          tanggal?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          jenis_zakat?: string
          jumlah_beras?: number | null
          jumlah_jiwa?: number
          jumlah_uang?: number | null
          nama_muzakki?: string
          nomor_kwitansi?: number
          rt_id?: string | null
          status_muzakki?: string | null
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "zakat_rt_id_fkey"
            columns: ["rt_id"]
            isOneToOne: false
            referencedRelation: "rt"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_zakat_per_rt: { Args: never; Returns: Json }
      get_zakat_stats: { Args: never; Returns: Json }
      get_zakat_stats_filtered: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "panitia"
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
      app_role: ["admin", "panitia"],
    },
  },
} as const
