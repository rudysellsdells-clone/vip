export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; full_name: string | null; timezone: string | null; created_at: string; updated_at: string };
        Insert: { id: string; email?: string | null; full_name?: string | null; timezone?: string | null; created_at?: string; updated_at?: string };
        Update: { email?: string | null; full_name?: string | null; timezone?: string | null; updated_at?: string };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          service_line_id: string | null;
          offer_id: string | null;
          name: string;
          idea: string;
          buyer_segment: string | null;
          audience: string | null;
          goal: string | null;
          platforms: string[];
          tone: string | null;
          cta: string | null;
          notes: string | null;
          strategy: Json;
          status: "draft" | "asset_pack_generated" | "in_review" | "approved" | "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_line_id?: string | null;
          offer_id?: string | null;
          name: string;
          idea: string;
          buyer_segment?: string | null;
          audience?: string | null;
          goal?: string | null;
          platforms?: string[];
          tone?: string | null;
          cta?: string | null;
          notes?: string | null;
          strategy?: Json;
          status?: "draft" | "asset_pack_generated" | "in_review" | "approved" | "active" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          service_line_id?: string | null;
          offer_id?: string | null;
          name?: string;
          idea?: string;
          buyer_segment?: string | null;
          audience?: string | null;
          goal?: string | null;
          platforms?: string[];
          tone?: string | null;
          cta?: string | null;
          notes?: string | null;
          strategy?: Json;
          status?: "draft" | "asset_pack_generated" | "in_review" | "approved" | "active" | "archived";
          updated_at?: string;
        };
        Relationships: [];
      };
      generated_assets: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string | null;
          asset_type: string;
          title: string | null;
          content: string;
          metadata: Json;
          status: "draft" | "needs_review" | "approved" | "rejected" | "revision_requested" | "published" | "sent" | "archived";
          version: number;
          parent_asset_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id?: string | null;
          asset_type: string;
          title?: string | null;
          content: string;
          metadata?: Json;
          status?: "draft" | "needs_review" | "approved" | "rejected" | "revision_requested" | "published" | "sent" | "archived";
          version?: number;
          parent_asset_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          content?: string;
          metadata?: Json;
          status?: "draft" | "needs_review" | "approved" | "rejected" | "revision_requested" | "published" | "sent" | "archived";
          version?: number;
          parent_asset_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      approvals: {
        Row: { id: string; user_id: string; asset_id: string; status: "pending" | "approved" | "rejected" | "revision_requested"; notes: string | null; approved_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; asset_id: string; status: "pending" | "approved" | "rejected" | "revision_requested"; notes?: string | null; approved_at?: string | null; created_at?: string };
        Update: { status?: "pending" | "approved" | "rejected" | "revision_requested"; notes?: string | null; approved_at?: string | null };
        Relationships: [];
      };
      activity_log: {
        Row: { id: string; user_id: string; activity_type: string; title: string; description: string | null; metadata: Json; created_at: string };
        Insert: { id?: string; user_id: string; activity_type: string; title: string; description?: string | null; metadata?: Json; created_at?: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
