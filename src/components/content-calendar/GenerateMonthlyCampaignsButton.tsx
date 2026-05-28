"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

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

export function GenerateMonthlyCampaignsButton({
  defaultMonth,
}: {
  defaultMonth?: string;
}) {
  const router = useRouter();
  const initialMonth = useMemo(() => defaultMonth || currentMonthValue(), [defaultMonth]);
  const [month, setMonth] = useState(initialMonth);
  const [campaignTheme, setCampaignTheme] = useState("Authority Growth");
  const [monthlyObjective, setMonthlyObjective] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [primaryOffer, setPrimaryOffer] = useState("");
  const [keyTopics, setKeyTopics] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [proofPoints, setProofPoints] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function requestPayload() {
    return {
      month,
      campaignTheme,
      businessContext,
      monthlyObjective,
      targetAudience,
      primaryOffer,
      keyTopics,
      callToAction,
      differentiator,
      proofPoints,
      overwriteExisting,
    };
  }

  async function generate() {
    const confirmed = window.confirm(
      "Generate one campaign per week for this month, including the full asset package for each campaign?"
    );

    if (!confirmed) return;

    setRunning(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload()),
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(
          `${readableMessage(result, "Unable to generate monthly campaigns.")}${
            response.status ? ` — HTTP ${response.status}` : ""
          }`
        );
      }

      setSummary(result);

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        setError(
          `Generation completed with ${result.errors.length} issue(s): ${result.errors
            .map((item: unknown) => readableMessage(item, "Unknown issue"))
            .slice(0, 3)
            .join(" | ")}`
        );
        return;
      }

      if ((result.assetCount ?? 0) === 0) {
        setError("Generation returned zero assets.");
        return;
      }

      router.push(`/content-calendar/monthly-review?month=${encodeURIComponent(month)}`);
      router.refresh();
    } catch (err) {
      setError(readableMessage(err, "Unexpected monthly campaign generation error."));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Generate monthly campaign package</h3>
        <p className={formStyles.description}>
          Creates one campaign per usable week and generates the full asset package using your strategy inputs.
        </p>
      </div>

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
        <span className={formStyles.label}>Proof Points / Supporting Context</span>
        <textarea
          value={proofPoints}
          onChange={(event) => setProofPoints(event.target.value)}
          className={formStyles.textarea}
          placeholder="Example: Web Search Pros helps local businesses improve search visibility, content authority, and AI search readiness."
          rows={3}
        />
      </label>

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
          Fast batch mode is active. This avoids Vercel timeouts by creating the full campaign package without OpenAI calls inside the generation request.
        </p>
      </div>

      <label className={formStyles.checkboxLabel}>
        <input
          type="checkbox"
          checked={overwriteExisting}
          onChange={(event) => setOverwriteExisting(event.target.checked)}
        />
        <span>Allow another campaign set even if this month already has campaigns</span>
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
            Created {summary.campaignCount ?? 0} campaign(s) and {summary.assetCount ?? 0} asset(s)
            {summary.durationMs ? ` in ${summary.durationMs}ms` : ""}.
          </p>
          {Array.isArray(summary.warnings) && summary.warnings.length ? (
            <p className={formStyles.description}>
              {summary.warnings.length} warning(s):{" "}
              {summary.warnings
                .map((item: unknown) => readableMessage(item, "Unknown warning"))
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
