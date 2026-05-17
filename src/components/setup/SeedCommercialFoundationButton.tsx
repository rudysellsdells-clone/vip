"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

type SeedResult = {
  ok?: boolean;
  added?: {
    serviceLines?: number;
    buyerSegments?: number;
    offers?: number;
  };
  error?: string;
};

export function SeedCommercialFoundationButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  async function handleSeed() {
    setRunning(true);
    setResult(null);

    try {
      const response = await fetch("/api/setup/commercial-foundation", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as SeedResult;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to seed commercial foundation.");
      }

      setResult(payload);
      router.refresh();
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSeed}
        disabled={running}
        className={formStyles.submit}
      >
        {running ? "Populating..." : "Populate Buyer Segments and Offers"}
      </button>

      {result?.ok ? (
        <p className={formStyles.message}>
          Added {result.added?.serviceLines ?? 0} service line(s),{" "}
          {result.added?.buyerSegments ?? 0} buyer segment(s), and{" "}
          {result.added?.offers ?? 0} offer(s). Existing records were not duplicated.
        </p>
      ) : null}

      {result?.error ? <p className={formStyles.error}>{result.error}</p> : null}
    </div>
  );
}
