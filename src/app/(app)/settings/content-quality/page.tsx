import { redirect } from "next/navigation";
import { QualityGateSettingsForm } from "@/components/content-quality/QualityGateSettingsForm";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getOrCreateQualityGateSettings } from "@/lib/content-quality/quality-gates";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export default async function ContentQualitySettingsPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const settings = await getOrCreateQualityGateSettings({
    supabase,
    userId: user.id,
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Settings"
        title="Content quality thresholds"
        description="Control the thresholds VIP uses when deciding whether content is ready for publishing, needs revision, or can eventually be auto-approved."
        primaryAction={{ label: "Content Quality", href: "/content-quality" }}
        secondaryAction={{ label: "Approvals", href: "/approvals" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Overall"
          value={settings.overall_min}
          description="Minimum overall score."
          dot="blue"
        />
        <WebsiteMetric
          label="Brand"
          value={settings.brand_voice_min}
          description="Minimum brand voice score."
          dot="gold"
        />
        <WebsiteMetric
          label="CTA"
          value={settings.cta_min}
          description="Minimum CTA strength score."
          dot="purple"
        />
        <WebsiteMetric
          label="Mode"
          value={String(settings.approval_mode).replaceAll("_", " ")}
          description="Current quality gate mode."
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Thresholds"
        title="Editable quality gates"
        description="Keep these strict while the system is learning. Later, once the output is consistently strong, you can lower friction or enable auto-approval."
      >
        <QualityGateSettingsForm />
      </WebsiteSection>
    </WebsitePage>
  );
}
