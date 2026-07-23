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
  const metadata = recordValue(asset.metadata);
  return metadata.generatedBy === "ad_studio";
}

function platformLabel(asset: AdAssetRow) {
  if (asset.asset_type === "search_ad") return "Google Search";
  const metadata = recordValue(asset.metadata);
  if (metadata.channel === "linkedin") return "LinkedIn";
  if (metadata.channel === "meta") return "Meta";
  return asset.asset_type === "linkedin_post" ? "LinkedIn" : "Meta";
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
        description="All generated packages enter the existing asset review workflow. Automated scoring, structured exports, campaign-stage completion, and provider publishing remain controlled follow-on releases."
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
            label="Needs review"
            value={needsReview}
            description="Generated ad packages awaiting explicit approval."
            href="/approvals"
            dot="gold"
          />
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent work"
        title="Advertising packages"
        description="Open any package in the existing asset workspace to review, edit, approve, reject, or track its history."
      >
        <div className={websiteStyles.cardGrid}>
          {assets.length ? (
            assets.map((asset) => (
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
                <p className={websiteStyles.cardMeta}>
                  Generated {formatDate(asset.created_at)}
                </p>
                <div className="mt-4">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="inline-flex bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                  >
                    Open Ad Package →
                  </Link>
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
        title="Scoring, export, and campaign handoff"
        description="The next Ad Studio block will evaluate platform fit, clarity, brand alignment, evidence use, CTA strength, destination readiness, and attribution before producing structured export packages."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-black text-slate-950">Included now</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Google Search, Meta, and LinkedIn generation; approved campaign inheritance; research traceability; character guardrails; final destinations; CPC and paid-social metadata; and approval-gated asset storage.
            </p>
          </div>
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-black text-slate-950">Still protected</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Automated ad scoring, downloadable platform files, campaign Ads-stage completion, budget planning, audience targeting exports, and direct advertising-provider publishing.
            </p>
          </div>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
