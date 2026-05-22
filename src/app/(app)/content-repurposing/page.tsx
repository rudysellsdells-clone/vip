import Link from "next/link";
import { redirect } from "next/navigation";
import { RepurposeAssetButton } from "@/components/content-repurposing/RepurposeAssetButton";
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

const SOURCE_TYPES = ["blog_post", "white_paper", "authority_asset", "prospect_what_if_story"];
const REPURPOSED_TYPES = ["linkedin_post", "facebook_post", "email", "video_script"];

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

export default async function ContentRepurposingPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sourceData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .in("asset_type", SOURCE_TYPES)
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: repurposedData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .in("asset_type", REPURPOSED_TYPES)
    .ilike("content", "%Source asset ID:%")
    .order("created_at", { ascending: false })
    .limit(16);

  const sources = (sourceData ?? []) as Array<Record<string, any>>;
  const repurposed = (repurposedData ?? []) as Array<Record<string, any>>;
  const needsReview = repurposed.filter((asset) => asset.status === "needs_review").length;
  const approved = repurposed.filter((asset) => asset.status === "approved").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Content Repurposing"
        title="Turn authority content into channel-ready assets."
        description="Repurpose blog posts, white papers, authority assets, and What-If Stories into LinkedIn posts, Facebook posts, email teasers, and short video prompts."
        primaryAction={{ label: "Authority Content", href: "/authority-content" }}
        secondaryAction={{ label: "Review Assets", href: "/approvals" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Source Assets"
          value={sources.length}
          description="Recent assets available for repurposing."
          dot="blue"
        />
        <WebsiteMetric
          label="Repurposed"
          value={repurposed.length}
          description="Recent channel-ready outputs."
          dot="gold"
        />
        <WebsiteMetric
          label="Needs Review"
          value={needsReview}
          description="Repurposed assets waiting for approval."
          dot="purple"
        />
        <WebsiteMetric
          label="Approved"
          value={approved}
          description="Repurposed assets ready for use."
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Source Content"
        title="Choose content to repurpose"
        description="One click creates a LinkedIn post, Facebook post, email teaser, and video prompt from the selected asset."
      >
        {sources.length ? (
          <div className={websiteStyles.cardGrid}>
            {sources.map((asset) => (
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
                  {String(asset.content ?? "").slice(0, 240)}...
                </p>

                <div className={websiteStyles.actionRow}>
                  <RepurposeAssetButton assetId={asset.id} />
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    Open source →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No source assets found yet. Generate a blog post, white paper, authority asset, or What-If Story first.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent Output"
        title="Recent repurposed assets"
        description="Repurposed content goes to the review queue before publishing or outreach."
      >
        {repurposed.length ? (
          <div className={websiteStyles.cardGrid}>
            {repurposed.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "needs_review"} />
                  <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
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
                  {String(asset.content ?? "").slice(0, 220)}...
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
            No repurposed assets yet.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
