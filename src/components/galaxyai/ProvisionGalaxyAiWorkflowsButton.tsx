"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function ProvisionGalaxyAiWorkflowsButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  async function handleProvision() {
    setRunning(true);
    setMessage(null);
    setError(null);
    setDetails([]);

    try {
      const response = await fetch("/api/galaxyai/workflows/provision", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to provision VIP GalaxyAI workflows.");
      }

      const created = Array.isArray(result.created) ? result.created : [];
      const diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics : [];

      setMessage(
        created.length
          ? `Provisioned ${created.length} VIP GalaxyAI workflow${created.length === 1 ? "" : "s"}.`
          : "Provisioning completed, but no workflows were created.",
      );
      setDetails(diagnostics);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleProvision}
        disabled={running}
        className={websiteStyles.primarySubmit}
      >
        {running ? "Provisioning..." : "Provision VIP Workflows"}
      </button>
      {message ? <p className="mt-2 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-rose-700">{error}</p> : null}
      {details.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
          {details.map((detail, index) => (
            <li key={`${index}-${detail}`}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
