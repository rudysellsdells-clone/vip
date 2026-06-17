"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton({
  className,
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function signOut() {
    setError("");

    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Unable to sign out.");
      return;
    }

    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-1 justify-items-end">
      <button
        type="button"
        className={className}
        onClick={signOut}
        disabled={isPending}
      >
        {isPending ? "Signing out..." : label}
      </button>
      {error ? <span className="text-right text-xs font-semibold text-red-700">{error}</span> : null}
    </div>
  );
}
