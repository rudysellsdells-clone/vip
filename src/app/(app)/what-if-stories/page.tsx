import { redirect } from "next/navigation";
import { ExecuteGmailDraftWithPdfForm } from "@/components/what-if-stories/ExecuteGmailDraftWithPdfForm";
import { WhatIfPdfActions } from "@/components/what-if-stories/WhatIfPdfActions";
import { WhatIfStoryGeneratorForm } from "@/components/what-if-stories/WhatIfStoryGeneratorForm";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function latestExportForAsset(
  exports: Array<Record<string, any>>,
  assetId: string,
  exportType: string
) {
  return exports.find(
    (item) => item.asset_id === assetId && item.export_type === exportType
  ) ?? null;
}

export default async function WhatIfStoriesPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

  if (!workspace) {
    redirect("/accounts");
  }

  const activeWorkspace = workspace!;

  const { data: recentData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .eq("asset_type", "prospect_what_if_story")
    .order("created_at", { ascending: false })
    .limit(8);

  const recentStories = (recentData ?? []) as Array<Record<string, any>>;
  const storyIds = recentStories.map((story) => story.id);

  const { data: exportsData } = storyIds.length
    ? await supabase
        .from("asset_exports")
        .select("*")
        .eq("account_id", activeWorkspace.activeAccountId)
        .in("asset_id", storyIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const exports = (exportsData ?? []) as Array<Record<string, any>>;
  const needsReview = recentStories.filter((story) => story.status === "needs_review").length;
  const approved = recentStories.filter((story) => story.status === "approved").length;
  const pdfCount = exports.filter((item) => item.export_type === "what_if_pdf").length;
  const completedDrafts = exports.filter(
    (item) => item.export_type === "gmail_draft_with_pdf" && item.status === "completed"
  ).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`What-If Success Stories • ${activeWorkspace.activeAccountName}`}
        title="Create personalized scenarios, package them as PDFs, and draft the outreach."
        description="Generate the story, render a polished PDF, prepare the email, and create a Gmail draft through Zapier without sending it."
        primaryAction={{ label: "Generate Story", href: "#generate-story" }}
        secondaryAction={{ label: "Review Assets", href: "/approvals" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Recent Stories"
          value={recentStories.length}
          description="Latest personalized What-If assets."
          dot="blue"
        />
        <WebsiteMetric
          label="Needs Review"
          value={needsReview}
          description="Generated stories waiting for approval."
          dot="gold"
        />
        <WebsiteMetric
          label="PDF Exports"
          value={pdfCount}
          description="Branded PDF versions created."
          dot="purple"
        />
        <WebsiteMetric
          label="Gmail Drafts"
          value={completedDrafts}
          description="Drafts created through Zapier."
          dot="green"
        />
      </section>

      <div id="generate-story">
        <WhatIfStoryGeneratorForm />
      </div>

      <WebsiteSection
        eyebrow="Recent Output"
        title="Latest What-If Success Stories"
        description="Generate a branded PDF, prepare Gmail draft copy, then create the draft through Zapier when ready."
      >
        {recentStories.length ? (
          <div className={websiteStyles.cardGrid}>
            {recentStories.map((story) => {
              const latestPdf = latestExportForAsset(exports, story.id, "what_if_pdf");
              const latestDraftPrep = latestExportForAsset(
                exports,
                story.id,
                "gmail_draft_with_pdf"
              );

              return (
                <article key={story.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap gap-2">
                    <span className={websiteStyles.badge}>{story.status}</span>
                    <span className={websiteStyles.badge}>Version {story.version}</span>
                    {latestPdf?.file_url ? <span className={websiteStyles.badge}>PDF ready</span> : null}
                    {latestDraftPrep ? (
                      <span className={websiteStyles.badge}>
                        Draft {latestDraftPrep.status}
                      </span>
                    ) : null}
                  </div>

                  <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                    <a href={`/assets/${story.id}`} className={websiteStyles.link}>
                      {story.title}
                    </a>
                  </h3>

                  <p className={websiteStyles.cardMeta}>
                    Created {formatDate(story.created_at)}
                  </p>

                  <p className={websiteStyles.cardText}>
                    {String(story.content ?? "").slice(0, 240)}...
                  </p>

                  <WhatIfPdfActions assetId={story.id} latestPdfUrl={latestPdf?.file_url ?? null} />

                  {latestDraftPrep ? (
                    <ExecuteGmailDraftWithPdfForm
                      exportId={latestDraftPrep.id}
                      disabled={!latestDraftPrep.file_url}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No What-If Stories generated yet. Create the first one above.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
