import Link from "next/link";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

function missingItemHref(item: string) {
  const normalized = item.toLowerCase();
  if (normalized.includes("voice") || normalized.includes("rule")) {
    return "/strategy/brand-voice";
  }
  if (normalized.includes("service") || normalized.includes("offer") || normalized.includes("differentiator")) {
    return "/strategy/offerings";
  }
  if (normalized.includes("audience")) return "/strategy/audiences";
  if (normalized.includes("knowledge") || normalized.includes("example")) {
    return "/strategy/knowledge";
  }
  return "/strategy/business-truth";
}

export default async function StrategyFoundationPage() {
  const workspace = await requireStrategyWorkspace();
  const foundation = await getApprovedStrategyFoundation({
    supabase: workspace.supabase,
    accountId: workspace.accountId,
  });
  const sourceCount = foundation.sources.reduce(
    (total, source) => total + source.count,
    0,
  );

  const areas = [
    {
      label: "Business Truth",
      description: "Company identity, website, CTA, geography, logo, and durable business facts.",
      value: foundation.businessTruth.companyName ? "Established" : "Needs work",
      status: foundation.businessTruth.companyName ? "approved" : "needs_review",
      href: "/strategy/business-truth",
    },
    {
      label: "Brand Voice",
      description: "Voice, business framing, audience understanding, offers, and sales outcomes.",
      value: foundation.brandExpression.voiceSummary ? "Established" : "Needs work",
      status: foundation.brandExpression.voiceSummary ? "approved" : "needs_review",
      href: "/strategy/brand-voice",
    },
    {
      label: "Offerings",
      description: "Service lines, offers, outcomes, package notes, and calls-to-action.",
      value: `${foundation.market.serviceLines.length} services · ${foundation.market.offers.length} offers`,
      status: foundation.market.serviceLines.length && foundation.market.offers.length ? "approved" : "needs_review",
      href: "/strategy/offerings",
    },
    {
      label: "Audiences",
      description: "Buyer groups, pain points, desired outcomes, and objections.",
      value: `${foundation.market.audiences.length} active`,
      status: foundation.market.audiences.length ? "approved" : "needs_review",
      href: "/strategy/audiences",
    },
    {
      label: "Messaging & Proof",
      description: "Differentiators, proof context, sales outcomes, and approved evidence.",
      value: foundation.campaignDefaults.proofPoints ? "Available" : "Needs work",
      status: foundation.campaignDefaults.proofPoints ? "approved" : "needs_review",
      href: "/strategy/messaging-proof",
    },
    {
      label: "Brand Rules",
      description: "Prioritized voice, behavior, positioning, and safety guardrails.",
      value: `${foundation.brandExpression.rules.length} active`,
      status: foundation.brandExpression.rules.length ? "approved" : "needs_review",
      href: "/strategy/brand-rules",
    },
    {
      label: "Knowledge",
      description: "Documents, business sources, testimonials, and approved examples.",
      value: `${foundation.evidence.knowledgeSources.length} sources · ${foundation.evidence.approvedExamples.length} examples`,
      status: foundation.evidence.knowledgeSources.length || foundation.evidence.approvedExamples.length ? "approved" : "needs_review",
      href: "/strategy/knowledge",
    },
  ] as const;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy Workspace"
        title={`${foundation.accountName} strategy source of truth`}
        description="Manage the approved account-level information VIP should inherit before campaign-specific decisions are added."
        primaryAction={{ label: "Edit Business Truth", href: "/strategy/business-truth" }}
        secondaryAction={{ label: "Create Campaign", href: "/campaigns" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Readiness"
          value={`${foundation.readiness.score}%`}
          description={`${foundation.readiness.completedChecks} of ${foundation.readiness.totalChecks} foundation checks complete.`}
          dot={foundation.readiness.campaignReady ? "green" : "gold"}
        />
        <WebsiteMetric
          label="Services"
          value={foundation.market.serviceLines.length}
          description="Active service lines available to campaigns."
          dot={foundation.market.serviceLines.length ? "green" : "red"}
          href="/strategy/offerings"
        />
        <WebsiteMetric
          label="Audiences"
          value={foundation.market.audiences.length}
          description="Active buyer groups available to campaigns."
          dot={foundation.market.audiences.length ? "green" : "red"}
          href="/strategy/audiences"
        />
        <WebsiteMetric
          label="Offers"
          value={foundation.market.offers.length}
          description="Active offers available to campaigns."
          dot={foundation.market.offers.length ? "green" : "red"}
          href="/strategy/offerings"
        />
        <WebsiteMetric
          label="Source Records"
          value={sourceCount}
          description="Current records contributing to this foundation."
          dot="blue"
          href="/strategy/knowledge"
        />
      </section>

      {foundation.readiness.missing.length ? (
        <WebsiteSection
          eyebrow="Foundation Gaps"
          title="Complete the missing source-of-truth fields"
          description="Open the corresponding Strategy tab to strengthen campaign defaults and generation context."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {foundation.readiness.missing.map((item) => (
              <Link
                key={item}
                href={missingItemHref(item)}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-bold text-amber-950 no-underline hover:border-amber-300 hover:bg-amber-100"
              >
                {item} →
              </Link>
            ))}
          </div>
        </WebsiteSection>
      ) : null}

      <WebsiteSection
        eyebrow="Workspace Areas"
        title="One home for account strategy"
        description="Each area remains independently editable while contributing to the same approved foundation used by campaigns."
      >
        <div className={websiteStyles.cardGrid}>
          {areas.map((area) => (
            <article key={area.href} className={websiteStyles.card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <WebsiteBadge status={area.status} />
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  {area.value}
                </span>
              </div>
              <h3 className={websiteStyles.cardTitle}>{area.label}</h3>
              <p className={websiteStyles.cardText}>{area.description}</p>
              <div className="mt-4">
                <Link href={area.href} className={websiteStyles.link}>
                  Open {area.label} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Campaign Inheritance"
        title="Defaults VIP carries into a new campaign"
        description="Campaign-specific decisions may refine these values, but the builder starts from this approved account foundation."
      >
        <div className={websiteStyles.cardGrid}>
          {[
            ["Default Audience", foundation.campaignDefaults.targetAudience],
            ["Default Offer", foundation.campaignDefaults.primaryOffer],
            ["Default CTA", foundation.campaignDefaults.callToAction],
            ["Tone", foundation.campaignDefaults.tone],
            ["Differentiator", foundation.campaignDefaults.differentiator],
            ["Proof Context", foundation.campaignDefaults.proofPoints],
          ].map(([label, value]) => (
            <article key={label} className={websiteStyles.card}>
              <p className={websiteStyles.sectionEyebrow}>{label}</p>
              <p className={websiteStyles.cardText}>{value || "Not established yet."}</p>
            </article>
          ))}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Source Register"
        title="Where this strategy came from"
        description="The foundation composes account-owned records without silently replacing their source data."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {foundation.sources.map((source) => (
            <article key={source.key} className={websiteStyles.card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <WebsiteBadge status={source.status} />
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  {source.owner} owned
                </span>
              </div>
              <h3 className={websiteStyles.cardTitle}>{source.label}</h3>
              <p className={websiteStyles.cardText}>
                {source.count} contributing record{source.count === 1 ? "" : "s"}
              </p>
            </article>
          ))}
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
