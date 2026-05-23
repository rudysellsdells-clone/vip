"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function ArchiveActionButton({
  endpoint,
  label,
  confirmMessage,
  successMessage,
}: {
  endpoint: string;
  label: string;
  confirmMessage: string;
  successMessage: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("reason", label);

      const response = await fetch(endpoint, { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.error ?? "Action failed.");

      setMessage(successMessage);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected archive action error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={running} className={formStyles.secondaryButton}>
        {running ? "Working..." : label}
      </button>
      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
