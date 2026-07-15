export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "engaged_visit",
  "campaign_visit",
  "asset_view",
  "asset_download",
  "cta_click",
  "phone_click",
  "email_click",
  "form_start",
  "form_submit",
  "lead_created",
  "consultation_scheduled",
  "conversion_recorded",
  "purchase",
  "revenue_recorded",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsEventCategory =
  | "traffic"
  | "engagement"
  | "lead"
  | "conversion"
  | "revenue";

export type AnalyticsEventDefinition = {
  name: AnalyticsEventName;
  label: string;
  category: AnalyticsEventCategory;
  description: string;
  countsAsLead?: boolean;
  countsAsConversion?: boolean;
  acceptsValue?: boolean;
};

export const ANALYTICS_EVENT_DEFINITIONS: readonly AnalyticsEventDefinition[] = [
  {
    name: "page_view",
    label: "Page view",
    category: "traffic",
    description: "A tracked page was viewed.",
  },
  {
    name: "engaged_visit",
    label: "Engaged visit",
    category: "engagement",
    description: "A visitor met the configured engagement threshold.",
  },
  {
    name: "campaign_visit",
    label: "Campaign visit",
    category: "traffic",
    description: "A visit arrived through a Marketing VIP campaign identifier.",
  },
  {
    name: "asset_view",
    label: "Asset view",
    category: "engagement",
    description: "A Marketing VIP asset or linked destination was viewed.",
  },
  {
    name: "asset_download",
    label: "Asset download",
    category: "engagement",
    description: "A visitor downloaded a guide, document, or other tracked asset.",
  },
  {
    name: "cta_click",
    label: "CTA click",
    category: "engagement",
    description: "A visitor selected a primary campaign call to action.",
  },
  {
    name: "phone_click",
    label: "Phone click",
    category: "lead",
    description: "A visitor selected a tracked telephone link.",
    countsAsLead: true,
  },
  {
    name: "email_click",
    label: "Email click",
    category: "lead",
    description: "A visitor selected a tracked email link.",
    countsAsLead: true,
  },
  {
    name: "form_start",
    label: "Form start",
    category: "engagement",
    description: "A visitor began a tracked lead or conversion form.",
  },
  {
    name: "form_submit",
    label: "Form submission",
    category: "lead",
    description: "A visitor submitted a tracked form.",
    countsAsLead: true,
  },
  {
    name: "lead_created",
    label: "Lead created",
    category: "lead",
    description: "A lead was created in Marketing VIP or a connected system.",
    countsAsLead: true,
  },
  {
    name: "consultation_scheduled",
    label: "Consultation scheduled",
    category: "conversion",
    description: "A visitor scheduled a meeting, consultation, or appointment.",
    countsAsLead: true,
    countsAsConversion: true,
  },
  {
    name: "conversion_recorded",
    label: "Conversion recorded",
    category: "conversion",
    description: "A configured business conversion was recorded.",
    countsAsConversion: true,
    acceptsValue: true,
  },
  {
    name: "purchase",
    label: "Purchase",
    category: "revenue",
    description: "A purchase or paid transaction was completed.",
    countsAsConversion: true,
    acceptsValue: true,
  },
  {
    name: "revenue_recorded",
    label: "Revenue recorded",
    category: "revenue",
    description: "Revenue was associated with a campaign, asset, or conversion.",
    acceptsValue: true,
  },
] as const;

const ANALYTICS_EVENT_NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES);

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && ANALYTICS_EVENT_NAME_SET.has(value);
}

export function getAnalyticsEventDefinition(eventName: AnalyticsEventName) {
  return ANALYTICS_EVENT_DEFINITIONS.find((definition) => definition.name === eventName) ?? null;
}
