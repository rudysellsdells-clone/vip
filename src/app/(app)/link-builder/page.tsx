import Link from "next/link";
import { redirect } from "next/navigation";
import { BacklinkVerifyForm } from "@/components/link-builder/BacklinkVerifyForm";
import { DirectoryOpportunityActions } from "@/components/link-builder/DirectoryOpportunityActions";
import { DirectoryOpportunityForm } from "@/components/link-builder/DirectoryOpportunityForm";
import { DirectoryProfileForm } from "@/components/link-builder/DirectoryProfileForm";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";

type DirectoryProfile = {
  id: string;
  profile_name: string | null;
  business_name: string | null;
  website_url: string | null;
  business_email: string | null;
  phone: string | null;
  address: string | null;
  service_area: string | null;
  logo_url: string | null;
  short_description: string | null;
  long_description: string | null;
  categories: string[] | null;
  services: string[] | null;
  social_links: Record<string, string> | null;
  anchor_text_options: string[] | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type DirectoryOpportunity = {
  id: string;
  domain: string;
  url: string;
  submit_url: string | null;
  directory_name: string | null;
  directory_type: string | null;
  category: string | null;
  relevance_score: number | null;
  quality_score: number | null;
  risk_score: number | null;
  ai_summary: string | null;
  status: string | null;
  updated_at: string | null;
};

type DirectorySubmission = {
  id: string;
  prepared_title: string | null;
  prepared_description: string | null;
  prepared_category: string | null;
  submission_url: string | null;
  status: string | null;
  updated_at: string | null;
};

type AcquiredBacklink = {
  id: string;
  source_domain: string;
  source_url: string;
  target_url: string;
  link_type: string | null;
  status: string | null;
  last_checked_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function scoreLabel(value: unknown) {
  const score = Number(value ?? 0);

  if (score >= 70) return "Strong";
  if (score >= 45) return "Review";
  return "Weak";
}

export default async function LinkBuilderPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, opportunitiesResult, submissionsResult, backlinksResult] =
    await Promise.all([
      supabase
        .from("directory_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("directory_opportunities")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50),

      supabase
        .from("directory_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50),

      supabase
        .from("acquired_backlinks")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

  const profile = (profileResult.data ?? null) as DirectoryProfile | null;
  const opportunities = (opportunitiesResult.data ?? []) as DirectoryOpportunity[];
  const submissions = (submissionsResult.data ?? []) as DirectorySubmission[];
  const backlinks = (backlinksResult.data ?? []) as AcquiredBacklink[];

  const qualified = opportunities.filter((item) => item.status === "qualified").length;
  const approved = opportunities.filter((item) => item.status === "approved").length;
  const liveLinks = backlinks.filter((item) => item.status === "live").length;
  const pendingSubmissions = submissions.filter((item) =>
    ["ready_for_review", "approved", "submitted", "pending_review", "needs_follow_up"].includes(String(item.status))
  ).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Directory Link Builder"
        title="Build legitimate directory backlinks with a controlled workflow."
        description="Find relevant directories, prepare submission copy, track statuses, and verify live backlinks without turning VIP into a spam bot."
        primaryAction={{ label: "Add Opportunity", href: "#add-opportunity" }}
        secondaryAction={{ label: "Verify Backlink", href: "#verify-backlink" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Opportunities"
          value={opportunities.length}
          description="Directories and listing pages in review."
          dot="blue"
        />
        <WebsiteMetric
          label="Qualified"
          value={qualified}
          description="Good candidates for submission."
          dot="gold"
        />
        <WebsiteMetric
          label="Approved"
          value={approved}
          description="Approved opportunities ready for submission prep."
          dot="purple"
        />
        <WebsiteMetric
          label="Live Links"
          value={liveLinks}
          description="Verified backlinks recorded."
          dot="green"
        />
      </section>

      <section className={websiteStyles.twoColumn}>
        <div id="profile">
          <DirectoryProfileForm profile={profile} />
        </div>

        <div id="add-opportunity">
          <DirectoryOpportunityForm />
        </div>
      </section>

      <WebsiteSection
        eyebrow="Opportunity Queue"
        title="Directory opportunities"
        description="Review each opportunity, score it, and prepare a submission when it looks legitimate."
      >
        {opportunities.length ? (
          <div className={websiteStyles.cardGrid}>
            {opportunities.map((opportunity) => (
              <article key={opportunity.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={opportunity.status ?? "unknown"} />
                  <span className={websiteStyles.badge}>{opportunity.directory_type ?? "general"}</span>
                  <span className={websiteStyles.badge}>
                    Relevance: {opportunity.relevance_score ?? 0} / {scoreLabel(opportunity.relevance_score)}
                  </span>
                  <span className={websiteStyles.badge}>
                    Risk: {opportunity.risk_score ?? 0}
                  </span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {opportunity.directory_name ?? opportunity.domain}
                </h3>

                <p className={websiteStyles.cardMeta}>
                  {opportunity.domain} • Updated {formatDate(opportunity.updated_at)}
                </p>

                {opportunity.ai_summary ? (
                  <p className={websiteStyles.cardText}>{opportunity.ai_summary}</p>
                ) : null}

                <p className={websiteStyles.cardText}>
                  <Link href={opportunity.url} className={websiteStyles.link}>
                    Open directory →
                  </Link>
                  {opportunity.submit_url ? (
                    <>
                      {" "}
                      <Link href={opportunity.submit_url} className={websiteStyles.link}>
                        Open submit page →
                      </Link>
                    </>
                  ) : null}
                </p>

                <DirectoryOpportunityActions opportunityId={opportunity.id} />
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No directory opportunities yet. Add the first one above.
          </div>
        )}
      </WebsiteSection>

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Submissions"
          title="Prepared submissions"
          description="Prepared listings created from approved opportunities and the directory profile."
        >
          {submissions.length ? (
            <div className={websiteStyles.cardGrid}>
              {submissions.map((submission) => (
                <article key={submission.id} className={websiteStyles.card}>
                  <WebsiteBadge status={submission.status ?? "unknown"} />
                  <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                    {submission.prepared_title ?? "Directory submission"}
                  </h3>
                  <p className={websiteStyles.cardMeta}>
                    {submission.prepared_category ?? "No category"} • Updated {formatDate(submission.updated_at)}
                  </p>
                  <p className={websiteStyles.cardText}>
                    {submission.prepared_description || "No prepared description yet."}
                  </p>
                  {submission.submission_url ? (
                    <Link href={submission.submission_url} className={websiteStyles.link}>
                      Open submission page →
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className={websiteStyles.empty}>
              No submissions prepared yet. Approve a directory opportunity to create one.
            </div>
          )}
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Backlinks"
          title="Acquired backlinks"
          description="Live or checked backlinks from directory submissions."
        >
          {backlinks.length ? (
            <div className={websiteStyles.cardGrid}>
              {backlinks.map((backlink) => (
                <article key={backlink.id} className={websiteStyles.card}>
                  <WebsiteBadge status={backlink.status ?? "unknown"} />
                  <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                    {backlink.source_domain}
                  </h3>
                  <p className={websiteStyles.cardMeta}>
                    {backlink.link_type ?? "unknown"} • Checked {formatDate(backlink.last_checked_at)}
                  </p>
                  <p className={websiteStyles.cardText}>
                    Target: {backlink.target_url}
                  </p>
                  <Link href={backlink.source_url} className={websiteStyles.link}>
                    Open source page →
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={websiteStyles.empty}>
              No backlinks recorded yet.
            </div>
          )}
        </WebsiteSection>
      </section>

      <div id="verify-backlink">
        <BacklinkVerifyForm targetUrl={profile?.website_url ?? "https://web-search-pros.com"} />
      </div>
    </WebsitePage>
  );
}
