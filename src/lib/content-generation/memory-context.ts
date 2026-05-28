type MemoryRow = Record<string, any>;

type SafeSelectResult = {
  source: string;
  rows: MemoryRow[];
  error?: string;
};

export type BusinessMemoryContext = {
  hasUsefulMemory: boolean;
  sourceCount: number;
  sources: string[];
  contextText: string;
  warnings: string[];
  raw: Record<string, MemoryRow[]>;
};

function compact(value: unknown, maxLength = 900) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function rowToContext(row: MemoryRow) {
  const preferredFields = [
    "name",
    "title",
    "label",
    "category",
    "type",
    "description",
    "content",
    "value",
    "notes",
    "tone",
    "voice",
    "rules",
    "summary",
    "business_name",
    "brand_name",
    "target_audience",
    "audience",
    "services",
    "service",
    "offer",
    "offers",
    "differentiator",
    "positioning",
    "cta",
    "call_to_action",
    "do_not_say",
    "metadata",
  ];

  const parts = preferredFields
    .map((field) => {
      const value = row[field];

      if (value === null || value === undefined || value === "") return "";

      if (typeof value === "object") {
        return `${field}: ${compact(JSON.stringify(value), 900)}`;
      }

      return `${field}: ${compact(value, 900)}`;
    })
    .filter(Boolean);

  if (parts.length) {
    return parts.join(" | ");
  }

  return compact(JSON.stringify(row), 900);
}

async function tryQuery({
  supabase,
  table,
  userId,
  limit = 30,
}: {
  supabase: any;
  table: string;
  userId: string;
  limit?: number;
}): Promise<SafeSelectResult> {
  try {
    /*
      Keep this intentionally simple.

      The earlier version used .order("updated_at"), which can fail if a table exists but does
      not have that exact column. For memory lookup, finding rows matters more than perfect order.
    */
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .limit(limit);

    if (error) {
      return {
        source: table,
        rows: [],
        error: error.message,
      };
    }

    return {
      source: table,
      rows: Array.isArray(data) ? data : [],
    };
  } catch (error) {
    return {
      source: table,
      rows: [],
      error: error instanceof Error ? error.message : "Unknown memory fetch error.",
    };
  }
}

export function fallbackCampaignMemoryContext({
  campaignTheme,
  businessContext,
  strategy,
}: {
  campaignTheme: string;
  businessContext: string;
  strategy: Record<string, string>;
}) {
  const lines = [
    campaignTheme ? `Campaign theme: ${campaignTheme}` : "",
    businessContext ? `Business context: ${businessContext}` : "",
    strategy.monthlyObjective ? `Monthly objective: ${strategy.monthlyObjective}` : "",
    strategy.targetAudience ? `Target audience: ${strategy.targetAudience}` : "",
    strategy.primaryOffer ? `Primary offer: ${strategy.primaryOffer}` : "",
    strategy.keyTopics ? `Key topics: ${strategy.keyTopics}` : "",
    strategy.differentiator ? `Differentiator: ${strategy.differentiator}` : "",
    strategy.callToAction ? `Preferred CTA: ${strategy.callToAction}` : "",
    strategy.proofPoints ? `Proof points / supporting context: ${strategy.proofPoints}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function buildBusinessMemoryContext({
  supabase,
  userId,
  campaignTheme = "",
  businessContext = "",
  strategy = {},
}: {
  supabase: any;
  userId: string;
  campaignTheme?: string;
  businessContext?: string;
  strategy?: Record<string, string>;
}): Promise<BusinessMemoryContext> {
  /*
    Defensive table discovery.

    VIP installs may not all use the same memory table names yet. Missing tables should not block
    generation. They should only create warnings for diagnostics.
  */
  const candidateTables = [
    "brand_voice",
    "brand_voices",
    "brand_voice_profiles",
    "brand_voice_settings",
    "knowledge_entries",
    "knowledge",
    "knowledge_items",
    "business_knowledge",
    "business_facts",
    "company_facts",
    "memory_entries",
    "saved_knowledge",
    "settings",
    "app_settings",
    "user_settings",
  ];

  const results = await Promise.all(
    candidateTables.map((table) =>
      tryQuery({
        supabase,
        table,
        userId,
        limit: table.includes("knowledge") || table.includes("memory") || table.includes("facts") ? 50 : 20,
      })
    )
  );

  const raw: Record<string, MemoryRow[]> = {};
  const warnings: string[] = [];
  const sections: string[] = [];

  for (const result of results) {
    raw[result.source] = result.rows;

    if (result.error && !/does not exist|schema cache|Could not find/i.test(result.error)) {
      warnings.push(`${result.source}: ${result.error}`);
    }

    if (!result.rows.length) continue;

    const section = [
      `## ${result.source}`,
      ...result.rows.map((row, index) => `${index + 1}. ${rowToContext(row)}`).filter(Boolean),
    ].join("\n");

    sections.push(section);
  }

  const campaignFallback = fallbackCampaignMemoryContext({
    campaignTheme,
    businessContext,
    strategy,
  });

  if (campaignFallback) {
    sections.push(
      [
        "## current_campaign_context",
        "Use this as campaign-specific guidance only. It may add angle/context, but saved business memory remains the source of truth when available.",
        campaignFallback,
      ].join("\n")
    );
  }

  const contextText = sections.join("\n\n").trim();
  const sourceCount = results.filter((result) => result.rows.length > 0).length;
  const hasSavedMemory = sourceCount >= 1;
  const hasFallbackContext = campaignFallback.length >= 80;

  return {
    hasUsefulMemory: hasSavedMemory || hasFallbackContext,
    sourceCount,
    sources: [
      ...results.filter((result) => result.rows.length > 0).map((result) => result.source),
      ...(campaignFallback ? ["current_campaign_context"] : []),
    ],
    contextText,
    warnings,
    raw,
  };
}

export function summarizeMemoryForPrompt(memory: BusinessMemoryContext) {
  if (!memory.contextText) {
    return [
      "No saved business memory context was found.",
      "Do not invent specific facts, services, proof points, locations, clients, results, guarantees, rankings, revenue, or case studies.",
      "Only write generic, safe content based on the campaign brief.",
    ].join("\n");
  }

  return [
    "Use the following context as private generation guidance.",
    "Saved Brand Voice / Knowledge / Business Facts are the source of truth when present.",
    "Current campaign context may guide the angle, but it must not be copied verbatim into the final content.",
    "Do not quote database labels or raw strategy notes directly unless they sound natural in the final content.",
    "If monthly campaign strategy conflicts with saved business facts, follow saved business facts.",
    "",
    memory.contextText,
  ].join("\n");
}
