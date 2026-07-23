import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GoogleSearchPackageBuilder,
  type SearchCampaignOption,
} from "@/components/ad-studio/GoogleSearchPackageBuilder";
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

type SearchAssetRow = {
  id: string;
  campaign_id: string | null;
  title: string;
  status: string | null;
  created_at: string;
};

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
      .select("id,campaign_id,title,status,created_at")
      .eq("account_id", accountId)
      .eq("asset_type", "search_ad")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("accounts")
      .select("website_url,primary_cta")
      .eq("id", accountId)
      .maybeSingle(),
  ]);

  const campaigns = ((campaignResult.data ?? []) as CampaignRow[])
    .map(campaignOption)
    .filter((item): item is SearchCampaignOption => Boolean(item));
  const assets = (assetResult.data ?? []) as SearchAssetRow[];
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
        description="Choose an approved campaign and final landing page. Marketing VIP revalidates the campaign Marketing Spine, current Strategy Foundation, approved Market Intelligence, account permissions, and destination before generating anything."
      >
        <GoogleSearchPackageBuilder
          campaigns={campaigns}
          defaultDestinationUrl={defaultDestinationUrl}
          canManage={canManage}
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Ad operations"
        title="Current advertising workspace"
        description="Search packages enter the existing asset review workflow. Paid Social, scoring, exports, and platform handoff remain controlled follow-on releases."
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
            value={assets.length}
            description="Recent Google Search packages saved in this workspace."
            dot="blue"
          />
          <WebsiteMetric
            label="Needs review"
            value={needsReview}
            description="Generated Search packages awaiting explicit approval."
            href="/approvals"
            dot="gold"
          />
          <WebsiteMetric
            label="Attribution"
            value="CPC ready"
            description="Destination and Google CPC taxonomy are stored with each asset."
            href="/analytics/taxonomy"
            dot="purple"
          />
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent work"
        title="Google Search packages"
        description="Open any package in the existing asset workspace to review, edit, approve, reject, or track its history."
      >
        <div className={websiteStyles.cardGrid}>
          {assets.length ? (
            assets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={websiteStyles.sectionEyebrow}>
                      {asset.campaign_id
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
                    Open Search Package →
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
              No Google Search packages have been generated for this workspace yet.
            </div>
          )}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Next controlled release"
        title="Paid Social follows Search validation"
        description="Meta and LinkedIn packages will reuse this same campaign contract, review system, evidence traceability, and paid-social attribution model. Direct advertising-platform publishing remains outside this release."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-black text-slate-950">Included now</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Responsive Search concepts, keyword themes, negative-keyword guidance, display paths, callouts, sitelinks, destination alignment, CPC metadata, and approval-gated asset storage.
            </p>
          </div>
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-black text-slate-950">Still protected</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Paid Social generation, automated ad scoring, structured platform exports, campaign Ads-stage completion, and direct provider publishing.
            </p>
          </div>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
