import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";

function display(value: string | null | undefined) {
  return value?.trim() || "Not set";
}

function SummaryCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className={websiteStyles.card}>
      <h3 className={websiteStyles.cardTitle}>{title}</h3>
      <p className={websiteStyles.cardText}>{description}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm font-semibold leading-6 text-slate-900">
        {display(value)}
      </p>
    </div>
  );
}

function ItemList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function StrategyFoundationPage() {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;

  if (!activeAccountId) redirect("/accounts");

  const foundation = await getApprovedStrategyFoundation({
    supabase,
    accountId: activeAccountId,
  });
  const accountWorkspaceUrl = `/accounts/${activeAccountId}`;
  const sourceCount = foundation.sources.reduce((total, source) => total + source.count, 0);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy Foundation"
        title={`${foundation.accountName} strategy source of truth`}
        description="This is the approved account-level foundation VIP should inherit before campaign-specific decisions are added. It composes existing account data without replacing or rewriting the original records."
        primaryAction={{ label: "Manage Account Strategy", href: `${accountWorkspaceUrl}#strategy` }}
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
          href={`${accountWorkspaceUrl}#strategy`}
        />
        <WebsiteMetric
          label="Audiences"
          value={foundation.market.audiences.length}
          description="Active buyer segments available to campaigns."
          dot={foundation.market.audiences.length ? "green" : "red"}
          href={`${accountWorkspaceUrl}#strategy`}
        />
        <WebsiteMetric
          label="Offers"
          value={foundation.market.offers.length}
          description="Active offers available to campaigns."
          dot={foundation.market.offers.length ? "green" : "red"}
          href={`${accountWorkspaceUrl}#strategy`}
        />
        <WebsiteMetric
          label="Source Records"
          value={sourceCount}
          description="Current records contributing to this foundation."
          dot="blue"
        />
      </section>

      {!foundation.readiness.campaignReady || foundation.readiness.missing.length ? (
        <WebsiteSection
          eyebrow="Foundation Gaps"
          title="Complete the missing source-of-truth fields"
          description="VIP can continue using safe fallbacks, but completing these items gives campaign generation stronger, more specific guidance."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {foundation.readiness.missing.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-bold text-amber-950"
              >
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`${accountWorkspaceUrl}#brand-profile`} className={websiteStyles.link}>
              Update Brand Profile →
            </Link>
            <Link href={`${accountWorkspaceUrl}#strategy`} className={websiteStyles.link}>
              Update Services, Audiences, and Offers →
            </Link>
          </div>
        </WebsiteSection>
      ) : null}

      <WebsiteSection
        eyebrow="Approved Foundation"
        title="Business truth and brand expression"
        description="These account-owned facts establish who the business is and how VIP should represent it."
      >
        <div className={websiteStyles.cardGrid}>
          <SummaryCard
            title="Business Truth"
            description="Stable company information that should not be silently overwritten by research or campaign prompts."
          >
            <Fact label="Company" value={foundation.businessTruth.companyName} />
            <Fact label="Website" value={foundation.businessTruth.websiteUrl} />
            <Fact label="Primary CTA" value={foundation.businessTruth.primaryCta} />
            <Fact label="Phone" value={foundation.businessTruth.phone} />
            <Fact
              label="Service Areas"
              value={foundation.businessTruth.serviceAreas.join(", ")}
            />
          </SummaryCard>

          <SummaryCard
            title="Brand Expression"
            description="Voice, visual direction, and explicit rules used to shape audience-facing content."
          >
            <Fact label="Tone" value={foundation.brandExpression.tone} />
            <Fact label="Voice Summary" value={foundation.brandExpression.voiceSummary} />
            <Fact
              label="Brand Colors"
              value={foundation.brandExpression.brandColors.join(", ")}
            />
            <Fact
              label="Approved Hashtags"
              value={foundation.brandExpression.approvedHashtags.join(" ")}
            />
            <Fact label="Brand Notes" value={foundation.brandExpression.notes} />
          </SummaryCard>

          <SummaryCard
            title="Brand Rules"
            description="Active guardrails that generation and quality review should honor."
          >
            {foundation.brandExpression.rules.length ? (
              foundation.brandExpression.rules.map((rule) => (
                <div
                  key={`${rule.category}-${rule.text}`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <WebsiteBadge status={rule.category} />
                    {rule.priority !== null ? (
                      <span className="text-xs font-bold text-slate-500">
                        Priority {rule.priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                    {rule.text}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No active brand rules found.</p>
            )}
          </SummaryCard>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Structured Market Strategy"
        title="What the account sells and who it serves"
        description="These structured records take priority over older comma-separated text when campaign dropdowns and defaults are created."
      >
        <div className={websiteStyles.cardGrid}>
          <SummaryCard
            title="Service Lines"
            description="The active services VIP can build demand around."
          >
            <ItemList
              items={foundation.market.serviceLines.map((item) =>
                [item.name, item.primaryOutcome].filter(Boolean).join(" — "),
              )}
              empty="No structured service lines found."
            />
          </SummaryCard>
          <SummaryCard
            title="Audiences"
            description="The active buyer groups VIP should write for."
          >
            <ItemList
              items={foundation.market.audiences.map((item) =>
                [item.name, item.description].filter(Boolean).join(" — "),
              )}
              empty="No structured audiences found."
            />
          </SummaryCard>
          <SummaryCard
            title="Offers"
            description="The active offers and calls-to-action VIP can promote."
          >
            <ItemList
              items={foundation.market.offers.map((item) =>
                [item.name, item.primaryCta].filter(Boolean).join(" — "),
              )}
              empty="No structured offers found."
            />
          </SummaryCard>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Campaign Inheritance"
        title="Defaults VIP will carry into a new campaign"
        description="Campaign-specific decisions may refine these values, but the builder should start here instead of asking the user to recreate account strategy."
      >
        <div className={websiteStyles.cardGrid}>
          <SummaryCard
            title="Audience and Offer"
            description="The first active structured records are used as safe defaults until a campaign selection is made."
          >
            <Fact label="Default Audience" value={foundation.campaignDefaults.targetAudience} />
            <Fact label="Default Offer" value={foundation.campaignDefaults.primaryOffer} />
            <Fact label="Default CTA" value={foundation.campaignDefaults.callToAction} />
          </SummaryCard>
          <SummaryCard
            title="Voice and Differentiation"
            description="The approved account voice and strongest available outcome guide the campaign angle."
          >
            <Fact label="Tone" value={foundation.campaignDefaults.tone} />
            <Fact
              label="Differentiator"
              value={foundation.campaignDefaults.differentiator}
            />
            <Fact label="Proof Context" value={foundation.campaignDefaults.proofPoints} />
          </SummaryCard>
          <SummaryCard
            title="Business Context"
            description="Private source context supplied to generation without being copied verbatim into public content."
          >
            <Fact label="Foundation Context" value={foundation.campaignDefaults.businessContext} />
          </SummaryCard>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Source Register"
        title="Where this strategy came from"
        description="Every contributing source remains independently editable. The foundation composes them; it does not silently replace them."
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
              <h3 className="mt-4 text-lg font-black text-slate-950">{source.label}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {source.count} contributing record{source.count === 1 ? "" : "s"}
              </p>
            </article>
          ))}
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
