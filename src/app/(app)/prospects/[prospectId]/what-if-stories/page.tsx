import { redirect } from "next/navigation";
import { GenerateProspectWhatIfStoryButton } from "@/components/prospects/GenerateProspectWhatIfStoryButton";
import { ProspectWhatIfStoriesPanel } from "@/components/prospects/ProspectWhatIfStoriesPanel";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { normalizeProspect } from "@/lib/prospects/normalizer";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  params: Promise<{
    prospectId: string;
  }>;
};

export default async function ProspectWhatIfStoriesPage({ params }: PageProps) {
  const { prospectId } = await params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: prospectRow, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .eq("user_id", user.id)
    .single();

  if (error || !prospectRow) {
    redirect("/prospects");
  }

  const prospect = normalizeProspect(prospectRow);

  const { data: linksData } = await supabase
    .from("prospect_asset_links")
    .select("*")
    .eq("user_id", user.id)
    .eq("prospect_id", prospectId)
    .eq("relationship_type", "what_if_story");

  const linkedCount = (linksData ?? []).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Prospect What-If Stories"
        title={prospect.businessName}
        description="Generate and manage personalized What-If Success Stories tied directly to this prospect."
        primaryAction={{ label: "Back to Prospects", href: "/prospects" }}
        secondaryAction={{ label: "All What-If Stories", href: "/what-if-stories" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Prospect"
          value={prospect.prospectName || "Unknown"}
          description="Primary contact or prospect name."
          dot="blue"
        />
        <WebsiteMetric
          label="Industry"
          value={prospect.industry || "Unknown"}
          description="Used for personalization."
          dot="gold"
        />
        <WebsiteMetric
          label="Location"
          value={prospect.location || "Unknown"}
          description="Market context."
          dot="purple"
        />
        <WebsiteMetric
          label="Linked Stories"
          value={linkedCount}
          description="What-If Stories tied to this prospect."
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Generate"
        title="Create a prospect-specific What-If Story"
        description="VIP will use the prospect record to create a personalized strategic scenario and send it to the approvals queue."
      >
        <article className={websiteStyles.card}>
          <h3 className={websiteStyles.cardTitle}>Prospect context</h3>
          <p className={websiteStyles.cardText}>
            <strong>Website:</strong> {prospect.websiteUrl || "Not provided"}
          </p>
          <p className={websiteStyles.cardText}>
            <strong>Current situation:</strong> {prospect.currentSituation}
          </p>
          <p className={websiteStyles.cardText}>
            <strong>Pain point:</strong> {prospect.painPoint}
          </p>
          <p className={websiteStyles.cardText}>
            <strong>Opportunity:</strong> {prospect.opportunity}
          </p>

          <div className={websiteStyles.actionRow}>
            <GenerateProspectWhatIfStoryButton prospectId={prospectId} />
          </div>
        </article>
      </WebsiteSection>

      <ProspectWhatIfStoriesPanel prospectId={prospectId} />
    </WebsitePage>
  );
}
