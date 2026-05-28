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
    "services",
    "differentiator",
    "cta",
    "do_not_say",
  ];

  const parts = preferredFields
    .map((field) => {
      const value = row[field];

      if (value === null || value === undefined || value === "") return "";

      if (typeof value === "object") {
        return `${field}: ${compact(JSON.stringify(value), 700)}`;
      }

      return `${field}: ${compact(value, 700)}`;
    })
    .filter(Boolean);

  if (parts.length) {
    return parts.join(" | ");
  }

  return compact(JSON.stringify(row), 900);
}

async function safeSelect({
  supabase,
  source,
  query,
}: {
  supabase: any;
  source: string;
  query: any;
}): Promise<SafeSelectResult> {
  try {
    const { data, error } = await query;

    if (error) {
      return {
        source,
        rows: [],
        error: error.message,
      };
    }

    return {
      source,
      rows: Array.isArray(data) ? data : [],
    };
  } catch (error) {
    return {
      source,
      rows: [],
      error: error instanceof Error ? error.message : "Unknown memory fetch error.",
    };
  }
}

export async function buildBusinessMemoryContext({
  supabase,
  userId,
}: {
  supabase: any;
  userId: string;
}): Promise<BusinessMemoryContext> {
  /*
    Keep this intentionally defensive.

    Different VIP installs may have slightly different table names as the product matures.
    Missing tables should not crash generation. They should simply produce warnings.
  */
  const results = await Promise.all([
    safeSelect({
      supabase,
      source: "brand_voice",
      query: supabase
        .from("brand_voice")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(10),
    }),
    safeSelect({
      supabase,
      source: "brand_voice_profiles",
      query: supabase
        .from("brand_voice_profiles")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(10),
    }),
    safeSelect({
      supabase,
      source: "knowledge_entries",
      query: supabase
        .from("knowledge_entries")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(40),
    }),
    safeSelect({
      supabase,
      source: "knowledge",
      query: supabase
        .from("knowledge")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(40),
    }),
    safeSelect({
      supabase,
      source: "business_knowledge",
      query: supabase
        .from("business_knowledge")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(40),
    }),
    safeSelect({
      supabase,
      source: "settings",
      query: supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .limit(10),
    }),
    safeSelect({
      supabase,
      source: "app_settings",
      query: supabase
        .from("app_settings")
        .select("*")
        .eq("user_id", userId)
        .limit(10),
    }),
  ]);

  const raw: Record<string, MemoryRow[]> = {};
  const warnings: string[] = [];
  const sections: string[] = [];

  for (const result of results) {
    raw[result.source] = result.rows;

    if (result.error) {
      warnings.push(`${result.source}: ${result.error}`);
    }

    if (!result.rows.length) continue;

    const section = [
      `## ${result.source}`,
      ...result.rows.map((row, index) => `${index + 1}. ${rowToContext(row)}`).filter(Boolean),
    ].join("\n");

    sections.push(section);
  }

  const contextText = sections.join("\n\n").trim();
  const sourceCount = results.filter((result) => result.rows.length > 0).length;
  const hasUsefulMemory = contextText.length >= 250 || sourceCount >= 2;

  return {
    hasUsefulMemory,
    sourceCount,
    sources: results.filter((result) => result.rows.length > 0).map((result) => result.source),
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
    "Use the following saved business memory as the source of truth.",
    "This context is private. Do not quote database labels or raw memory notes directly unless they are natural in the final content.",
    "If monthly campaign strategy conflicts with saved business facts, follow saved business facts.",
    "",
    memory.contextText,
  ].join("\n");
}
