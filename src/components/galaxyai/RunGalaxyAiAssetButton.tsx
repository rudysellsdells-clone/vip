"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  getVipManagedGalaxyWorkflowMetadata,
  recommendedWorkflowKindForAssetType,
} from "@/lib/galaxyai/workflow-metadata";

type WorkflowOption = {
  galaxy_workflow_id: string;
  name: string;
  metadata?: Record<string, unknown> | null;
};

type RecoveryResult = {
  status?: string;
  mediaCount?: number;
  mediaPending?: boolean;
  recoveredAssetId?: string | null;
  mediaRetrievalError?: string | null;
  assetCreationError?: string | null;
};

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 72;
const COMPLETED_MEDIA_GRACE_ATTEMPTS = 6;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function findDefaultWorkflowId(
  workflows: WorkflowOption[],
  assetType: string,
) {
  const recommendedKind = recommendedWorkflowKindForAssetType(assetType);

  if (recommendedKind) {
    const recommended = workflows.find((workflow) => {
      return getVipManagedGalaxyWorkflowMetadata(workflow.metadata)?.workflowKind === recommendedKind;
    });

    if (recommended?.galaxy_workflow_id) {
      return recommended.galaxy_workflow_id;
    }
  }

  return workflows[0]?.galaxy_workflow_id ?? "";
}

export function RunGalaxyAiAssetButton({
  assetId,
  campaignId,
  assetType,
  workflows,
}: {
  assetId: string;
  campaignId: string;
  assetType: string;
  workflows: WorkflowOption[];
}) {
  const router = useRouter();
  const [workflowId, setWorkflowId] = useState(findDefaultWorkflowId(workflows, assetType));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAssetId, setGeneratedAssetId] = useState<string | null>(null);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.galaxy_workflow_id === workflowId) ?? null,
    [workflowId, workflows],
  );

  const selectedVipMetadata = getVipManagedGalaxyWorkflowMetadata(selectedWorkflow?.metadata ?? null);

  async function checkRun(localRunId: string) {
    let completedWithoutMediaAttempts = 0;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await wait(attempt === 0 ? 1500 : POLL_INTERVAL_MS);

      const response = await fetch(`/api/galaxyai/runs/${localRunId}`, {
        method: "GET",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "The run started, but VIP could not check its status.");
      }

      const recovery = (result.recovery ?? {}) as RecoveryResult;
      const status = String(result.run?.status ?? recovery.status ?? "running").toLowerCase();

      if (recovery.assetCreationError) {
        throw new Error(
          `GalaxyAI completed, but VIP could not create the review asset: ${recovery.assetCreationError}`,
        );
      }

      if (status === "failed" || status === "canceled") {
        throw new Error(result.run?.error ?? `GalaxyAI run ${status}.`);
      }

      if (status === "completed") {
        if (recovery.recoveredAssetId) {
          return {
            assetId: recovery.recoveredAssetId,
            message: "GalaxyAI output was received and added to the review queue.",
          };
        }

        if ((recovery.mediaCount ?? 0) > 0) {
          return {
            assetId: null,
            message: "GalaxyAI output was received. VIP is finalizing the review asset.",
          };
        }

        completedWithoutMediaAttempts += 1;
        if (completedWithoutMediaAttempts < COMPLETED_MEDIA_GRACE_ATTEMPTS) {
          setMessage("GalaxyAI finished. Waiting for the media file to become available...");
          continue;
        }

        return {
          assetId: null,
          message: recovery.mediaRetrievalError
            ? `GalaxyAI completed, but the media endpoint did not return the file: ${recovery.mediaRetrievalError}`
            : "GalaxyAI completed, but no media file was returned yet. Use GalaxyAI Runs to retrieve the output again.",
        };
      }

      setMessage(
        status === "queued"
          ? "GalaxyAI accepted the prompt and is waiting to begin..."
          : "GalaxyAI is generating the creative. VIP will retrieve it when complete...",
      );
    }

    return {
      assetId: null,
      message:
        "GalaxyAI is still processing. You can leave this page and use GalaxyAI Runs to check and retrieve the output later.",
    };
  }

  async function startRun() {
    setLoading(true);
    setMessage(null);
    setError(null);
    setGeneratedAssetId(null);

    if (!workflowId) {
      setLoading(false);
      setError("Sync or provision a GalaxyAI workflow first.");
      return;
    }

    try {
      const response = await fetch("/api/galaxyai/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          assetId,
          campaignId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Could not start GalaxyAI run.");
      }

      const localRunId = String(result.run?.id ?? "").trim();
      if (!localRunId) {
        throw new Error("GalaxyAI accepted the request, but VIP did not receive a local run id.");
      }

      setMessage("GalaxyAI run started. Waiting for the generated output...");
      const completed = await checkRun(localRunId);
      setGeneratedAssetId(completed.assetId);
      setMessage(completed.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected GalaxyAI run error.");
    } finally {
      setLoading(false);
    }
  }

  if (!workflows.length) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Sync or provision GalaxyAI workflows before running this prompt.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="block text-xs font-semibold text-slate-600">GalaxyAI Workflow</label>
      <select
        value={workflowId}
        onChange={(event) => setWorkflowId(event.target.value)}
        disabled={loading}
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-60"
      >
        {workflows.map((workflow) => {
          const vip = getVipManagedGalaxyWorkflowMetadata(workflow.metadata);
          const suffix = vip ? ` — ${vip.displayKind}` : "";

          return (
            <option key={workflow.galaxy_workflow_id} value={workflow.galaxy_workflow_id}>
              {workflow.name}{suffix}
            </option>
          );
        })}
      </select>
      {selectedVipMetadata ? (
        <p className="text-xs text-slate-500">
          Recommended for: {selectedVipMetadata.recommendedAssetTypes.join(", ") || "GalaxyAI prompts"}.
        </p>
      ) : null}
      <button
        type="button"
        onClick={startRun}
        disabled={loading}
        className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Generating and retrieving..." : "Run Approved Prompt in GalaxyAI"}
      </button>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        {generatedAssetId ? (
          <Link href={`/assets/${generatedAssetId}`} className="text-xs font-semibold text-[#0b4a7a] underline">
            Open generated asset →
          </Link>
        ) : null}
        <Link href="/galaxyai" className="text-xs font-semibold text-slate-600 underline">
          View GalaxyAI runs →
        </Link>
      </div>
    </div>
  );
}
