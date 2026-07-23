import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GoogleSearchPackageBuilder,
  type SearchCampaignOption,
} from "@/components/ad-studio/GoogleSearchPackageBuilder";
import { PaidSocialPackageBuilder } from "@/components/ad-studio/PaidSocialPackageBuilder";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import type { AdPackage } from "@/lib/ad-studio/ad-package";
import { scoreAdPackage } from "@/lib/ad-studio/ad-package-scoring";
import { isAdStudioEnabled } from "@/lib/ad-studio/feature";
import { extractOneOffStrategyGate } from "@/lib/content-generation/one-off-strategy-gate";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  name: string;
  strategy: unknown;
};

type AdAssetRow = {
  id: string;
  campaign_id: string | null;
  asset_type: string;
  title: string;
  status: string | null;
  metadata: unknown;
  created_at: string;
};

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function adPackageFromMetadata(value: unknown): AdPackage | null {
  const metadata = recordValue(value);
  const candidate = recordValue(metadata.adPackage);
  if (
    metadata.generatedBy !== "ad_studio" ||
    candidate.version !== "h1.17" ||
    !text(candidate.accountId) ||
    !text(candidate.campaignId) ||
    !text(candidate.channel) ||
    !Array.isArray(candidate.variants)
  ) {
    return null;
  }
  return candidate as unknown as AdPackage;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function campaignOption(campaign: CampaignRow): SearchCampaignOption | null {
  const gate = extractOneOffStrategyGate(campaign.strategy);
  if (!gate || gate.status !== "approved") return null;
  return {
    id: campaign.id,
    name: campaign.name,
    objective: gate.strategy.campaignObjective,
    audience: gate.strategy.targetAudience,
    offer: [gate.strategy.offerExplanation, gate.strategy.offerDeliverables]
      .filter(Boolean)
      .join(" — "),
  };
}

function isAdStudioAsset(asset: AdAssetRow) {
  return Boolean(adPackageFromMetadata(asset.metadata));
}

function platformLabel(asset: AdAssetRow) {
  if (asset.asset_type === "search_ad") return "Google Search";
  const metadata = recordValue(asset.metadata);
  if (metadata.channel === "linkedin") return "LinkedIn";
  if (metadata.channel === "meta") return "Meta";
  return asset.asset_type === "linkedin_post" ? "LinkedIn" : "Meta";
}

function scoreStyle(rating: string) {
  if (rating === "excellent") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (rating === "ready") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

export default async function AdStudioPage() {
  if (!isAdStudioEnabled()) notFound();

  const { supabase, accountId, accountName, canManage } =
    await requireStrategyWorkspace();
  const [campaignResult, assetResult, accountResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,name,strategy")
      .eq("account_id", accountId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("generated_assets")
      .select("id,campaign_id,asset_type,title,status,metadata,created_at")
      .eq("account_id", accountId)
      .in("asset_type", ["search_ad", "facebook_post", "linkedin_post"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("accounts")
      .select("website_url,primary_cta")
      .eq("id", accountId)
      .maybeSingle(),
  ]);

  const campaigns = ((campaignResult.data ?? []) as CampaignRow[])
    .map(campaignOption)
    .filter((item): item is SearchCampaignOption => Boolean(item));
  const assets = ((assetResult.data ?? []) as AdAssetRow[])
    .filter(isAdStudioAsset)
    .slice(0, 16);
  const scoredAssets = assets.map((asset) => {
    const adPackage = adPackageFromMetadata(asset.metadata);
    return {
      asset,
      adPackage,
      score: adPackage ? scoreAdPackage(adPackage) : null,
    };
  });
  const searchAssets = assets.filter((asset) => asset.asset_type === "search_ad");
  const socialAssets = assets.filter((asset) => asset.asset_type !== "search_ad");
  const account = (accountResult.data ?? {}) as Record<string, unknown>;
  const defaultDestinationUrl =
    (typeof account.primary_cta === "string" && account.primary_cta.startsWith("http")
      ? account.primary_cta
      : "") ||
    (typeof account.website_url === "string" ? account.website_url : "");
  const campaignNameById = new Map(
    campaigns.map((campaign) => [campaign.id, campaign.name]),
  );
  const needsReview = assets.filter((asset) => asset.status === "needs_review").length;
  const scoreValues = scoredAssets
    .map((item) => item.score?.total)
    .filter((value): value is number => typeof value === "number");
  const averageScore = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
    : 0;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Create • Ad Studio"
        title={`Advertising workspace for ${accountName}`}
        description="Turn approved strategy, research, audiences, offers, proof, and campaign decisions into channel-ready advertising packages without creating another disconnected content system."
        primaryAction={{ label: "Review Ad Assets", href: "/approvals" }}
        secondaryAction={{ label: "Open Campaigns", href: "/campaigns" }}
      />

      <WebsiteSection
        eyebrow="Google Search"
        title="Build a responsive-search-ad package"
        description="Generate three distinct Search concepts with headlines, descriptions, keyword themes, negative-keyword guidance, display paths, callouts, sitelinks, final-URL alignment, and CPC attribution."
      >
        <GoogleSearchPackageBuilder
          campaigns={campaigns}
          defaultDestinationUrl={defaultDestinationUrl}
          canManage={canManage}
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Paid Social"
        title="Build Meta or LinkedIn ad concepts"
        description="Generate four native-feed concepts—direct response, problem aware, credibility led, and educational—with public ad copy, a platform CTA, audience framing, an image creative brief, final-URL alignment, and paid-social attribution."
      >
        <PaidSocialPackageBuilder
          campaigns={campaigns}
          defaultDestinationUrl={defaultDestinationUrl}
          canManage={canManage}
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Ad operations"
        title="Current advertising workspace"
        description="Every package receives a deterministic readiness score and enters the existing asset review workflow. JSON and CSV downloads unlock only after approval."
      >
        <div className={websiteStyles.metricsGrid}>
          <WebsiteMetric
            label="Approved campaigns"
            value={campaigns.length}
            description="Campaigns currently eligible for advertising generation."
            dot="green"
          />
          <WebsiteMetric
            label="Search packages"
            value={searchAssets.length}
            description="Recent Google Search packages saved in this workspace."
            dot="blue"
          />
          <WebsiteMetric
            label="Paid Social packages"
            value={socialAssets.length}
            description="Recent Meta and LinkedIn packages saved in this workspace."
            dot="purple"
          />
          <WebsiteMetric
            label="Average readiness"
            value={scoreValues.length ? `${averageScore}/100` : "—"}
            description="Deterministic package completeness, fit, traceability, and attribution score."
            dot="gold"
          />
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent work"
        title="Advertising packages"
        description="Review packages in the existing asset workspace. Approved packages can be downloaded as complete JSON records or practical CSV files."
      >
        <div className={websiteStyles.cardGrid}>
          {scoredAssets.length ? (
            scoredAssets.map(({ asset, score }) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={websiteStyles.sectionEyebrow}>
                      {platformLabel(asset)} • {asset.campaign_id
                        ? campaignNameById.get(asset.campaign_id) || "Campaign"
                        : "Campaign"}
                    </p>
                    <h3 className={websiteStyles.cardTitle}>{asset.title}</h3>
                  </div>
                  <WebsiteBadge status={asset.status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {score ? (
                    <span
                      className={`inline-flex border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${scoreStyle(score.rating)}`}
                    >
                      {score.total}/100 • {score.rating.replaceAll("_", " ")}
                    </span>
                  ) : null}
                  <span className={websiteStyles.cardMeta}>
                    Generated {formatDate(asset.created_at)}
                  </span>
                </div>
                {score?.issues.length ? (
                  <p className="mt-3 text-sm leading-6 text-amber-800">
                    Review: {score.issues.join(" ")}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="inline-flex bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                  >
                    Open Ad Package →
                  </Link>
                  {asset.status === "approved" ? (
                    <>
                      <a
                        href={`/api/ad-studio/assets/${asset.id}/export?format=csv`}
                        className="inline-flex border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50"
                      >
                        Download CSV
                      </a>
                      <a
                        href={`/api/ad-studio/assets/${asset.id}/export?format=json`}
                        className="inline-flex border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50"
                      >
                        Download JSON
                      </a>
                    </>
                  ) : (
                    <Link
                      href="/approvals"
                      className="inline-flex border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-900 hover:bg-amber-100"
                    >
                      Approve to Export
                    </Link>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
              No Ad Studio packages have been generated for this workspace yet.
            </div>
          )}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Next controlled release"
        title="Campaign handoff and final release validation"
        description="The remaining H1.17 work is connecting Ad Studio readiness into each Campaign Workspace, then completing cross-account, mobile, runtime, and release validation."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-black text-slate-950">Included now</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Search, Meta, and LinkedIn generation; approved campaign inheritance; research traceability; character guardrails; readiness scoring; tracked URLs; approval-gated JSON and CSV exports; and standard asset review.
            </p>
          </div>
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-black text-slate-950">Still protected</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Campaign Ads-stage completion, budget planning, audience targeting exports, direct advertising-provider publishing, and production activation.
            </p>
          </div>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
