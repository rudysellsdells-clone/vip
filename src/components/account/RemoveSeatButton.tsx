"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function RemoveSeatButton({
  seatId,
  email,
}: {
  seatId: string;
  email: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeSeat() {
    const confirmed = window.confirm(`Remove the seat for ${email}?`);

    if (!confirmed) return;

    setRunning(true);
    setError(null);

    try {
      const response = await fetch(`/api/account/seats/${seatId}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to remove seat.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected seat removal error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={removeSeat}
        disabled={running}
        className={formStyles.secondaryButton}
        style={{ minHeight: 40, padding: "0 14px", fontSize: 13 }}
      >
        {running ? "Removing..." : "Remove"}
      </button>
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
