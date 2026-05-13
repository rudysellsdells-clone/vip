export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      campaigns: TableDef<
        {
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
        },
        {
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
        },
        {
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
        }
      >;
      generated_assets: TableDef<
        {
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
        },
        {
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
        },
        {
          title?: string | null;
          content?: string;
          metadata?: Json;
          status?: "draft" | "needs_review" | "approved" | "rejected" | "revision_requested" | "published" | "sent" | "archived";
          version?: number;
          parent_asset_id?: string | null;
          updated_at?: string;
        }
      >;
      approvals: TableDef<
        {
          id: string;
          user_id: string;
          asset_id: string;
          status: "pending" | "approved" | "rejected" | "revision_requested";
          notes: string | null;
          approved_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          asset_id: string;
          status: "pending" | "approved" | "rejected" | "revision_requested";
          notes?: string | null;
          approved_at?: string | null;
          created_at?: string;
        },
        {
          status?: "pending" | "approved" | "rejected" | "revision_requested";
          notes?: string | null;
          approved_at?: string | null;
        }
      >;
      activity_log: TableDef<
        {
          id: string;
          user_id: string;
          activity_type: string;
          title: string;
          description: string | null;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          activity_type: string;
          title: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        },
        never
      >;
      tool_runs: TableDef<
        {
          id: string;
          user_id: string;
          provider: "internal_ai" | "galaxyai" | "zapier_mcp" | "manual";
          action_name: string;
          status: "planned" | "waiting_approval" | "running" | "completed" | "failed" | "canceled";
          input: Json;
          output: Json;
          error: string | null;
          requires_approval: boolean;
          approved_by_user: boolean;
          created_at: string;
          completed_at: string | null;
        },
        {
          id?: string;
          user_id: string;
          provider: "internal_ai" | "galaxyai" | "zapier_mcp" | "manual";
          action_name: string;
          status?: "planned" | "waiting_approval" | "running" | "completed" | "failed" | "canceled";
          input?: Json;
          output?: Json;
          error?: string | null;
          requires_approval?: boolean;
          approved_by_user?: boolean;
          created_at?: string;
          completed_at?: string | null;
        },
        {
          status?: "planned" | "waiting_approval" | "running" | "completed" | "failed" | "canceled";
          output?: Json;
          error?: string | null;
          completed_at?: string | null;
        }
      >;
      galaxyai_workflows: TableDef<
        {
          id: string;
          user_id: string;
          galaxy_workflow_id: string;
          name: string;
          description: string | null;
          metadata: Json;
          active: boolean;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          galaxy_workflow_id: string;
          name: string;
          description?: string | null;
          metadata?: Json;
          active?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          name?: string;
          description?: string | null;
          metadata?: Json;
          active?: boolean;
          last_synced_at?: string | null;
          updated_at?: string;
        }
      >;
      galaxyai_runs: TableDef<
        {
          id: string;
          user_id: string;
          campaign_id: string | null;
          asset_id: string | null;
          galaxy_run_id: string | null;
          galaxy_workflow_id: string | null;
          status: "queued" | "running" | "completed" | "failed" | "canceled";
          input: Json;
          output: Json;
          error: string | null;
          webhook_received: boolean;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          campaign_id?: string | null;
          asset_id?: string | null;
          galaxy_run_id?: string | null;
          galaxy_workflow_id?: string | null;
          status?: "queued" | "running" | "completed" | "failed" | "canceled";
          input?: Json;
          output?: Json;
          error?: string | null;
          webhook_received?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          status?: "queued" | "running" | "completed" | "failed" | "canceled";
          output?: Json;
          error?: string | null;
          webhook_received?: boolean;
          completed_at?: string | null;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
