"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";
import type { AccountMarketProfile } from "@/lib/accounts/account-market-profile";
import type { BrandVoiceMonthlyOptions } from "@/lib/accounts/brand-voice-monthly-options";
import { buildMarketingSpine } from "@/lib/content-calendar/marketing-spine";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function readableMessage(value: unknown, fallback = "Unexpected error.") {
  if (value instanceof Error) return value.message || fallback;
  if (typeof value === "string") return value || fallback;

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, any>;
    const main =
      objectValue.error ??
      objectValue.message ??
      objectValue.details ??
      objectValue.hint;

    if (typeof main === "string") return main;

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function hasBrandVoiceOptions(options?: BrandVoiceMonthlyOptions) {
  return Boolean(
    options &&
    (options.audiences.length ||
      options.offers.length ||
      options.tones.length ||
      options.ctas.length ||
      options.differentiators.length ||
      options.proofPoints.length ||
      options.businessContextDefault ||
      options.monthlyObjectiveDefault),
  );
}
function gateLabel(status: string) {
  if (status === "ready") return "Spine ready";
  if (status === "weak_context") return "Spine usable, but thin";
  return "Needs context";
}

function previewText(value: string, fallback = "Not supplied yet") {
  return value?.trim() || fallback;
}

function MiniSpineField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={websiteStyles.cardMeta}>{label}</p>
      <p className={websiteStyles.cardText} style={{ marginTop: 4 }}>
        {previewText(value)}
      </p>
    </div>
  );
}

function OptionPicker({
  label,
  helper,
  options,
  onPick,
}: {
  label: string;
  helper?: string;
  options: BrandVoiceMonthlyOptions["audiences"];
  onPick: (value: string) => void;
}) {
  if (!options.length) return null;

  return (
    <label className={formStyles.field}>
      <span className={formStyles.label}>{label}</span>
      <select
        value=""
        onChange={(event) => {
          const value = event.target.value;
          if (value) onPick(value);
        }}
        className={formStyles.input}
      >
        <option value="">Choose from Brand Voice settings</option>
        {options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helper ? <span className={formStyles.help}>{helper}</span> : null}
    </label>
  );
}

export function GenerateMonthlyCampaignsButton({
  defaultMonth,
  activeAccountId,
  activeAccountName,
  marketProfile,
  brandVoiceOptions,
}: {
  defaultMonth?: string;
  activeAccountId?: string | null;
  activeAccountName?: string | null;
  marketProfile?: AccountMarketProfile;
  brandVoiceOptions?: BrandVoiceMonthlyOptions;
}) {
  const router = useRouter();
  const initialMonth = useMemo(
    () => defaultMonth || currentMonthValue(),
    [defaultMonth],
  );
  const brandDefaults = useMemo(() => brandVoiceOptions, [brandVoiceOptions]);
  const [month, setMonth] = useState(initialMonth);
  const [campaignTheme, setCampaignTheme] = useState("Authority Growth");
  const [serviceLineId, setServiceLineId] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [monthlyObjective, setMonthlyObjective] = useState(
    brandDefaults?.monthlyObjectiveDefault ?? "",
  );
  const [targetAudience, setTargetAudience] = useState("");
  const [primaryOffer, setPrimaryOffer] = useState("");
  const [keyTopics, setKeyTopics] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [proofPoints, setProofPoints] = useState("");
  const [originalityAngle, setOriginalityAngle] = useState("");
  const [objections, setObjections] = useState("");
  const [businessContext, setBusinessContext] = useState(
    brandDefaults?.businessContextDefault ?? "",
  );
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const marketingSpine = useMemo(
    () =>
      buildMarketingSpine({
        campaignTheme,
        businessContext,
        accountName: activeAccountName,
        strategy: {
          monthlyObjective,
          targetAudience,
          primaryOffer,
          keyTopics,
          tone: brandTone,
          callToAction,
          differentiator,
          proofPoints,
          originalityAngle,
          objections,
        },
      }),
    [
      activeAccountName,
      brandTone,
      businessContext,
      callToAction,
      campaignTheme,
      differentiator,
      keyTopics,
      monthlyObjective,
      objections,
      originalityAngle,
      primaryOffer,
      proofPoints,
      targetAudience,
    ],
  );

  function requestPayload() {
    return {
      month,
      campaignTheme,
      accountId: activeAccountId,
      serviceLineId,
      audienceId,
      offerId,
      businessContext,
      monthlyObjective,
      targetAudience,
      primaryOffer,
      keyTopics,
      brandTone,
      callToAction,
      differentiator,
      proofPoints,
      originalityAngle,
      objections,
      overwriteExisting,
    };
  }

  async function generate() {
    const confirmed = window.confirm(
      `Generate one campaign per week using this Marketing Spine? Gate status: ${gateLabel(marketingSpine.gateStatus)} (${marketingSpine.readinessScore}/100).`,
    );

    if (!confirmed) return;

    setRunning(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/content-calendar/monthly-campaigns/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload()),
        },
      );

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(
          `${readableMessage(result, "Unable to generate monthly campaigns.")}${
            response.status ? ` — HTTP ${response.status}` : ""
          }`,
        );
      }

      setSummary(result);

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        setError(
          `Generation completed with ${result.errors.length} issue(s): ${result.errors
            .map((item: unknown) => readableMessage(item, "Unknown issue"))
            .slice(0, 3)
            .join(" | ")}`,
        );
        return;
      }

      if ((result.assetCount ?? 0) === 0) {
        setError("Generation returned zero assets.");
        return;
      }

      router.push(
        `/content-calendar/monthly-review?month=${encodeURIComponent(month)}`,
      );
      router.refresh();
    } catch (err) {
      setError(
        readableMessage(err, "Unexpected monthly campaign generation error."),
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Generate monthly campaign package</h3>
        <p className={formStyles.description}>
          Creates one campaign per usable week and generates the full asset
          package using your strategy inputs.
        </p>
      </div>

      <div className={websiteStyles.card}>
        <h4 className={websiteStyles.cardTitle}>Account strategy context</h4>
        <p className={websiteStyles.cardMeta}>
          {activeAccountName
            ? `Generating for ${activeAccountName}. Pick a service line, audience, and offer to keep this campaign aligned with what the account actually sells.`
            : "No active account selected. VIP will use the manual strategy fields below."}
        </p>

        {marketProfile &&
        (marketProfile.serviceLines.length ||
          marketProfile.audiences.length ||
          marketProfile.offers.length) ? (
          <div className={[formStyles.row, formStyles.grid2].join(" ")}>
            <label className={formStyles.field}>
              <span className={formStyles.label}>Service Line</span>
              <select
                value={serviceLineId}
                onChange={(event) => setServiceLineId(event.target.value)}
                className={formStyles.input}
              >
                <option value="">Use default service line</option>
                {marketProfile.serviceLines.map((serviceLine) => (
                  <option key={serviceLine.id} value={serviceLine.id}>
                    {serviceLine.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={formStyles.field}>
              <span className={formStyles.label}>Audience</span>
              <select
                value={audienceId}
                onChange={(event) => setAudienceId(event.target.value)}
                className={formStyles.input}
              >
                <option value="">Use default audience</option>
                {marketProfile.audiences.map((audience) => (
                  <option key={audience.id} value={audience.id}>
                    {audience.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={formStyles.field}>
              <span className={formStyles.label}>Offer</span>
              <select
                value={offerId}
                onChange={(event) => setOfferId(event.target.value)}
                className={formStyles.input}
              >
                <option value="">Use default offer</option>
                {marketProfile.offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className={formStyles.description}>
            Add service lines, audiences, and offers in the account Strategy
            section, or use the Brand Voice shortcuts below, to make monthly
            campaign generation account-specific.
          </p>
        )}
      </div>

      {hasBrandVoiceOptions(brandVoiceOptions) ? (
        <div className={websiteStyles.card}>
          <h4 className={websiteStyles.cardTitle}>Brand Voice shortcuts</h4>
          <p className={websiteStyles.cardMeta}>
            These choices come from the active workspace&apos;s Brand Voice
            settings. Pick one to fill the campaign fields below, then edit the
            wording if needed.
          </p>

          <div className={[formStyles.row, formStyles.grid2].join(" ")}>
            <OptionPicker
              label="Audience from Brand Voice"
              options={brandVoiceOptions?.audiences ?? []}
              onPick={setTargetAudience}
            />
            <OptionPicker
              label="Offer from Brand Voice"
              options={brandVoiceOptions?.offers ?? []}
              onPick={setPrimaryOffer}
            />
            <OptionPicker
              label="Tone from Brand Voice"
              options={brandVoiceOptions?.tones ?? []}
              onPick={setBrandTone}
            />
            <OptionPicker
              label="CTA from Brand Voice"
              options={brandVoiceOptions?.ctas ?? []}
              onPick={setCallToAction}
            />
            <OptionPicker
              label="Differentiator from Brand Voice"
              options={brandVoiceOptions?.differentiators ?? []}
              onPick={setDifferentiator}
            />
            <OptionPicker
              label="Proof point from Brand Voice"
              options={brandVoiceOptions?.proofPoints ?? []}
              onPick={setProofPoints}
            />
          </div>
        </div>
      ) : null}

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Month</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className={formStyles.input}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Campaign Theme</span>
          <input
            value={campaignTheme}
            onChange={(event) => setCampaignTheme(event.target.value)}
            className={formStyles.input}
            placeholder="Authority Growth"
          />
        </label>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Monthly Objective</span>
        <textarea
          value={monthlyObjective}
          onChange={(event) => setMonthlyObjective(event.target.value)}
          className={formStyles.textarea}
          placeholder="Example: Build authority around AI search visibility and convert local businesses into visibility review leads."
          rows={3}
        />
      </label>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Target Audience</span>
          <input
            value={targetAudience}
            onChange={(event) => setTargetAudience(event.target.value)}
            className={formStyles.input}
            placeholder="Example: local service business owners"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Primary Offer</span>
          <input
            value={primaryOffer}
            onChange={(event) => setPrimaryOffer(event.target.value)}
            className={formStyles.input}
            placeholder="Example: free visibility review"
          />
        </label>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Key Topics / Weekly Angles</span>
        <textarea
          value={keyTopics}
          onChange={(event) => setKeyTopics(event.target.value)}
          className={formStyles.textarea}
          placeholder="One per line or comma-separated. Example: AI search visibility, Google Business Profile, local authority signals, content consistency"
          rows={4}
        />
      </label>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Brand Tone</span>
        <input
          value={brandTone}
          onChange={(event) => setBrandTone(event.target.value)}
          className={formStyles.input}
          placeholder="Example: practical, credible, premium, human, direct"
        />
        <span className={formStyles.help}>
          This can be filled from Brand Voice and is passed into the monthly
          campaign strategy.
        </span>
      </label>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Differentiator</span>
          <input
            value={differentiator}
            onChange={(event) => setDifferentiator(event.target.value)}
            className={formStyles.input}
            placeholder="Example: practical local SEO + AI search strategy"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Call to Action</span>
          <input
            value={callToAction}
            onChange={(event) => setCallToAction(event.target.value)}
            className={formStyles.input}
            placeholder="Example: Schedule a visibility review"
          />
        </label>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>
          Proof Points / Supporting Context
        </span>
        <textarea
          value={proofPoints}
          onChange={(event) => setProofPoints(event.target.value)}
          className={formStyles.textarea}
          placeholder="Example: Web Search Pros helps local businesses improve search visibility, content authority, and AI search readiness."
          rows={3}
        />
      </label>

      <details
        className={websiteStyles.card}
        open={Boolean(originalityAngle || objections)}
      >
        <summary
          className={websiteStyles.cardTitle}
          style={{ cursor: "pointer" }}
        >
          Optional Marketing Spine refinements
        </summary>
        <p className={websiteStyles.cardMeta} style={{ marginTop: 8 }}>
          These are not required. VIP will infer them if left blank, but adding
          them can make the campaign sharper.
        </p>
        <div
          className={[formStyles.row, formStyles.grid2].join(" ")}
          style={{ marginTop: 12 }}
        >
          <label className={formStyles.field}>
            <span className={formStyles.label}>Originality Angle</span>
            <textarea
              value={originalityAngle}
              onChange={(event) => setOriginalityAngle(event.target.value)}
              className={formStyles.textarea}
              placeholder="Example: Most businesses do not have a content problem. They have a strategy inheritance problem."
              rows={3}
            />
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Objections to Address</span>
            <textarea
              value={objections}
              onChange={(event) => setObjections(event.target.value)}
              className={formStyles.textarea}
              placeholder="One per line. Example: I do not have time, I am not sure this matters yet, I tried marketing before and it did not work."
              rows={3}
            />
          </label>
        </div>
      </details>

      <div className={websiteStyles.card}>
        <div className="flex flex-wrap gap-2">
          <span className={websiteStyles.badge}>Marketing Spine</span>
          <span className={websiteStyles.badge}>
            {gateLabel(marketingSpine.gateStatus)}
          </span>
          <span className={websiteStyles.badge}>
            {marketingSpine.readinessScore}/100 ready
          </span>
        </div>
        <h4 className={websiteStyles.cardTitle} style={{ marginTop: 12 }}>
          Brand → Strategy → Channels → Plan → Briefs → Assets → Quality →
          Publishing
        </h4>
        <p className={websiteStyles.cardMeta}>
          VIP will use this spine as the campaign chain of custody. It is
          generated from the fields above and passed into every weekly campaign,
          asset brief, quality review, and publishing-ready record.
        </p>

        {marketingSpine.missingRequired.length ? (
          <p className={formStyles.description} style={{ marginTop: 10 }}>
            Missing context: {marketingSpine.missingRequired.join(", ")}. You
            can still generate, but the campaign may be less specific.
          </p>
        ) : null}

        <div
          className={[formStyles.row, formStyles.grid2].join(" ")}
          style={{ marginTop: 14 }}
        >
          <MiniSpineField label="Audience" value={marketingSpine.audience} />
          <MiniSpineField label="Offer" value={marketingSpine.offer} />
          <MiniSpineField label="Buyer Pain" value={marketingSpine.buyerPain} />
          <MiniSpineField label="CTA" value={marketingSpine.primaryCta} />
        </div>

        <div style={{ marginTop: 14 }}>
          <p className={websiteStyles.cardMeta}>Originality angle</p>
          <p className={websiteStyles.cardText} style={{ marginTop: 4 }}>
            {marketingSpine.originalityAngle}
          </p>
        </div>

        <div
          className={[formStyles.row, formStyles.grid2].join(" ")}
          style={{ marginTop: 14 }}
        >
          <MiniSpineField
            label="LinkedIn Role"
            value={marketingSpine.channelRoles.linkedin.role}
          />
          <MiniSpineField
            label="Email Role"
            value={marketingSpine.channelRoles.email.role}
          />
          <MiniSpineField
            label="Blog Role"
            value={marketingSpine.channelRoles.blog.role}
          />
          <MiniSpineField
            label="Visual Role"
            value={marketingSpine.channelRoles.visual.role}
          />
        </div>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Additional Business Context</span>
        <textarea
          value={businessContext}
          onChange={(event) => setBusinessContext(event.target.value)}
          className={formStyles.textarea}
          placeholder="Optional notes for this month, such as seasonality, market focus, objections, or promotion details."
          rows={3}
        />
      </label>

      <div className={websiteStyles.card}>
        <h4 className={websiteStyles.cardTitle}>Generation Mode</h4>
        <p className={websiteStyles.cardMeta}>
          Marketing Spine fast batch mode is active. This keeps the route
          reliable by avoiding extra OpenAI calls inside monthly generation,
          while still passing a structured strategy spine and asset brief into
          every generated asset.
        </p>
      </div>

      <label className={formStyles.checkboxLabel}>
        <input
          type="checkbox"
          checked={overwriteExisting}
          onChange={(event) => setOverwriteExisting(event.target.checked)}
        />
        <span>
          Allow another campaign set even if this month already has campaigns
        </span>
      </label>

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={generate}
          disabled={running}
          className={formStyles.submit}
        >
          {running ? "Generating..." : "Generate Monthly Campaigns"}
        </button>
      </div>

      {summary ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Created {summary.campaignCount ?? 0} campaign(s) and{" "}
            {summary.assetCount ?? 0} asset(s)
            {summary.durationMs ? ` in ${summary.durationMs}ms` : ""}. Marketing
            Spine: {summary.marketingSpine?.gateStatus ?? "saved"}.
          </p>
          {Array.isArray(summary.warnings) && summary.warnings.length ? (
            <p className={formStyles.description}>
              {summary.warnings.length} warning(s):{" "}
              {summary.warnings
                .map((item: unknown) =>
                  readableMessage(item, "Unknown warning"),
                )
                .slice(0, 3)
                .join(" | ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
