export type MarketingAssetType =
  | "email"
  | "linkedin_post"
  | "facebook_post"
  | "youtube_title"
  | "youtube_description"
  | "video_script"
  | "galaxyai_prompt";

export type CampaignStrategy = {
  summary: string;
  audienceAngle: string;
  coreMessage: string;
  positioning: string;
  cta: string;
};

export type MarketingAsset = {
  type: MarketingAssetType;
  title: string;
  content: string;
  notes: string;
};

export type MarketingAssetPack = {
  campaignStrategy: CampaignStrategy;
  assets: MarketingAsset[];
  approvalChecklist: string[];
};

export type MarketingAssetPackPromptInput = {
  campaign: {
    name: string;
    idea: string;
    buyer_segment: string | null;
    audience: string | null;
    goal: string | null;
    platforms: string[];
    tone: string | null;
    cta: string | null;
    notes: string | null;
  };
  digitalCloneProfile?: {
    name?: string | null;
    purpose?: string | null;
    voice_summary?: string | null;
    business_summary?: string | null;
    audience_summary?: string | null;
    offer_summary?: string | null;
    sales_outcome_summary?: string | null;
  } | null;
  serviceLines?: Array<{
    name?: string | null;
    short_name?: string | null;
    description?: string | null;
    primary_outcome?: string | null;
  }>;
  buyerSegments?: Array<{
    name?: string | null;
    description?: string | null;
    common_pains?: string[] | null;
    desired_outcomes?: string[] | null;
    objections?: string[] | null;
  }>;
  offers?: Array<{
    name?: string | null;
    description?: string | null;
    primary_cta?: string | null;
    outcome?: string | null;
    offer_type?: string | null;
  }>;
  brandRules?: Array<{
    category?: string | null;
    rule_text?: string | null;
  }>;
  knowledgeSources?: Array<{
    title?: string | null;
    summary?: string | null;
    content?: string | null;
    tags?: string[] | null;
  }>;
};
