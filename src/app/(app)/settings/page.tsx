import Link from "next/link";
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

function modeLabel(value: string | null | undefined) {
  return String(value ?? "mark_ready").replaceAll("_", " ");
}

export default async function SettingsPage() {
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
        title="Control VIP’s operating rules."
        description="Manage quality thresholds, approval behavior, brand memory, knowledge, and system setup from one place."
        primaryAction={{ label: "Content Quality", href: "/content-quality" }}
        secondaryAction={{ label: "Approvals", href: "/approvals" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Quality Gates"
          value={settings.is_enabled ? "On" : "Off"}
          description="Controls whether quality thresholds are active."
          dot="blue"
        />
        <WebsiteMetric
          label="Approval Mode"
          value={modeLabel(settings.approval_mode)}
          description="How VIP handles assets that pass thresholds."
          dot="gold"
        />
        <WebsiteMetric
          label="Overall Minimum"
          value={settings.overall_min}
          description="Minimum overall content quality score."
          dot="purple"
        />
        <WebsiteMetric
          label="Human Review"
          value={settings.require_human_approval ? "Required" : "Optional"}
          description="Safety control before true auto-approval."
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Content Quality"
        title="Quality thresholds"
        description="These settings control when VIP considers content ready, needs revision, or eligible for future auto-approval."
      >
        <QualityGateSettingsForm />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Workspace Setup"
        title="Related controls"
        description="The core setup areas that support content quality, publishing, and workspace management."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Brand Voice</h3>
            <p className={websiteStyles.cardText}>
              Control the tone, language, positioning, and style VIP should use when creating content.
            </p>
            <Link href="/brand-voice" className={websiteStyles.link}>
              Open Brand Voice →
            </Link>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Knowledge</h3>
            <p className={websiteStyles.cardText}>
              Manage reusable business facts, services, offers, proof points, and positioning context.
            </p>
            <Link href="/knowledge" className={websiteStyles.link}>
              Open Knowledge →
            </Link>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Quality Review</h3>
            <p className={websiteStyles.cardText}>
              Review active assets, request improved versions, and check quality scores.
            </p>
            <Link href="/content-quality" className={websiteStyles.link}>
              Open Quality Review →
            </Link>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Publish Center</h3>
            <p className={websiteStyles.cardText}>
              Schedule approved content, prepare drafts, and review publishing readiness.
            </p>
            <Link href="/publishing-schedule" className={websiteStyles.link}>
              Open Publish Center →
            </Link>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Accounts</h3>
            <p className={websiteStyles.cardText}>
              Create client workspaces, assign owners, and manage workspace access.
            </p>
            <Link href="/accounts" className={websiteStyles.link}>
              Open Accounts →
            </Link>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Archive</h3>
            <p className={websiteStyles.cardText}>
              Keep completed or deleted work out of active workflows without destroying history.
            </p>
            <Link href="/archive" className={websiteStyles.link}>
              Open Archive →
            </Link>
          </article>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
