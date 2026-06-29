import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
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
    `${businessCategory} directory`,
    `${businessCategory} add listing`,
    `${businessCategory} submit business`,
    `${services[0]} agency directory`,
    `${services[1] ?? "web design"} company directory`,
    `${services[2] ?? "digital marketing"} get listed`,
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

  const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

  if (!workspace) {
    return NextResponse.json({ error: activeWorkspaceRequiredMessage() }, { status: 400 });
  }

  if (!workspace.canManageActiveAccount) {
    return NextResponse.json({ error: activeWorkspaceManageRequiredMessage() }, { status: 403 });
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
    .eq("account_id", workspace.activeAccountId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const queries = submittedQuery ? [submittedQuery] : defaultQueries(profile).slice(0, 3);
  const allCandidates = [];
  let rawResultCount = 0;

  for (const query of queries) {
    const response = await searchBraveWeb({
      query,
      count,
      country,
      searchLang,
    });

    const results = response.web?.results ?? [];
    rawResultCount += results.length;

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
      account_id: workspace.activeAccountId,
      activity_type: "directory_discovery_completed",
      title: "Directory discovery completed",
      description: `Brave returned ${rawResultCount} result(s), but VIP found no directory-like candidates.`,
      metadata: {
        provider: "brave_search",
        queries,
        count,
        rawResultCount,
        saved: 0,
      },
    });

    return NextResponse.json({
      ok: true,
      provider: "brave_search",
      queries,
      rawResultCount,
      discovered: 0,
      inserted: 0,
      skippedDuplicates: 0,
      opportunities: [],
      message:
        "Brave returned results, but none passed the directory filter. Try a broader query like 'marketing agency directory' or 'web design agency directory'.",
    });
  }

  const { data: existingRows } = await supabase
    .from("directory_opportunities")
    .select("url,domain")
    .eq("account_id", workspace.activeAccountId);

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
          account_id: workspace.activeAccountId,
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
    account_id: workspace.activeAccountId,
    activity_type: "directory_discovery_completed",
    title: "Directory discovery completed",
    description: `Brave returned ${rawResultCount} result(s), found ${candidates.length} candidate(s), saved ${insertedRows.length}.`,
    metadata: {
      provider: "brave_search",
      queries,
      count,
      rawResultCount,
      candidates: candidates.length,
      inserted: insertedRows.length,
      skippedDuplicates: candidates.length - newCandidates.length,
    },
  });

  return NextResponse.json({
    ok: true,
    provider: "brave_search",
    queries,
    rawResultCount,
    discovered: candidates.length,
    inserted: insertedRows.length,
    skippedDuplicates: candidates.length - newCandidates.length,
    opportunities: insertedRows,
  });
}
