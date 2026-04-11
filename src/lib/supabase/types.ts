export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          code: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          role: "owner" | "manager" | "leader";
          store_id: string | null;
          line_user_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          role: "owner" | "manager" | "leader";
          store_id?: string | null;
          line_user_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          role?: "owner" | "manager" | "leader";
          store_id?: string | null;
          line_user_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      staff_members: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          position: "kitchen" | "floor" | "counter" | null;
          default_workstation_id: string | null;
          status: "active" | "archived";
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          position?: "kitchen" | "floor" | "counter" | null;
          default_workstation_id?: string | null;
          status?: "active" | "archived";
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          position?: "kitchen" | "floor" | "counter" | null;
          default_workstation_id?: string | null;
          status?: "active" | "archived";
          created_at?: string;
          archived_at?: string | null;
        };
      };
      workstations: {
        Row: {
          id: string;
          code: string;
          name: string;
          area: "kitchen" | "floor" | "counter";
          store_id: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          area: "kitchen" | "floor" | "counter";
          store_id?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          area?: "kitchen" | "floor" | "counter";
          store_id?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          field_type: "kitchen" | "floor" | "none";
        };
        Insert: {
          id?: string;
          name: string;
          sort_order: number;
          field_type?: "kitchen" | "floor" | "none";
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          field_type?: "kitchen" | "floor" | "none";
        };
      };
      inspection_items: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          sort_order: number;
          is_base: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          sort_order: number;
          is_base?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          sort_order?: number;
          is_base?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
      };
      store_extra_items: {
        Row: {
          store_id: string;
          item_id: string;
        };
        Insert: {
          store_id: string;
          item_id: string;
        };
        Update: {
          store_id?: string;
          item_id?: string;
        };
      };
      focus_items: {
        Row: {
          id: string;
          item_id: string;
          type: "critical" | "monthly_attention" | "complaint_watch";
          month: string | null;
          store_id: string | null;
          source: "manual" | "complaint_sync";
          set_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          type: "critical" | "monthly_attention" | "complaint_watch";
          month?: string | null;
          store_id?: string | null;
          source?: "manual" | "complaint_sync";
          set_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          type?: "critical" | "monthly_attention" | "complaint_watch";
          month?: string | null;
          store_id?: string | null;
          source?: "manual" | "complaint_sync";
          set_by?: string | null;
          created_at?: string;
        };
      };
      inspections: {
        Row: {
          id: string;
          store_id: string;
          inspector_id: string;
          date: string;
          time_slot: string;
          busyness_level: "low" | "medium" | "high";
          total_score: string;
          created_at: string;
          updated_at: string;
          is_editable: boolean;
        };
        Insert: {
          id?: string;
          store_id: string;
          inspector_id: string;
          date: string;
          time_slot: string;
          busyness_level?: "low" | "medium" | "high";
          total_score?: string;
          created_at?: string;
          updated_at?: string;
          is_editable?: boolean;
        };
        Update: {
          id?: string;
          store_id?: string;
          inspector_id?: string;
          date?: string;
          time_slot?: string;
          busyness_level?: "low" | "medium" | "high";
          total_score?: string;
          created_at?: string;
          updated_at?: string;
          is_editable?: boolean;
        };
      };
      inspection_staff: {
        Row: {
          id: string;
          inspection_id: string;
          staff_id: string;
          role_in_shift: "kitchen" | "floor" | "counter";
          workstation_id: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          staff_id: string;
          role_in_shift: "kitchen" | "floor" | "counter";
          workstation_id: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          staff_id?: string;
          role_in_shift?: "kitchen" | "floor" | "counter";
          workstation_id?: string;
        };
      };
      inspection_scores: {
        Row: {
          id: string;
          inspection_id: string;
          item_id: string;
          score: 1 | 2 | 3;
          note: string | null;
          is_focus_item: boolean;
          applied_tag_types: Array<"critical" | "monthly_attention" | "complaint_watch">;
          has_prev_issue: boolean;
          consecutive_weeks: number;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          item_id: string;
          score: 1 | 2 | 3;
          note?: string | null;
          is_focus_item?: boolean;
          applied_tag_types?: Array<"critical" | "monthly_attention" | "complaint_watch">;
          has_prev_issue?: boolean;
          consecutive_weeks?: number;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          item_id?: string;
          score?: 1 | 2 | 3;
          note?: string | null;
          is_focus_item?: boolean;
          applied_tag_types?: Array<"critical" | "monthly_attention" | "complaint_watch">;
          has_prev_issue?: boolean;
          consecutive_weeks?: number;
        };
      };
      inspection_menu_items: {
        Row: {
          id: string;
          inspection_id: string;
          type: "dine_in" | "takeout";
          dish_name: string | null;
          portion_weight: string | null;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          type: "dine_in" | "takeout";
          dish_name?: string | null;
          portion_weight?: string | null;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          type?: "dine_in" | "takeout";
          dish_name?: string | null;
          portion_weight?: string | null;
        };
      };
      legacy_notes: {
        Row: {
          id: string;
          inspection_id: string;
          content: string;
          score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          content: string;
          score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          content?: string;
          score?: number | null;
          created_at?: string;
        };
      };
      improvement_tasks: {
        Row: {
          id: string;
          score_id: string;
          store_id: string;
          item_id: string;
          status: "pending" | "resolved" | "verified" | "superseded";
          resolved_at: string | null;
          resolved_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          score_id: string;
          store_id: string;
          item_id: string;
          status?: "pending" | "resolved" | "verified" | "superseded";
          resolved_at?: string | null;
          resolved_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          score_id?: string;
          store_id?: string;
          item_id?: string;
          status?: "pending" | "resolved" | "verified" | "superseded";
          resolved_at?: string | null;
          resolved_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
      };
      inspection_photos: {
        Row: {
          id: string;
          score_id: string;
          photo_url: string;
          is_standard: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          score_id: string;
          photo_url: string;
          is_standard?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          score_id?: string;
          photo_url?: string;
          is_standard?: boolean;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          details?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_profile: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string;
          role: "owner" | "manager" | "leader";
          store_id: string | null;
          is_active: boolean;
        }[];
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: "owner" | "manager" | "leader";
      };
      current_user_store_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
    };
    Enums: {
      user_role: "owner" | "manager" | "leader";
      staff_status: "active" | "archived";
      staff_position: "kitchen" | "floor" | "counter";
      field_type: "kitchen" | "floor" | "none";
      focus_type: "critical" | "monthly_attention" | "complaint_watch";
      focus_source: "manual" | "complaint_sync";
      busyness_level: "low" | "medium" | "high";
      menu_item_type: "dine_in" | "takeout";
      improvement_status: "pending" | "resolved" | "verified" | "superseded";
    };
    CompositeTypes: Record<string, never>;
  };
};
