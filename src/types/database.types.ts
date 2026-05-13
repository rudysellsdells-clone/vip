export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          id: string;
          email: string | null;
          full_name: string | null;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email?: string | null;
          full_name?: string | null;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;

      digital_clone_profiles: TableDefinition<
        {
          id: string;
          user_id: string;
          name: string;
          purpose: string;
          voice_summary: string | null;
          business_summary: string | null;
          audience_summary: string | null;
          offer_summary: string | null;
          sales_outcome_summary: string | null;
          approval_rules: Json;
          forbidden_actions: Json;
          preferred_style: Json;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          name?: string;
          purpose: string;
          voice_summary?: string | null;
          business_summary?: string | null;
          audience_summary?: string | null;
          offer_summary?: string | null;
          sales_outcome_summary?: string | null;
          approval_rules?: Json;
          forbidden_actions?: Json;
          preferred_style?: Json;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;

      service_lines: TableDefinition<
        {
          id: string;
          user_id: string;
          name: string;
          short_name: string | null;
          description: string | null;
          primary_outcome: string | null;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          name: string;
          short_name?: string | null;
          description?: string | null;
          primary_outcome?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;

      buyer_segments: TableDefinition<
        {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          common_pains: string[] | null;
          desired_outcomes: string[] | null;
          objections: string[] | null;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          common_pains?: string[] | null;
          desired_outcomes?: string[] | null;
          objections?: string[] | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;

      offers: TableDefinition<
        {
          id: string;
          user_id: string;
          service_line_id: string | null;
          name: string;
          description: string | null;
          target_buyer_segments: string[] | null;
          offer_type: string;
          primary_cta: string | null;
          outcome: string | null;
          price_notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          service_line_id?: string | null;
          name: string;
          description?: string | null;
          target_buyer_segments?: string[] | null;
          offer_type?: string;
          primary_cta?: string | null;
          outcome?: string | null;
          price_notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;

      brand_rules: TableDefinition<
        {
          id: string;
          user_id: string;
          category: string;
          rule_text: string;
          priority: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          category: string;
          rule_text: string;
          priority?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;

      content_examples: TableDefinition<
        {
          id: string;
          user_id: string;
          title: string;
          source: string | null;
          content: string;
          content_type: string;
          tags: string[] | null;
          approved: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          title: string;
          source?: string | null;
          content: string;
          content_type: string;
          tags?: string[] | null;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;

      knowledge_sources: TableDefinition<
        {
          id: string;
          user_id: string;
          title: string;
          source_type: string;
          source_url: string | null;
          content: string;
          summary: string | null;
          tags: string[] | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          title: string;
          source_type: string;
          source_url?: string | null;
          content: string;
          summary?: string | null;
          tags?: string[] | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;

      campaigns: TableDefinition<
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
          platforms: string[] | null;
          tone: string | null;
          cta: string | null;
          notes: string | null;
          strategy: Json;
          status: string;
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
          platforms?: string[] | null;
          tone?: string | null;
          cta?: string | null;
          notes?: string | null;
          strategy?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;

      generated_assets: TableDefinition<
        {
          id: string;
          user_id: string;
          campaign_id: string | null;
          asset_type: string;
          title: string | null;
          content: string;
          metadata: Json;
          status: string;
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
          status?: string;
          version?: number;
          parent_asset_id?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;

      approvals: TableDefinition<
        {
          id: string;
          user_id: string;
          asset_id: string;
          status: string;
          notes: string | null;
          approved_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          asset_id: string;
          status: string;
          notes?: string | null;
          approved_at?: string | null;
          created_at?: string;
        }
      >;

      prospects: TableDefinition<
        {
          id: string;
          user_id: string;
          company_name: string | null;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          industry: string | null;
          buyer_segment: string | null;
          source: string | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          company_name?: string | null;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          industry?: string | null;
          buyer_segment?: string | null;
          source?: string | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;

      opportunities: TableDefinition<
        {
          id: string;
          user_id: string;
          prospect_id: string | null;
          name: string;
          service_line_id: string | null;
          offer_id: string | null;
          opportunity_type: string;
          estimated_value: number | null;
          stage: string;
          next_step: string | null;
          close_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          prospect_id?: string | null;
          name: string;
          service_line_id?: string | null;
          offer_id?: string | null;
          opportunity_type?: string;
          estimated_value?: number | null;
          stage?: string;
          next_step?: string | null;
          close_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;

      prompt_templates: TableDefinition<
        {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          template: string;
          input_schema: Json;
          output_schema: Json;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          template: string;
          input_schema?: Json;
          output_schema?: Json;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;

      tool_runs: TableDefinition<
        {
          id: string;
          user_id: string;
          provider: string;
          action_name: string;
          status: string;
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
          provider: string;
          action_name: string;
          status?: string;
          input?: Json;
          output?: Json;
          error?: string | null;
          requires_approval?: boolean;
          approved_by_user?: boolean;
          created_at?: string;
          completed_at?: string | null;
        }
      >;

      galaxyai_workflows: TableDefinition<
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
        }
      >;

      galaxyai_runs: TableDefinition<
        {
          id: string;
          user_id: string;
          campaign_id: string | null;
          asset_id: string | null;
          galaxy_run_id: string | null;
          galaxy_workflow_id: string | null;
          status: string;
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
          status?: string;
          input?: Json;
          output?: Json;
          error?: string | null;
          webhook_received?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;

      zapier_action_policies: TableDefinition<
        {
          id: string;
          user_id: string;
          app_name: string;
          action_name: string;
          risk_level: string;
          approval_required: boolean;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          app_name: string;
          action_name: string;
          risk_level?: string;
          approval_required?: boolean;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;

      activity_log: TableDefinition<
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
