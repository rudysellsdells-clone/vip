"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email for the sign-in link.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-950 shadow-xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rudys VIP</p>
        <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Access Rudy’s Marketing Twin and start Sprint 1.
        </p>

        <label className="mt-6 block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
          placeholder="rudy@example.com"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Sending link..." : "Send sign-in link"}
        </button>

        {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
      </form>
    </main>
  );
}
