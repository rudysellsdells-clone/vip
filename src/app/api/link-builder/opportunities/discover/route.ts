import { NextResponse } from "next/server";
import { braveResultToDirectoryOpportunity } from "@/lib/link-builder/directory-discovery";
import { searchBraveWeb } from "@/lib/link-builder/brave-search";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function defaultQueries(profile?: Record<string, any> | null) {
  const businessCategory =
    Array.isArray(profile?.categories) && profile.categories[0]
      ? String(profile.categories[0])
      : "marketing agency";

  const services =
    Array.isArray(profile?.services) && profile.services.length
      ? profile.services.slice(0, 3).map(String)
      : ["SEO", "web design", "digital marketing"];

  return [
    `${businessCategory} directory submit listing`,
    `${businessCategory} add business listing`,
    `${services[0]} agency directory add company`,
    `${services[1] ?? "web design"} directory submit site`,
    `${services[2] ?? "digital marketing"} business directory add listing`,
  ];
}

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const submittedQuery = String(formData.get("query") || "").trim();
  const country = String(formData.get("country") || "US").trim() || "US";
  const searchLang = String(formData.get("search_lang") || "en").trim() || "en";
  const count = Math.max(1, Math.min(20, Number(formData.get("count") || 10)));
  const saveRejected = String(formData.get("save_rejected") || "") === "true";

  const { data: profile } = await supabase
    .from("directory_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const queries = submittedQuery ? [submittedQuery] : defaultQueries(profile).slice(0, 3);
  const allCandidates = [];

  for (const query of queries) {
    const response = await searchBraveWeb({
      query,
      count,
      country,
      searchLang,
    });

    const results = response.web?.results ?? [];

    for (const result of results) {
      const candidate = braveResultToDirectoryOpportunity({
        result,
        query,
      });

      if (!candidate) continue;

      if (candidate.status === "rejected" && !saveRejected) {
        continue;
      }

      allCandidates.push(candidate);
    }
  }

  const uniqueCandidates = new Map<string, (typeof allCandidates)[number]>();

  for (const candidate of allCandidates) {
    uniqueCandidates.set(candidate.url, candidate);
  }

  const candidates = [...uniqueCandidates.values()];

  if (candidates.length === 0) {
    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "directory_discovery_completed",
      title: "Directory discovery completed",
      description: "No directory-like opportunities were found.",
      metadata: {
        provider: "brave_search",
        queries,
        count,
        saved: 0,
      },
    });

    return NextResponse.json({
      ok: true,
      provider: "brave_search",
      queries,
      discovered: 0,
      inserted: 0,
      skippedDuplicates: 0,
      opportunities: [],
    });
  }

  const { data: existingRows } = await supabase
    .from("directory_opportunities")
    .select("url,domain")
    .eq("user_id", user.id);

  const existingUrls = new Set(
    ((existingRows ?? []) as Array<Record<string, string>>).map((row) => row.url)
  );

  const newCandidates = candidates.filter((candidate) => !existingUrls.has(candidate.url));

  let insertedRows: Array<Record<string, any>> = [];

  if (newCandidates.length > 0) {
    const { data, error } = await supabase
      .from("directory_opportunities")
      .insert(
        newCandidates.map((candidate) => ({
          user_id: user.id,
          ...candidate,
        }))
      )
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    insertedRows = data ?? [];
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "directory_discovery_completed",
    title: "Directory discovery completed",
    description: `Found ${candidates.length} candidate(s), saved ${insertedRows.length}.`,
    metadata: {
      provider: "brave_search",
      queries,
      count,
      candidates: candidates.length,
      inserted: insertedRows.length,
      skippedDuplicates: candidates.length - newCandidates.length,
    },
  });

  return NextResponse.json({
    ok: true,
    provider: "brave_search",
    queries,
    discovered: candidates.length,
    inserted: insertedRows.length,
    skippedDuplicates: candidates.length - newCandidates.length,
    opportunities: insertedRows,
  });
}
