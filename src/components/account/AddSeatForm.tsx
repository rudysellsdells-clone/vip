"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function AddSeatForm() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/account/seats", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to add seat.");
      }

      form.reset();
      setMessage(result.inviteAttempted ? "Seat added and invitation attempted." : "Seat added.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected seat error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={formStyles.compactForm}>
      <div className={formStyles.header}>
        <h3 className={formStyles.smallTitle}>Add a seat</h3>
        <p className={formStyles.description}>
          Add a teammate to the account ledger. If Supabase admin invites are configured, VIP can attempt the invite automatically.
        </p>
      </div>

      <div className={formStyles.grid}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Email</span>
          <input className={formStyles.input} name="email" type="email" required placeholder="teammate@example.com" />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Name</span>
          <input className={formStyles.input} name="full_name" placeholder="Optional" />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Role</span>
          <select className={formStyles.select} name="role" defaultValue="editor">
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="reviewer">Reviewer</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={running} className={formStyles.submit}>
          {running ? "Adding..." : "Add Seat"}
        </button>
      </div>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </form>
  );
}
