import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
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

  const [campaignsResult, foundation, contentExamplesResult] = await Promise.all([
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
  ]);

  const campaigns = (campaignsResult.data ?? []) as Array<Record<string, any>>;
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

  const inReview = campaigns.filter((campaign) =>
    ["asset_pack_generated", "in_review"].includes(campaign.status),
  ).length;
  const setupReady = foundation.readiness.campaignReady;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Campaign Builder"
        title="Create revenue-focused marketing campaigns."
        description="Build the one-off Marketing Spine from the approved Strategy Foundation, review the campaign-specific strategy, and only then create the campaign and unlock content generation."
        primaryAction={{
          label: setupReady ? "Review Assets" : "Review Strategy Foundation",
          href: setupReady ? "/approvals" : accountStrategyHref,
        }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Campaigns"
          value={campaigns.length}
          description="Total campaigns in VIP."
          dot="blue"
        />
        <WebsiteMetric
          label="Strategy Readiness"
          value={`${foundation.readiness.score}%`}
          description="Approved account foundation completeness."
          dot={setupReady ? "green" : "gold"}
          href={accountStrategyHref}
        />
        <WebsiteMetric
          label="Audiences"
          value={buyerSegments.length}
          description="Audience dropdowns inherited from Strategy Foundation."
          dot={buyerSegments.length ? "green" : "red"}
          href={accountStrategyHref}
        />
        <WebsiteMetric
          label="Offers"
          value={offers.length}
          description="Offer dropdowns inherited from Strategy Foundation."
          dot={offers.length ? "green" : "red"}
          href={accountStrategyHref}
        />
        <WebsiteMetric
          label="In Review"
          value={inReview}
          description="Campaigns with generated assets."
          dot="gold"
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

      <WebsiteSection
        eyebrow="Campaign Library"
        title="Recent campaigns"
        description="Each new one-off campaign enters the library only after its Marketing Spine has been reviewed and approved."
      >
        {campaigns.length ? (
          <div className={websiteStyles.cardGrid}>
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className={websiteStyles.card}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{campaign.name}</h3>
                  <WebsiteBadge status={campaign.status} />
                </div>
                <p className={websiteStyles.cardMeta}>
                  {campaign.buyer_segment ?? "No buyer segment"} •{" "}
                  {formatDate(campaign.updated_at)}
                </p>
                <p className={websiteStyles.cardText}>{campaign.idea}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No campaigns yet. Create your first campaign above.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
