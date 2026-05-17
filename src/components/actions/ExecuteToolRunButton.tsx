"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function ExecuteToolRunButton({
  toolRunId,
  label = "Execute Action",
}: {
  toolRunId: string;
  label?: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch(`/api/tool-runs/${toolRunId}/execute`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to execute action.");
      }

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
        onClick={handleExecute}
        disabled={running}
        className={formStyles.submit}
      >
        {running ? "Executing..." : label}
      </button>
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
