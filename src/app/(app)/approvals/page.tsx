import Link from "next/link";
import { redirect } from "next/navigation";
import { ApprovalQualityWidget } from "@/components/approvals/ApprovalQualityWidget";
import { ApprovalStatusActions } from "@/components/approvals/ApprovalStatusActions";
import { ApproveAllVisibleAssetsButton } from "@/components/approvals/ApproveAllVisibleAssetsButton";
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

const REVIEWABLE_TYPES = [
  "facebook_post",
  "linkedin_post",
  "email",
  "gmail_draft",
  "image_prompt",
  "image",
  "video_prompt",
  "video_script",
  "youtube_video",
  "ad_copy",
  "social_post",
  "campaign_asset",
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
];

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function typeLabel(value: string | null | undefined) {
  return String(value ?? "asset").replaceAll("_", " ");
}

export default async function ApprovalsPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ count: needsReviewCount }, { count: approvedCount }, { data: assetsData }] =
    await Promise.all([
      supabase
        .from("generated_assets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("archived_at", null)
        .eq("status", "needs_review"),
      supabase
        .from("generated_assets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("archived_at", null)
        .eq("status", "approved"),
      supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .eq("status", "needs_review")
        .in("asset_type", REVIEWABLE_TYPES)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

  const assets = (assetsData ?? []) as Array<Record<string, any>>;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Approvals"
        title="Review, score, improve, and approve generated assets."
        description="Use quality scoring directly inside the approval flow. Approve strong assets, or request an improved version when the review notes show the content can be better."
        primaryAction={{ label: "Content Quality", href: "/content-quality" }}
        secondaryAction={{ label: "Publishing Ready", href: "/publishing-ready" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Needs Review"
          value={needsReviewCount ?? 0}
          description="Active assets waiting for approval."
          dot="blue"
        />
        <WebsiteMetric
          label="Approved"
          value={approvedCount ?? 0}
          description="Active assets approved for next steps."
          dot="green"
        />
        <WebsiteMetric
          label="Visible Queue"
          value={assets.length}
          description="Reviewable assets shown on this page."
          dot="gold"
        />
        <WebsiteMetric
          label="Quality Layer"
          value="On"
          description="Quality review controls are visible on each card."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Review Queue"
        title="Assets awaiting approval"
        description="Each card now includes a Quality Check panel with Review Quality and Request Improved Version controls."
      >
        <div className={websiteStyles.actionRow}>
          <ApproveAllVisibleAssetsButton disabled={!assets.length} />
          <Link href="/content-quality" className={websiteStyles.link}>
            Open Content Quality →
          </Link>
          <Link href="/phase-two-reporting" className={websiteStyles.link}>
            Open Reporting →
          </Link>
        </div>

        {assets.length ? (
          <div className={websiteStyles.cardGrid}>
            {assets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "needs_review"} />
                  <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                  <span className={websiteStyles.badge}>Version {asset.version ?? 1}</span>
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
                  {String(asset.content ?? "").slice(0, 360)}...
                </p>

                <ApprovalQualityWidget assetId={asset.id} />

                <div className={websiteStyles.actionRow}>
                  <ApprovalStatusActions assetId={asset.id} />
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    Open full asset →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No active assets need review right now.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
