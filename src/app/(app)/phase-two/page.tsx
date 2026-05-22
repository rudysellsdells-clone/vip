import Link from "next/link";
import { redirect } from "next/navigation";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type ModuleCard = {
  title: string;
  href: string;
  status: string;
  description: string;
  nextStep: string;
};

const modules: ModuleCard[] = [
  {
    title: "Strategic Content Calendar",
    href: "/content-calendar",
    status: "working",
    description:
      "Plan the month, create weekly campaign themes, and generate planned content items.",
    nextStep: "Use it at the beginning of each month.",
  },
  {
    title: "Authority Content Library",
    href: "/authority-content",
    status: "working",
    description:
      "Generate blog posts, white papers, and authority assets that flow into approvals.",
    nextStep: "Use it for cornerstone content and sales enablement.",
  },
  {
    title: "Content Repurposing",
    href: "/content-repurposing",
    status: "working",
    description:
      "Turn approved authority content into LinkedIn, Facebook, email, and video assets.",
    nextStep: "Use it after creating strong long-form content.",
  },
  {
    title: "What-If Success Stories",
    href: "/what-if-stories",
    status: "working",
    description:
      "Create personalized prospect scenarios, branded PDFs, and Gmail drafts with PDF attachments.",
    nextStep: "Use it for high-value prospect outreach.",
  },
  {
    title: "Publishing Ready",
    href: "/publishing-ready",
    status: "working",
    description:
      "Execute approved social, email, and video assets with tracking and duplicate prevention.",
    nextStep: "Use it after assets are approved.",
  },
  {
    title: "Approvals",
    href: "/approvals",
    status: "core",
    description:
      "The review layer for all generated and repurposed Phase Two content.",
    nextStep: "Keep this as the quality control gate.",
  },
];

const parkedItems = [
  "What-If Gmail draft visibility inside the older Recent Zapier Actions screen",
  "Prospect-specific What-If wiring/button",
  "LinkedIn and Facebook exact Zapier action key confirmation",
  "GalaxyAI direct execution from Publishing Ready",
];

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-US");
}

export default async function PhaseTwoPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ count: calendarCount }, { count: authorityCount }, { count: whatIfCount }, { count: publishRunCount }] =
    await Promise.all([
      supabase
        .from("content_calendar_plans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("generated_assets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("asset_type", ["blog_post", "white_paper", "authority_asset"]),
      supabase
        .from("generated_assets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("asset_type", "prospect_what_if_story"),
      supabase
        .from("publishing_execution_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const { data: recentAssetsData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .in("asset_type", [
      "blog_post",
      "white_paper",
      "authority_asset",
      "prospect_what_if_story",
      "linkedin_post",
      "facebook_post",
      "email",
      "video_script",
    ])
    .order("created_at", { ascending: false })
    .limit(8);

  const recentAssets = (recentAssetsData ?? []) as Array<Record<string, any>>;
  const needsReview = recentAssets.filter((asset) => asset.status === "needs_review").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Phase Two"
        title="Authority, prospecting, repurposing, and execution."
        description="This hub keeps the new Phase Two tools organized so the product feels like one connected operating system instead of a collection of separate features."
        primaryAction={{ label: "Plan Content", href: "/content-calendar" }}
        secondaryAction={{ label: "Publishing Ready", href: "/publishing-ready" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Calendar Plans"
          value={formatNumber(calendarCount)}
          description="Monthly strategic content plans."
          dot="blue"
        />
        <WebsiteMetric
          label="Authority Assets"
          value={formatNumber(authorityCount)}
          description="Blogs, white papers, and guides."
          dot="gold"
        />
        <WebsiteMetric
          label="What-If Stories"
          value={formatNumber(whatIfCount)}
          description="Personalized prospect scenarios."
          dot="purple"
        />
        <WebsiteMetric
          label="Execution Runs"
          value={formatNumber(publishRunCount)}
          description="Publishing readiness records."
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Operating Flow"
        title="Phase Two workflow"
        description="The intended path is simple: plan, create, repurpose, review, approve, and execute."
      >
        <div className={websiteStyles.cardGrid}>
          {[
            ["1", "Plan", "Create the monthly strategy and weekly campaigns."],
            ["2", "Create", "Generate authority content and What-If Stories."],
            ["3", "Repurpose", "Turn strong content into channel-specific assets."],
            ["4", "Review", "Use approvals as the quality gate."],
            ["5", "Execute", "Use Publishing Ready for approved assets."],
            ["6", "Learn", "Track what was created, approved, drafted, and executed."],
          ].map(([step, title, description]) => (
            <article key={step} className={websiteStyles.card}>
              <div className="flex flex-wrap gap-2">
                <span className={websiteStyles.badge}>Step {step}</span>
              </div>
              <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                {title}
              </h3>
              <p className={websiteStyles.cardText}>{description}</p>
            </article>
          ))}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Modules"
        title="Phase Two tools"
        description="Use this as the control center for the tools added during Phase Two."
      >
        <div className={websiteStyles.cardGrid}>
          {modules.map((module) => (
            <article key={module.href} className={websiteStyles.card}>
              <div className="flex flex-wrap gap-2">
                <WebsiteBadge status={module.status} />
              </div>

              <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                <Link href={module.href} className={websiteStyles.link}>
                  {module.title}
                </Link>
              </h3>

              <p className={websiteStyles.cardText}>{module.description}</p>

              <p className={websiteStyles.cardMeta}>
                <strong>Next:</strong> {module.nextStep}
              </p>

              <Link href={module.href} className={websiteStyles.link}>
                Open {module.title} →
              </Link>
            </article>
          ))}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent Work"
        title="Recent Phase Two assets"
        description="A quick look at the latest content created by Phase Two workflows."
      >
        {recentAssets.length ? (
          <div className={websiteStyles.cardGrid}>
            {recentAssets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "needs_review"} />
                  <span className={websiteStyles.badge}>
                    {String(asset.asset_type ?? "asset").replaceAll("_", " ")}
                  </span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    {asset.title}
                  </Link>
                </h3>

                <p className={websiteStyles.cardText}>
                  {String(asset.content ?? "").slice(0, 220)}...
                </p>

                <div className={websiteStyles.actionRow}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    Open asset →
                  </Link>
                  {asset.status === "needs_review" ? (
                    <Link href="/approvals" className={websiteStyles.link}>
                      Review →
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No Phase Two assets yet. Start with the Strategic Content Calendar or Authority Content Library.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Parked"
        title="Known review items"
        description="These are intentionally parked so they do not distract from the working core."
      >
        <div className={websiteStyles.card}>
          <div className="grid gap-3">
            {parkedItems.map((item) => (
              <p key={item} className={websiteStyles.cardText}>
                • {item}
              </p>
            ))}
          </div>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
