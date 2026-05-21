import { redirect } from "next/navigation";
import { WhatIfPdfActions } from "@/components/what-if-stories/WhatIfPdfActions";
import { WhatIfStoryGeneratorForm } from "@/components/what-if-stories/WhatIfStoryGeneratorForm";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
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

function latestPdfUrlForAsset(exports: Array<Record<string, any>>, assetId: string) {
  const exportRow = exports.find(
    (item) => item.asset_id === assetId && item.export_type === "what_if_pdf" && item.file_url
  );

  return exportRow?.file_url ?? null;
}

export default async function WhatIfStoriesPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: recentData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("asset_type", "prospect_what_if_story")
    .order("created_at", { ascending: false })
    .limit(8);

  const recentStories = (recentData ?? []) as Array<Record<string, any>>;
  const storyIds = recentStories.map((story) => story.id);

  const { data: exportsData } = storyIds.length
    ? await supabase
        .from("asset_exports")
        .select("*")
        .eq("user_id", user.id)
        .in("asset_id", storyIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const exports = (exportsData ?? []) as Array<Record<string, any>>;
  const needsReview = recentStories.filter((story) => story.status === "needs_review").length;
  const approved = recentStories.filter((story) => story.status === "approved").length;
  const pdfCount = exports.filter((item) => item.export_type === "what_if_pdf").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="What-If Success Stories"
        title="Create personalized prospect scenarios and package them as branded PDFs."
        description="Generate the story, review it, render a polished PDF, and prepare a Gmail draft with the PDF attachment URL."
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
          label="Approved"
          value={approved}
          description="Stories ready for outreach or repurposing."
          dot="green"
        />
        <WebsiteMetric
          label="PDF Exports"
          value={pdfCount}
          description="Branded PDF versions created."
          dot="purple"
        />
      </section>

      <div id="generate-story">
        <WhatIfStoryGeneratorForm />
      </div>

      <WebsiteSection
        eyebrow="Recent Output"
        title="Latest What-If Success Stories"
        description="Generate a branded PDF after the story looks good, then prepare Gmail draft copy with the PDF attachment URL."
      >
        {recentStories.length ? (
          <div className={websiteStyles.cardGrid}>
            {recentStories.map((story) => {
              const pdfUrl = latestPdfUrlForAsset(exports, story.id);

              return (
                <article key={story.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap gap-2">
                    <span className={websiteStyles.badge}>{story.status}</span>
                    <span className={websiteStyles.badge}>Version {story.version}</span>
                    {pdfUrl ? <span className={websiteStyles.badge}>PDF ready</span> : null}
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

                  <WhatIfPdfActions assetId={story.id} latestPdfUrl={pdfUrl} />
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
