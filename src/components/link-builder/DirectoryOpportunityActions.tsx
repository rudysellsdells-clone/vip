"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function DirectoryOpportunityActions({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, action: string) {
    setRunning(action); setError(null);
    try {
      const response = await fetch(path, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Action failed.");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error."); }
    finally { setRunning(null); }
  }

  return <div><div className={formStyles.actions}>
    <button type="button" className={formStyles.secondaryButton} disabled={Boolean(running)} onClick={() => post(`/api/link-builder/opportunities/${opportunityId}/score`, "score")}>{running === "score" ? "Scoring..." : "Score"}</button>
    <button type="button" className={formStyles.submit} disabled={Boolean(running)} onClick={() => post(`/api/link-builder/opportunities/${opportunityId}/approve`, "approve")}>{running === "approve" ? "Preparing..." : "Approve + Prepare"}</button>
  </div>{error ? <p className={formStyles.error}>{error}</p> : null}</div>;
}
