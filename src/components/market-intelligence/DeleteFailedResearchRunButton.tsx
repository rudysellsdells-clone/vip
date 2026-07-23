"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteFailedResearchRunButton({
  projectId,
  redirectAfterDelete = false,
}: {
  projectId: string;
  redirectAfterDelete?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const confirmed = window.confirm(
      "Delete this failed research run? Its linked sources and findings will also be removed. This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/market-intelligence/projects/${encodeURIComponent(projectId)}`,
        { method: "DELETE" },
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete the failed research run.");
      }

      if (redirectAfterDelete) {
        router.push("/research");
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to delete the failed research run.",
      );
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={remove}
        disabled={deleting}
        className="border border-red-300 bg-white px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? "Removing…" : "Delete Failed Run"}
      </button>
      {error ? (
        <p className="mt-2 max-w-sm text-xs font-semibold leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
