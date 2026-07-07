import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { fetchAccountMarketProfile } from "@/lib/accounts/account-market-profile";
import { buildBrandVoiceMonthlyOptions } from "@/lib/accounts/brand-voice-monthly-options";
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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function CampaignsPage() {
  const supabase = untypedSupabase(await createClient());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;
  const accountStrategyHref = activeAccountId ? `/accounts/${activeAccountId}#strategy` : "/accounts";

  if (!activeAccountId) redirect("/accounts");

  const [
    campaignsResult,
    marketProfile,
    cloneProfileResult,
    accountBrandProfileResult,
    brandRulesResult,
    knowledgeSourcesResult,
    contentExamplesResult,
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*")
      .eq("account_id", activeAccountId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(100),
    fetchAccountMarketProfile({ supabase, accountId: activeAccountId }),
    supabase
      .from("digital_clone_profiles")
      .select("*")
      .eq("account_id", activeAccountId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("account_brand_profiles")
      .select("*")
      .eq("account_id", activeAccountId)
      .maybeSingle(),
    supabase
      .from("brand_rules")
      .select("rule_text,category,priority")
      .eq("account_id", activeAccountId)
      .eq("active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("knowledge_sources")
      .select("id,title,source_type,summary,content,updated_at")
      .eq("account_id", activeAccountId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("content_examples")
      .select("id,title,content_type,content,source,updated_at")
      .eq("account_id", activeAccountId)
      .eq("approved", true)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  const campaigns = (campaignsResult.data ?? []) as Array<Record<string, any>>;
  const serviceLines = marketProfile.serviceLines;
  const buyerSegments = marketProfile.audiences;
  const offers = marketProfile.offers;

  const brandVoiceOptions = buildBrandVoiceMonthlyOptions({
    cloneProfile: cloneProfileResult.data as Record<string, unknown> | null,
    accountBrandProfile: accountBrandProfileResult.data as Record<string, unknown> | null,
    brandRules: (brandRulesResult.data ?? []) as Array<Record<string, unknown>>,
  });

  const truncateContext = (value: unknown, maxLength = 700) => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  };

  const knowledgeOptions = [
    ...((knowledgeSourcesResult.data ?? []) as Array<Record<string, any>>).map((source) => ({
      id: `knowledge-${source.id}`,
      label: `${source.title} (${source.source_type ?? "knowledge"})`,
      value: [
        `Knowledge source: ${source.title}`,
        source.source_type ? `Type: ${source.source_type}` : "",
        source.summary ? `Summary: ${source.summary}` : `Content: ${truncateContext(source.content)}`,
      ].filter(Boolean).join("\n"),
      sourceType: "knowledge_source" as const,
    })),
    ...((contentExamplesResult.data ?? []) as Array<Record<string, any>>).map((example) => ({
      id: `example-${example.id}`,
      label: `${example.title} (${example.content_type ?? "example"})`,
      value: [
        `Content example: ${example.title}`,
        example.content_type ? `Type: ${example.content_type}` : "",
        example.source ? `Source: ${example.source}` : "",
        `Example: ${truncateContext(example.content, 520)}`,
      ].filter(Boolean).join("\n"),
      sourceType: "content_example" as const,
    })),
  ];

  const inReview = campaigns.filter((campaign) => ["asset_pack_generated", "in_review"].includes(campaign.status)).length;
  const active = campaigns.filter((campaign) => campaign.status === "active").length;
  const setupReady = serviceLines.length > 0 && buyerSegments.length > 0 && offers.length > 0;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Campaign Builder"
        title="Create revenue-focused marketing campaigns."
        description="Build one-off campaigns using Account Strategy, Brand Voice, and Knowledge shortcuts. The monthly calendar still uses the full Marketing Spine gate."
        primaryAction={{ label: setupReady ? "Review Assets" : "Manage Account Strategy", href: setupReady ? "/approvals" : accountStrategyHref }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Campaigns" value={campaigns.length} description="Total campaigns in VIP." dot="blue" />
        <WebsiteMetric label="Audiences" value={buyerSegments.length} description="Audience dropdowns from Account Strategy." dot={buyerSegments.length ? "green" : "red"} href={accountStrategyHref} />
        <WebsiteMetric label="Offers" value={offers.length} description="Offer dropdowns from Account Strategy." dot={offers.length ? "green" : "red"} href={accountStrategyHref} />
        <WebsiteMetric label="In Review" value={inReview} description="Campaigns with generated assets." dot="gold" />
      </section>

      {!setupReady ? (
        <WebsiteSection
          eyebrow="Setup Needed"
          title="Populate account audiences and offers first"
          description="The campaign form uses the active workspace’s Account Strategy: audiences, service lines, and offers. Add them once and these dropdowns will be ready."
        >
          <Link href={accountStrategyHref} className={websiteStyles.link}>
            Manage Account Strategy →
          </Link>
        </WebsiteSection>
      ) : null}

      <div className={websiteStyles.formFrame}>
        <CampaignWebsiteForm serviceLines={serviceLines} buyerSegments={buyerSegments} offers={offers} brandVoiceOptions={brandVoiceOptions} knowledgeOptions={knowledgeOptions} accountStrategyUrl={accountStrategyHref} />
      </div>

      <WebsiteSection
        eyebrow="Campaign Library"
        title="Recent campaigns"
        description="Open a one-off campaign to generate assets, review outputs, and move the work into approval."
      >
        {campaigns.length ? (
          <div className={websiteStyles.cardGrid}>
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{campaign.name}</h3>
                  <WebsiteBadge status={campaign.status} />
                </div>
                <p className={websiteStyles.cardMeta}>
                  {campaign.buyer_segment ?? "No buyer segment"} • {formatDate(campaign.updated_at)}
                </p>
                <p className={websiteStyles.cardText}>{campaign.idea}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No campaigns yet. Create your first campaign above.</div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}