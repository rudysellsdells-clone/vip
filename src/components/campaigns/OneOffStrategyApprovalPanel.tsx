"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import formStyles from "@/components/forms/VipForm.module.css";
import { GenerateCampaignAssetsButton } from "@/components/campaigns/GenerateCampaignAssetsButton";
import { websiteStyles } from "@/components/website-ui/WebsitePage";
import type {
  OneOffCampaignStrategy,
  OneOffStrategyGate,
} from "@/lib/content-generation/one-off-strategy-gate";
import {
  countMissingOneOffStrategyFields,
  EMPTY_ONE_OFF_STRATEGY,
  ONE_OFF_STRATEGY_FIELDS,
} from "@/lib/content-generation/one-off-strategy-form";

function statusLabel(gate: OneOffStrategyGate | null, stale: boolean) {
  if (!gate) return "Strategy not generated";
  if (stale) return "Inputs changed — rebuild required";
  return gate.status === "approved" ? "Strategy approved + locked" : "Awaiting approval";
}

function generatorLabel(gate: OneOffStrategyGate | null) {
  if (!gate) return null;
  if (gate.generator === "openai") return "AI strategy draft";
  if (gate.generator === "fallback") return "Safe fallback draft";
  return "Human-edited draft";
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export function OneOffStrategyApprovalPanel({
  campaignId,
  initialGate,
  initialStale,
  hasAssets,
}: {
  campaignId: string;
  initialGate: OneOffStrategyGate | null;
  initialStale: boolean;
  hasAssets: boolean;
}) {
  const router = useRouter();
  const [gate, setGate] = useState<OneOffStrategyGate | null>(initialGate);
  const [strategy, setStrategy] = useState<OneOffCampaignStrategy>(
    initialGate?.strategy ?? EMPTY_ONE_OFF_STRATEGY,
  );
  const [stale, setStale] = useState(initialStale);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approved = Boolean(gate?.status === "approved" && !stale);
  const editable = Boolean(gate && gate.status !== "approved");
  const missingCount = useMemo(
    () => countMissingOneOffStrategyFields(strategy),
    [strategy],
  );

  function updateField(key: keyof OneOffCampaignStrategy, value: string) {
    setStrategy((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function runStrategyAction(
    action: "generate" | "save" | "approve" | "unlock",
  ) {
    if (action === "approve") {
      const confirmed = window.confirm(
        "Approve and lock this strategy as the source of truth for all campaign assets?",
      );
      if (!confirmed) return;
    }

    if (action === "unlock" && hasAssets) {
      const confirmed = window.confirm(
        "This campaign already has generated assets. Reopening the strategy will not rewrite those assets automatically. Continue?",
      );
      if (!confirmed) return;
    }

    setRunningAction(action);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, strategy }),
      });
      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update campaign strategy.");
      }

      const nextGate = result.strategyGate as OneOffStrategyGate;
      setGate(nextGate);
      setStrategy(nextGate.strategy);
      setStale(Boolean(result.stale));
      setMessage(
        action === "generate"
          ? "Campaign strategy generated. Review and edit it before approval."
          : action === "approve"
            ? "Campaign strategy approved. Asset generation is now unlocked."
            : action === "unlock"
              ? "Strategy reopened for revision."
              : "Strategy draft saved.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected strategy error.");
    } finally {
      setRunningAction(null);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className="flex flex-wrap gap-2">
        <span className={websiteStyles.badge}>One-Off Marketing Spine</span>
        <span className={websiteStyles.badge}>{statusLabel(gate, stale)}</span>
        {generatorLabel(gate) ? (
          <span className={websiteStyles.badge}>{generatorLabel(gate)}</span>
        ) : null}
        {gate ? (
          <span className={websiteStyles.badge}>
            {gate.intelligenceReadinessScore}/100 source readiness
          </span>
        ) : null}
      </div>

      <div className={websiteStyles.card}>
        <h3 className={websiteStyles.cardTitle}>
          Strategy is now the approval gate before execution
        </h3>
        <p className={websiteStyles.cardText}>
          VIP first creates the campaign argument. Review, edit, and approve it here. Only then will VIP generate the email, social posts, YouTube content, video script, and creative prompt.
        </p>
        <p className={websiteStyles.cardMeta} style={{ marginTop: 8 }}>
          After approval, the asset writer receives this strategy and verified facts only. Raw Brand Voice, Account Strategy, field labels, and campaign-note dumps are excluded from the public-content prompt.
        </p>
      </div>

      {!gate ? (
        <div className={websiteStyles.card}>
          <h3 className={websiteStyles.cardTitle}>Step 1: Generate the strategy</h3>
          <p className={websiteStyles.cardText}>
            VIP will use the campaign information already supplied, the selected offer and service, relevant account memory, and approved knowledge. No additional setup fields are required.
          </p>
          <div className={formStyles.actions}>
            <button
              type="button"
              onClick={() => runStrategyAction("generate")}
              disabled={Boolean(runningAction)}
              className={formStyles.submit}
            >
              {runningAction === "generate" ? "Generating Strategy..." : "Generate Campaign Strategy"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {stale ? (
            <p className={formStyles.error}>
              The campaign inputs changed after this strategy was created. Generate a fresh strategy before producing assets.
            </p>
          ) : gate.status === "approved" ? (
            <p className={formStyles.message}>
              Strategy approved and locked. The campaign assets will inherit this argument.
            </p>
          ) : (
            <p className={formStyles.description}>
              Review every section below. Edit anything that sounds generic, copied from settings, incomplete, or strategically misaligned.
            </p>
          )}

          {gate.intelligenceMissingElements.length ? (
            <p className={formStyles.description}>
              Source context was thin in: {gate.intelligenceMissingElements.join(", ")}. Review those sections carefully and do not add unsupported proof.
            </p>
          ) : null}

          <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
            {ONE_OFF_STRATEGY_FIELDS.map((field) => (
              <label key={field.key} className={formStyles.field}>
                <span className={formStyles.label}>{field.label}</span>
                <textarea
                  value={strategy[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  disabled={!editable}
                  rows={field.rows ?? 4}
                  className={formStyles.textarea}
                />
                <span className={formStyles.help}>{field.helper}</span>
              </label>
            ))}
          </div>

          <div className={formStyles.actions}>
            {gate.status === "approved" ? (
              <button
                type="button"
                onClick={() => runStrategyAction("unlock")}
                disabled={Boolean(runningAction)}
                className={formStyles.secondaryButton}
              >
                {runningAction === "unlock" ? "Reopening..." : "Reopen Strategy for Revision"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => runStrategyAction("generate")}
                  disabled={Boolean(runningAction)}
                  className={formStyles.secondaryButton}
                >
                  {runningAction === "generate" ? "Regenerating..." : "Regenerate Strategy"}
                </button>
                <button
                  type="button"
                  onClick={() => runStrategyAction("save")}
                  disabled={Boolean(runningAction)}
                  className={formStyles.secondaryButton}
                >
                  {runningAction === "save" ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => runStrategyAction("approve")}
                  disabled={Boolean(runningAction) || missingCount > 0 || stale}
                  className={formStyles.submit}
                >
                  {runningAction === "approve" ? "Approving..." : "Approve and Lock Strategy"}
                </button>
                {missingCount ? (
                  <span className={formStyles.help}>
                    Complete {missingCount} required strategy section{missingCount === 1 ? "" : "s"} before approval.
                  </span>
                ) : null}
              </>
            )}
          </div>
        </>
      )}

      {approved ? (
        <div className={websiteStyles.card}>
          <div className="flex flex-wrap gap-2">
            <span className={websiteStyles.badge}>Step 3</span>
            <span className={websiteStyles.badge}>Execution unlocked</span>
          </div>
          <h3 className={websiteStyles.cardTitle} style={{ marginTop: 12 }}>
            Generate from the approved strategy
          </h3>
          <p className={websiteStyles.cardText}>
            Asset generation is now tied to this approved Marketing Spine. Revising the strategy later will relock generation until it is approved again.
          </p>
          <div className={websiteStyles.actionRow}>
            <GenerateCampaignAssetsButton campaignId={campaignId} hasAssets={hasAssets} />
          </div>
        </div>
      ) : null}

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
