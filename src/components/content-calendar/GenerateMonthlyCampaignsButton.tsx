"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { readableError } from "@/lib/errors/readable-error";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type ResponseDebug = {
  url: string;
  ok: boolean;
  status: number;
  statusText: string;
  rawText: string;
  parsed: any;
};

type QualityFollowupResult =
  | {
      ok: true;
      result: Record<string, any>;
    }
  | {
      ok: false;
      error: string;
      result?: Record<string, any>;
    };

async function readResponseDebug(response: Response): Promise<ResponseDebug> {
  const rawText = await response.text();
  let parsed: any = null;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        error: rawText,
      };
    }
  }

  return {
    url: response.url,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    rawText,
    parsed,
  };
}

function responseErrorMessage(debug: ResponseDebug, fallback: string) {
  const parsedMessage = readableError(debug.parsed, "");
  const rawMessage = debug.rawText?.trim();

  return [
    fallback,
    `HTTP ${debug.status} ${debug.statusText}`,
    parsedMessage || rawMessage || "",
  ]
    .filter(Boolean)
    .join(" — ");
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
  const [autoRunQualityReview, setAutoRunQualityReview] = useState(true);
  const [autoRegenerateWeakAssets, setAutoRegenerateWeakAssets] = useState(true);
  const [running, setRunning] = useState(false);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [qualitySummary, setQualitySummary] = useState<Record<string, any> | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugDetails, setDebugDetails] = useState<any | null>(null);

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

  async function runDiagnostic() {
    setDiagnosticRunning(true);
    setError(null);
    setDebugDetails(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/generate-diagnostic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload()),
      });

      const debug = await readResponseDebug(response);
      setDebugDetails(debug.parsed ?? debug);

      if (!response.ok) {
        setError(responseErrorMessage(debug, "Monthly generator diagnostic failed."));
      }
    } catch (err) {
      setError(readableError(err, "Monthly generator diagnostic failed."));
    } finally {
      setDiagnosticRunning(false);
    }
  }

  async function runQualityReviewAfterGeneration(): Promise<QualityFollowupResult> {
    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/bulk-quality-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          regenerateWeakAssets: autoRegenerateWeakAssets,
          maxRegenerations: autoRegenerateWeakAssets ? 1 : 0,
          includeAlreadyChecked: false,
        }),
      });

      const debug = await readResponseDebug(response);

      if (!response.ok) {
        return {
          ok: false,
          error: responseErrorMessage(
            debug,
            "Automatic quality review failed after campaign generation."
          ),
          result: debug.parsed,
        };
      }

      return {
        ok: true,
        result: debug.parsed ?? {},
      };
    } catch (err) {
      return {
        ok: false,
        error: readableError(
          err,
          "Automatic quality review failed after campaign generation."
        ),
      };
    }
  }

  async function generate() {
    const confirmed = window.confirm(
      autoRunQualityReview
        ? "Generate the monthly campaign package and automatically run quality review across all generated assets?"
        : "Generate one campaign per week for this month, including the full asset package for each campaign?"
    );

    if (!confirmed) return;

    setRunning(true);
    setSummary(null);
    setQualitySummary(null);
    setQualityWarning(null);
    setError(null);
    setDebugDetails(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload()),
      });

      const debug = await readResponseDebug(response);
      setDebugDetails(debug.parsed ?? debug);

      if (!response.ok) {
        throw new Error(responseErrorMessage(debug, "Unable to generate monthly campaigns."));
      }

      const result = debug.parsed ?? {};
      setSummary(result);

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        setError(
          `Generation completed with ${result.errors.length} issue(s): ${result.errors
            .map((item: unknown) => readableError(item, "Unknown issue"))
            .slice(0, 5)
            .join(" | ")}`
        );
        return;
      }

      if ((result.assetCount ?? 0) === 0) {
        setError(
          "Generation returned zero assets. Review the Debug details below for the failed weekly generation reason."
        );
        return;
      }

      if (autoRunQualityReview) {
        const qualityResult = await runQualityReviewAfterGeneration();

        if (qualityResult.ok) {
          setQualitySummary(qualityResult.result);
        } else {
          setQualityWarning(
            `Campaigns were generated, but automatic quality review did not complete: ${qualityResult.error}`
          );
          if (qualityResult.result) {
            setDebugDetails(qualityResult.result);
          }
        }
      }

      router.push(`/content-calendar/monthly-review?month=${encodeURIComponent(month)}`);
      router.refresh();
    } catch (err) {
      setError(readableError(err, "Unexpected monthly campaign generation error."));
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
        <h4 className={websiteStyles.cardTitle}>Quality Review Automation</h4>

        <label className={formStyles.checkboxLabel}>
          <input
            type="checkbox"
            checked={autoRunQualityReview}
            onChange={(event) => setAutoRunQualityReview(event.target.checked)}
          />
          <span>Automatically run quality review after generation</span>
        </label>

        <label className={formStyles.checkboxLabel}>
          <input
            type="checkbox"
            checked={autoRegenerateWeakAssets}
            disabled={!autoRunQualityReview}
            onChange={(event) => setAutoRegenerateWeakAssets(event.target.checked)}
          />
          <span>Automatically regenerate weak assets once using quality feedback</span>
        </label>
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
          disabled={running || diagnosticRunning}
          className={formStyles.submit}
        >
          {running ? "Generating..." : "Generate Monthly Campaigns"}
        </button>

        <button
          type="button"
          onClick={runDiagnostic}
          disabled={running || diagnosticRunning}
          className={formStyles.secondaryButton}
        >
          {diagnosticRunning ? "Checking..." : "Run Generator Diagnostic"}
        </button>
      </div>

      {summary ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Created {summary.campaignCount ?? 0} campaign(s) and {summary.assetCount ?? 0} asset(s).
          </p>
          {Array.isArray(summary.warnings) && summary.warnings.length ? (
            <p className={formStyles.description}>
              {summary.warnings.length} warning(s):{" "}
              {summary.warnings
                .map((item: unknown) => readableError(item, "Unknown warning"))
                .slice(0, 3)
                .join(" | ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {qualitySummary ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Quality reviewed {qualitySummary.scored ?? 0} asset(s), passed {qualitySummary.passed ?? 0},
            regenerated {qualitySummary.regenerated ?? 0}, and flagged {qualitySummary.humanReviewNeeded ?? 0}.
          </p>
        </div>
      ) : null}

      {qualityWarning ? (
        <div className={websiteStyles.card}>
          <p className={formStyles.error}>{qualityWarning}</p>
        </div>
      ) : null}

      {error ? <p className={formStyles.error}>{error}</p> : null}

      {debugDetails ? (
        <details className={websiteStyles.card} open>
          <summary className={websiteStyles.cardTitle}>Debug details</summary>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 12, fontSize: 12 }}>
            {JSON.stringify(debugDetails, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
