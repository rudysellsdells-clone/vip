import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import type {
  AdPackage,
  PaidSocialAdVariant,
  SearchAdVariant,
} from "@/lib/ad-studio/ad-package";
import {
  buildAdPackageTrackedUrl,
  scoreAdPackage,
} from "@/lib/ad-studio/ad-package-scoring";
import { isAdStudioEnabled } from "@/lib/ad-studio/feature";
import { logActivity } from "@/lib/security/auditLog";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import type { Json } from "@/types/database.types";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

type ExportRow = Record<string, string | number | null>;

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFilename(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "ad-package"
  );
}

function isAdPackage(value: unknown): value is AdPackage {
  const item = recordValue(value);
  return (
    item.version === "h1.17" &&
    Boolean(text(item.accountId)) &&
    Boolean(text(item.campaignId)) &&
    Boolean(text(item.campaignName)) &&
    Boolean(text(item.channel)) &&
    Boolean(text(item.destinationUrl)) &&
    Array.isArray(item.variants)
  );
}

function csvCell(value: string | number | null) {
  const stringValue = value === null ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function csvFromRows(rows: ExportRow[]) {
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? null)).join(",")),
  ].join("\r\n");
}

function baseRow({
  adPackage,
  trackedUrl,
  score,
}: {
  adPackage: AdPackage;
  trackedUrl: string;
  score: ReturnType<typeof scoreAdPackage>;
}): ExportRow {
  return {
    package_version: adPackage.version,
    account_id: adPackage.accountId,
    campaign_id: adPackage.campaignId,
    campaign_name: adPackage.campaignName,
    package_title: adPackage.title,
    channel: adPackage.channel,
    objective: adPackage.objective,
    audience: adPackage.audience,
    offer: adPackage.offer,
    final_url: adPackage.destinationUrl,
    tracked_url: trackedUrl,
    utm_source: adPackage.attribution.source,
    utm_medium: adPackage.attribution.medium,
    utm_campaign: adPackage.attribution.campaign,
    utm_content: adPackage.attribution.content,
    utm_term: adPackage.attribution.term,
    readiness_score: score.total,
    readiness_rating: score.rating,
  };
}

function searchRows({
  adPackage,
  trackedUrl,
  score,
}: {
  adPackage: AdPackage;
  trackedUrl: string;
  score: ReturnType<typeof scoreAdPackage>;
}) {
  const base = baseRow({ adPackage, trackedUrl, score });
  return adPackage.variants
    .filter((item): item is SearchAdVariant => item.kind === "search")
    .map((variant, index) => ({
      ...base,
      concept_number: index + 1,
      concept_name: variant.name,
      headlines: variant.headlines.join(" | "),
      descriptions: variant.descriptions.join(" | "),
      keyword_themes: variant.keywordThemes.join(" | "),
      negative_keyword_themes: variant.negativeKeywordThemes.join(" | "),
      path_one: variant.pathOne,
      path_two: variant.pathTwo,
      callouts: variant.callouts.join(" | "),
      sitelinks_json: JSON.stringify(variant.sitelinks),
    }));
}

function socialRows({
  adPackage,
  trackedUrl,
  score,
}: {
  adPackage: AdPackage;
  trackedUrl: string;
  score: ReturnType<typeof scoreAdPackage>;
}) {
  const base = baseRow({ adPackage, trackedUrl, score });
  return adPackage.variants
    .filter((item): item is PaidSocialAdVariant => item.kind === "paid_social")
    .map((variant, index) => ({
      ...base,
      concept_number: index + 1,
      concept_name: variant.name,
      platform: variant.platform,
      primary_text: variant.primaryText,
      headline: variant.headline,
      description: variant.description,
      call_to_action: variant.callToAction,
      audience_frame: variant.audienceFrame,
      creative_brief: variant.creativeBrief,
    }));
}

export async function GET(request: Request, context: RouteContext) {
  if (!isAdStudioEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const { assetId } = await context.params;
    const supabase = untypedSupabase(await createClient());
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: asset, error: assetError } = await supabase
      .from("generated_assets")
      .select("id,account_id,campaign_id,title,status,metadata")
      .eq("id", assetId)
      .maybeSingle();
    if (assetError || !asset) {
      return NextResponse.json({ error: "Ad package not found." }, { status: 404 });
    }

    const accountId = asset.account_id ? String(asset.account_id) : null;
    const access = await getAccountAccessForUser({
      supabase,
      accountId,
      userId: user.id,
    });
    if (!accountId || !access.canView) {
      return NextResponse.json(
        { error: "You do not have access to this ad package." },
        { status: 403 },
      );
    }
    if (asset.status !== "approved") {
      return NextResponse.json(
        { error: "Approve this ad package before exporting it." },
        { status: 409 },
      );
    }

    const metadata = recordValue(asset.metadata);
    if (metadata.generatedBy !== "ad_studio" || !isAdPackage(metadata.adPackage)) {
      return NextResponse.json(
        { error: "This asset is not an exportable Ad Studio package." },
        { status: 400 },
      );
    }

    const adPackage = metadata.adPackage;
    if (adPackage.accountId !== accountId) {
      return NextResponse.json(
        { error: "Ad package ownership does not match the active asset." },
        { status: 409 },
      );
    }
    const score = scoreAdPackage(adPackage);
    const trackedUrl = buildAdPackageTrackedUrl(adPackage);
    const requestUrl = new URL(request.url);
    const format = requestUrl.searchParams.get("format") === "csv" ? "csv" : "json";
    const filename = safeFilename(adPackage.title || String(asset.title));
    const exportedAt = new Date().toISOString();

    await logActivity(supabase, {
      userId: user.id,
      activityType: "ad_package_exported",
      title: "Ad package exported",
      description: `${adPackage.title} exported as ${format.toUpperCase()}.`,
      metadata: toJson({
        accountId,
        campaignId: asset.campaign_id,
        assetId: asset.id,
        channel: adPackage.channel,
        format,
        score,
        trackedUrl,
        exportedAt,
      }),
    });

    if (format === "csv") {
      const rows =
        adPackage.packageKind === "search"
          ? searchRows({ adPackage, trackedUrl, score })
          : socialRows({ adPackage, trackedUrl, score });
      return new NextResponse(csvFromRows(rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new NextResponse(
      JSON.stringify(
        {
          exportedAt,
          score,
          trackedUrl,
          adPackage,
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unexpected Ad Studio export error." },
      { status: 500 },
    );
  }
}
