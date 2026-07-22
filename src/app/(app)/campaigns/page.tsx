import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { buildCampaignWorkspaceState } from "@/lib/campaigns/campaign-workspace";
import {
  computeOneOffStrategySourceSignature,
  extractOneOffStrategyGate,
} from "@/lib/content-generation/one-off-strategy-gate";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import {
  buildStrategyFoundationBrandVoiceOptions,
  buildStrategyFoundationKnowledgeOptions,
} from "@/lib/strategy/strategy-foundation-campaign-options";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { CampaignWebsiteForm } from "@/components/campaigns/CampaignWebsiteForm";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CampaignsPage() {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;
  const accountStrategyHref = "/strategy";

  if (!activeAccountId) redirect("/accounts");

  const [campaignsResult, foundation, contentExamplesResult, assetsResult] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("*")
        .eq("account_id", activeAccountId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(100),
      getApprovedStrategyFoundation({ supabase, accountId: activeAccountId }),
      supabase
        .from("content_examples")
        .select("id,title,content_type,content,source,updated_at")
        .eq("account_id", activeAccountId)
        .eq("approved", true)
        .order("updated_at", { ascending: false })
        .limit(12),
      supabase
        .from("generated_assets")
        .select("campaign_id,status")
        .eq("account_id", activeAccountId)
        .is("archived_at", null),
    ]);

  const campaigns = (campaignsResult.data ?? []) as Array<Record<string, any>>;
  const assetRows = (assetsResult.data ?? []) as Array<Record<string, any>>;
  const serviceLines = foundation.market.serviceLines;
  const buyerSegments = foundation.market.audiences;
  const offers = foundation.market.offers;
  const brandVoiceOptions = buildStrategyFoundationBrandVoiceOptions(foundation);

  const truncateContext = (value: unknown, maxLength = 700) => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  };

  const knowledgeOptions = [
    ...buildStrategyFoundationKnowledgeOptions(foundation),
    ...((contentExamplesResult.data ?? []) as Array<Record<string, any>>).map(
      (example) => ({
        id: `example-${example.id}`,
        label: `${example.title} (${example.content_type ?? "example"})`,
        value: [
          `Content example: ${example.title}`,
          example.content_type ? `Type: ${example.content_type}` : "",
          example.source ? `Source: ${example.source}` : "",
          `Example: ${truncateContext(example.content, 520)}`,
        ]
          .filter(Boolean)
          .join("\n"),
        sourceType: "content_example" as const,
      }),
    ),
  ];

  const assetsByCampaignId = new Map<string, Array<Record<string, any>>>();
  for (const asset of assetRows) {
    const campaignId = String(asset.campaign_id ?? "");
    if (!campaignId) continue;
    const existing = assetsByCampaignId.get(campaignId) ?? [];
    existing.push(asset);
    assetsByCampaignId.set(campaignId, existing);
  }

  const campaignWorkspaces = campaigns.map((campaign) => {
    const campaignAssets = assetsByCampaignId.get(String(campaign.id)) ?? [];
    const needsReviewCount = campaignAssets.filter(
      (asset) => asset.status === "needs_review",
    ).length;
    const approvedAssetCount = campaignAssets.filter(
      (asset) => asset.status === "approved",
    ).length;
    const executedAssetCount = campaignAssets.filter((asset) =>
      ["published", "sent"].includes(asset.status),
    ).length;
    const strategyGate = extractOneOffStrategyGate(campaign.strategy);
    const strategyStale = Boolean(
      strategyGate &&
        strategyGate.sourceSignature !== computeOneOffStrategySourceSignature(campaign),
    );
    const strategyApproved = Boolean(
      strategyGate?.status === "approved" && !strategyStale,
    );

    return {
      campaign,
      needsReviewCount,
      workspace: buildCampaignWorkspaceState({
        strategyApproved,
        strategyStale,
        assetCount: campaignAssets.length,
        needsReviewCount,
        approvedAssetCount,
        executedAssetCount,
      }),
    };
  });

  const inReview = campaignWorkspaces.filter(
    (item) => item.needsReviewCount > 0,
  ).length;
  const averageProgress = campaignWorkspaces.length
    ? Math.round(
        campaignWorkspaces.reduce(
          (total, item) => total + item.workspace.progressPercent,
          0,
        ) / campaignWorkspaces.length,
      )
    : 0;
  const setupReady = foundation.readiness.campaignReady;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Campaign Workspace"
        title="Move every campaign from strategy to execution."
        description="Create the Marketing Spine, approve campaign strategy, generate assets, manage review, and see the next required action without losing the thread between screens."
        primaryAction={{
          label: setupReady ? "Create Campaign" : "Review Strategy Foundation",
          href: setupReady ? "#create-campaign" : accountStrategyHref,
        }}
        secondaryAction={{ label: "Review Assets", href: "/approvals" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Campaigns"
          value={campaigns.length}
          description="Active campaign workspaces in VIP."
          dot="blue"
        />
        <WebsiteMetric
          label="Average Progress"
          value={`${averageProgress}%`}
          description="Average completion across Brief, Strategy, Assets, Review, and Execution."
          dot={averageProgress === 100 ? "green" : "blue"}
        />
        <WebsiteMetric
          label="Strategy Readiness"
          value={`${foundation.readiness.score}%`}
          description="Approved account foundation completeness."
          dot={setupReady ? "green" : "gold"}
          href={accountStrategyHref}
        />
        <WebsiteMetric
          label="In Review"
          value={inReview}
          description="Campaigns with assets awaiting approval or revision."
          dot="gold"
          href="/approvals"
        />
        <WebsiteMetric
          label="Offers"
          value={offers.length}
          description="Offer dropdowns inherited from Strategy Foundation."
          dot={offers.length ? "green" : "red"}
          href={accountStrategyHref}
        />
      </section>

      {!setupReady ? (
        <WebsiteSection
          eyebrow="Setup Needed"
          title="Complete the Strategy Foundation first"
          description="The campaign form inherits active services, audiences, offers, voice guidance, proof context, and knowledge from the current workspace. Complete the missing structured strategy once instead of recreating it in every campaign."
        >
          <Link href={accountStrategyHref} className={websiteStyles.link}>
            Review Strategy Foundation →
          </Link>
        </WebsiteSection>
      ) : null}

      <WebsiteSection
        eyebrow="Campaign Library"
        title="Active campaign workspaces"
        description="Open a campaign to continue from its exact next step. Progress is calculated from approved strategy, generated assets, review status, and execution state."
      >
        {campaignWorkspaces.length ? (
          <div className={websiteStyles.cardGrid}>
            {campaignWorkspaces.map(({ campaign, workspace }) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className={websiteStyles.card}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className={websiteStyles.cardTitle}>{campaign.name}</h3>
                    <p className={websiteStyles.cardMeta}>
                      {campaign.buyer_segment ?? "No buyer segment"} •{" "}
                      {formatDate(campaign.updated_at)}
                    </p>
                  </div>
                  <WebsiteBadge status={campaign.status} />
                </div>

                <p className={websiteStyles.cardText}>{campaign.idea}</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                    <span>Workspace progress</span>
                    <span>{workspace.progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-950"
                      style={{ width: `${workspace.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 border-l-4 border-blue-500 bg-blue-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                    Next action
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {workspace.nextAction.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {workspace.nextAction.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No campaigns yet. Create your first campaign below.
          </div>
        )}
      </WebsiteSection>

      <div id="create-campaign" className="scroll-mt-24">
        <WebsiteSection
          eyebrow="Create Campaign"
          title="Start with the brief, then approve the Marketing Spine"
          description="The campaign is created only after its campaign-specific strategy has been generated, reviewed, and approved."
        >
          <div className={websiteStyles.formFrame}>
            <CampaignWebsiteForm
              serviceLines={serviceLines}
              buyerSegments={buyerSegments}
              offers={offers}
              brandVoiceOptions={brandVoiceOptions}
              knowledgeOptions={knowledgeOptions}
              accountStrategyUrl={accountStrategyHref}
            />
          </div>
        </WebsiteSection>
      </div>
    </WebsitePage>
  );
}
