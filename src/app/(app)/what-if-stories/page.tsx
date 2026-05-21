import { redirect } from "next/navigation";
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
  const needsReview = recentStories.filter((story) => story.status === "needs_review").length;
  const approved = recentStories.filter((story) => story.status === "approved").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="What-If Success Stories"
        title="Create personalized prospect scenarios that open sales conversations."
        description="Turn a prospect's likely pain point into a clear, honest what-if scenario showing how Web Search Pros could help them build visibility, authority, follow-up, and growth."
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
          label="Guardrail"
          value="Scenario"
          description="Clearly hypothetical, never fake proof."
          dot="purple"
        />
      </section>

      <div id="generate-story">
        <WhatIfStoryGeneratorForm />
      </div>

      <WebsiteSection
        eyebrow="Recent Output"
        title="Latest What-If Success Stories"
        description="Generated stories flow through the same review and approval system as the rest of VIP."
      >
        {recentStories.length ? (
          <div className={websiteStyles.cardGrid}>
            {recentStories.map((story) => (
              <article key={story.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <span className={websiteStyles.badge}>{story.status}</span>
                  <span className={websiteStyles.badge}>Version {story.version}</span>
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
              </article>
            ))}
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
