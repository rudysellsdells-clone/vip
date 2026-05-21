export type NormalizedProspect = {
  id: string;
  prospectName: string;
  businessName: string;
  websiteUrl: string;
  industry: string;
  location: string;
  currentSituation: string;
  painPoint: string;
  opportunity: string;
  offerFocus: string;
  cta: string;
  raw: Record<string, unknown>;
};

function read(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
}

function joinName(row: Record<string, unknown>) {
  const direct = read(row, ["contact_name", "prospect_name", "name", "full_name"]);

  if (direct) return direct;

  const first = read(row, ["first_name"]);
  const last = read(row, ["last_name"]);

  return [first, last].filter(Boolean).join(" ").trim();
}

function joinLocation(row: Record<string, unknown>) {
  const direct = read(row, ["location", "market", "service_area"]);

  if (direct) return direct;

  const city = read(row, ["city"]);
  const state = read(row, ["state", "region"]);

  return [city, state].filter(Boolean).join(", ").trim();
}

export function normalizeProspect(row: Record<string, unknown>): NormalizedProspect {
  const id = read(row, ["id"]);
  const prospectName = joinName(row);
  const businessName = read(
    row,
    ["business_name", "company_name", "company", "organization", "account_name"],
    prospectName || "Prospect business"
  );

  const websiteUrl = read(row, ["website_url", "website", "url", "domain"]);
  const industry = read(row, ["industry", "category", "vertical"]);
  const location = joinLocation(row);

  const currentSituation = read(
    row,
    ["current_situation", "notes", "summary", "description"],
    `A strategic review opportunity for ${businessName}.`
  );

  const painPoint = read(
    row,
    ["pain_point", "challenge", "problem"],
    "The business may have an opportunity to improve visibility, authority, content, and follow-up."
  );

  const opportunity = read(
    row,
    ["opportunity", "growth_opportunity", "recommendation"],
    "Build a connected system for visibility, content, AI search presence, social proof, and sales follow-up."
  );

  const offerFocus = read(
    row,
    ["offer_focus", "service_interest", "interested_in"],
    "SEO, AIO, content, link building, social media, and marketing automation"
  );

  const cta = read(row, ["cta", "next_step"], "schedule a strategy call");

  return {
    id,
    prospectName,
    businessName,
    websiteUrl,
    industry,
    location,
    currentSituation,
    painPoint,
    opportunity,
    offerFocus,
    cta,
    raw: row,
  };
}
