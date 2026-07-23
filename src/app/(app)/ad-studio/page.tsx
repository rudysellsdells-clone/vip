import { notFound } from "next/navigation";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { isAdStudioEnabled } from "@/lib/ad-studio/feature";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export const dynamic = "force-dynamic";

const packageTypes = [
  {
    title: "Google Search Ads",
    description:
      "Responsive search ad headlines, descriptions, keyword themes, negative-keyword guidance, extensions, landing-page alignment, and tracked URLs.",
    status: "Foundation ready",
  },
  {
    title: "Paid Social Ads",
    description:
      "Channel-specific primary text, headlines, calls to action, audience framing, creative direction, and platform-ready variants.",
    status: "Foundation ready",
  },
  {
    title: "Review and Export",
    description:
      "Ad scoring, policy and brand checks, approval states, UTM validation, and export packages that reuse the existing Marketing VIP review system.",
    status: "Foundation ready",
  },
] as const;

export default async function AdStudioPage() {
  if (!isAdStudioEnabled()) notFound();

  const { accountName } = await requireStrategyWorkspace();

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Create • Ad Studio"
        title={`Advertising workspace for ${accountName}`}
        description="Turn approved strategy, research, audiences, offers, proof, and campaign decisions into channel-ready advertising packages without creating another disconnected content system."
        primaryAction={{ label: "Open Campaigns", href: "/campaigns" }}
        secondaryAction={{ label: "Review Strategy", href: "/strategy" }}
      />

      <WebsiteSection
        eyebrow="Release B"
        title="Ad Studio foundation"
        description="The workspace boundary is active on the H1.17 preview branch. Generation, scoring, approvals, exports, and campaign handoff will be added in controlled commits."
      >
        <div className={websiteStyles.metricGrid}>
          <WebsiteMetric
            label="Package types"
            value="2"
            description="Google Search and Paid Social are the first supported advertising packages."
            dot="blue"
          />
          <WebsiteMetric
            label="Strategy source"
            value="Approved"
            description="Ads will inherit the campaign Marketing Spine and approved Market Intelligence."
            dot="green"
          />
          <WebsiteMetric
            label="Attribution"
            value="UTM ready"
            description="Existing paid-social, CPC, display, campaign, content, and destination rules will be reused."
            dot="purple"
          />
          <WebsiteMetric
            label="Publishing"
            value="Approval gated"
            description="No ad package will bypass existing review and explicit approval safeguards."
            dot="gold"
          />
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Planned workflow"
        title="One advertising system, not another content silo"
        description="Each package will remain connected to the account, campaign, strategy snapshot, research evidence, destination, attribution settings, and approval history."
      >
        <div className={websiteStyles.cardGrid}>
          {packageTypes.map((item) => (
            <article key={item.title} className={websiteStyles.card}>
              <p className={websiteStyles.sectionEyebrow}>{item.status}</p>
              <h3 className={websiteStyles.cardTitle}>{item.title}</h3>
              <p className={websiteStyles.cardDescription}>{item.description}</p>
            </article>
          ))}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Safety boundary"
        title="What this first slice intentionally does not do"
        description="This foundation does not generate ads, write database records, publish to advertising platforms, or expose unfinished APIs. Those capabilities remain unavailable until their acceptance checks pass."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-black text-slate-950">Reused foundations</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Strategy Foundation, Market Intelligence, campaign snapshots, generated assets, quality review, approvals, publishing history, analytics, and UTM taxonomy.
            </p>
          </div>
          <div className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-black text-slate-950">Next implementation commit</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Define the canonical ad-package contract and campaign handoff so Search and Paid Social variants share one stable data model.
            </p>
          </div>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
