import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthorityContentGeneratorForm } from "@/components/authority-content/AuthorityContentGeneratorForm";
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

const AUTHORITY_TYPES = ["blog_post", "white_paper", "authority_asset"];

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function typeLabel(value: string | null | undefined) {
  return String(value ?? "content").replaceAll("_", " ");
}

export default async function AuthorityContentPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: assetsData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .in("asset_type", AUTHORITY_TYPES)
    .order("created_at", { ascending: false })
    .limit(24);

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const blogCount = assets.filter((asset) => asset.asset_type === "blog_post").length;
  const whitePaperCount = assets.filter((asset) => asset.asset_type === "white_paper").length;
  const needsReview = assets.filter((asset) => asset.status === "needs_review").length;
  const approved = assets.filter((asset) => asset.status === "approved").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Authority Content Library"
        title="Create blogs, white papers, and strategic authority assets."
        description="Generate useful long-form content that builds trust, supports sales, feeds the monthly calendar, and moves through the normal approval workflow."
        primaryAction={{ label: "Generate Content", href: "#generate-authority-content" }}
        secondaryAction={{ label: "Review Assets", href: "/approvals" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Recent Assets"
          value={assets.length}
          description="Authority content created recently."
          dot="blue"
        />
        <WebsiteMetric
          label="Blog Posts"
          value={blogCount}
          description="Long-form website content."
          dot="gold"
        />
        <WebsiteMetric
          label="White Papers"
          value={whitePaperCount}
          description="Lead magnets and sales enablement."
          dot="purple"
        />
        <WebsiteMetric
          label="Needs Review"
          value={needsReview}
          description="Ready for review, revision, and approval."
          dot="green"
        />
      </section>

      <div id="generate-authority-content">
        <AuthorityContentGeneratorForm />
      </div>

      <WebsiteSection
        eyebrow="Library"
        title="Recent authority content"
        description="Open any asset to review, revise, approve, and repurpose."
      >
        {assets.length ? (
          <div className={websiteStyles.cardGrid}>
            {assets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "needs_review"} />
                  <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                  <span className={websiteStyles.badge}>Version {asset.version}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    {asset.title}
                  </Link>
                </h3>

                <p className={websiteStyles.cardMeta}>
                  Created {formatDate(asset.created_at)}
                </p>

                <p className={websiteStyles.cardText}>
                  {String(asset.content ?? "").slice(0, 260)}...
                </p>

                <div className={websiteStyles.actionRow}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    Open asset →
                  </Link>
                  <Link href="/approvals" className={websiteStyles.link}>
                    Review queue →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No authority content yet. Generate the first blog post, white paper, or authority asset above.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
