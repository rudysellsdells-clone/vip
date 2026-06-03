import Link from "next/link";
import { redirect } from "next/navigation";
import { ReadyAssetActions } from "@/components/ready-for-publishing/ReadyAssetActions";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import {
  channelForAssetType,
  nextStepForAsset,
  PUBLISHABLE_READY_ASSET_TYPES,
  READY_FOR_PUBLISHING_DECISIONS,
  readyDecisionLabel,
} from "@/lib/publishing/ready-routing";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type AssetRow = Record<string, any>;
type DecisionRow = Record<string, any>;

type ReadyRow = {
  decision: DecisionRow;
  asset: AssetRow;
};

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

function scoreFromDecision(decision: DecisionRow) {
  const snapshot = decision.score_snapshot ?? {};
  const score = snapshot.overall_score;

  if (score === null || score === undefined) return "N/A";

  return `${score}/100`;
}

function scoreBreakdown(decision: DecisionRow) {
  const score = decision.score_snapshot ?? {};

  return [
    `Brand ${score.brand_voice_score ?? "—"}`,
    `Clarity ${score.clarity_score ?? "—"}`,
    `CTA ${score.cta_score ?? "—"}`,
    `SEO/AIO ${score.seo_aio_score ?? "—"}`,
    `Conversion ${score.conversion_score ?? "—"}`,
  ].join(" • ");
}

function hasAsset(row: {
  decision: DecisionRow;
  asset: AssetRow | undefined;
}): row is ReadyRow {
  return Boolean(row.asset);
}

export default async function ReadyForPublishingPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: decisionsData } = await supabase
    .from("quality_gate_decisions")
    .select("*")
    .eq("user_id", user.id)
    .eq("passed", true)
    .in("decision", READY_FOR_PUBLISHING_DECISIONS)
    .order("created_at", { ascending: false })
    .limit(100);

  const decisions = (decisionsData ?? []) as DecisionRow[];
  const latestDecisionByAssetId = new Map<string, DecisionRow>();

  for (const decision of decisions) {
    if (decision.asset_id && !latestDecisionByAssetId.has(decision.asset_id)) {
      latestDecisionByAssetId.set(decision.asset_id, decision);
    }
  }

  const latestDecisions = Array.from(latestDecisionByAssetId.values());
  const assetIds = latestDecisions.map((decision) => decision.asset_id).filter(Boolean);

  const { data: assetsData } = assetIds.length
    ? await supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .in("id", assetIds)
        .in("asset_type", PUBLISHABLE_READY_ASSET_TYPES)
    : { data: [] };

  const assets = (assetsData ?? []) as AssetRow[];
  const assetById = new Map<string, AssetRow>(
    assets.map((asset) => [String(asset.id), asset])
  );

  const readyRows: ReadyRow[] = latestDecisions
    .map((decision) => ({
      decision,
      asset: assetById.get(String(decision.asset_id)),
    }))
    .filter(hasAsset);

  const approvedRows = readyRows.filter((row) => row.asset.status === "approved");
  const waitingApprovalRows = readyRows.filter((row) => row.asset.status !== "approved");
  const socialRows = readyRows.filter((row) =>
    ["linkedin_post", "facebook_post", "email", "video_script"].includes(row.asset.asset_type)
  );

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Ready for Publishing"
        title="Quality-approved assets waiting for the next move."
        description="This queue shows active assets that passed your editable quality thresholds. Approve them, route them to Publishing Ready, repurpose them, or open the asset for final review."
        primaryAction={{ label: "Approvals", href: "/approvals" }}
        secondaryAction={{ label: "Publishing Ready", href: "/publishing-ready" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Ready Assets"
          value={readyRows.length}
          description="Active assets that passed quality gates."
          dot="blue"
        />
        <WebsiteMetric
          label="Awaiting Approval"
          value={waitingApprovalRows.length}
          description="Passed quality but not approved yet."
          dot="gold"
        />
        <WebsiteMetric
          label="Approved"
          value={approvedRows.length}
          description="Ready to execute or use."
          dot="green"
        />
        <WebsiteMetric
          label="Execution Candidates"
          value={socialRows.length}
          description="Social, email, or video assets for Publishing Ready."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Queue"
        title="Assets that passed the quality gate"
        description="Passing a quality gate does not automatically publish. This queue gives the final human-controlled step before execution."
      >
        {readyRows.length ? (
          <div className={websiteStyles.cardGrid}>
            {readyRows.map(({ asset, decision }) => (
              <article key={decision.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "needs_review"} />
                  <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                  <span className={websiteStyles.badge}>
                    Gate: {readyDecisionLabel(decision.decision)}
                  </span>
                  <span className={websiteStyles.badge}>
                    Score {scoreFromDecision(decision)}
                  </span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    {asset.title}
                  </Link>
                </h3>

                <p className={websiteStyles.cardMeta}>
                  Gate passed {formatDate(decision.created_at)} • Destination:{" "}
                  {channelForAssetType(asset.asset_type)}
                </p>

                <p className={websiteStyles.cardText}>
                  {String(asset.content ?? "").slice(0, 260)}...
                </p>

                <div className={websiteStyles.card} style={{ marginTop: 12 }}>
                  <h4 className={websiteStyles.cardTitle}>Quality gate reason</h4>
                  <p className={websiteStyles.cardText}>
                    {decision.reason ?? "Asset passed the configured quality thresholds."}
                  </p>
                  <p className={websiteStyles.cardMeta}>{scoreBreakdown(decision)}</p>
                </div>

                <p className={websiteStyles.cardText}>
                  <strong>Next:</strong>{" "}
                  {nextStepForAsset({
                    assetType: asset.asset_type,
                    status: asset.status,
                  })}
                </p>

                <ReadyAssetActions
                  assetId={asset.id}
                  assetType={asset.asset_type}
                  status={asset.status}
                  assetTitle={asset.title}
                />
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No assets have passed the quality gate yet. Run quality reviews, apply quality gates, then return here.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="How to use this"
        title="Recommended workflow"
        description="This queue becomes the bridge between quality scoring and publishing execution."
      >
        <div className={websiteStyles.cardGrid}>
          {[
            ["1", "Review Quality", "Score the asset for brand, CTA, SEO/AIO, clarity, and conversion."],
            ["2", "Apply Gate", "Compare the review against editable thresholds in Settings."],
            ["3", "Approve", "Approve assets that passed and still look good to you."],
            ["4", "Execute", "Send approved social, email, and video assets through Publishing Ready."],
          ].map(([step, title, description]) => (
            <article key={step} className={websiteStyles.card}>
              <span className={websiteStyles.badge}>Step {step}</span>
              <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                {title}
              </h3>
              <p className={websiteStyles.cardText}>{description}</p>
            </article>
          ))}
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
