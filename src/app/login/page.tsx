"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const config = getPublicSupabaseConfig();
  const isConfigured = config.hasUrl && config.hasKey;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!isConfigured) {
        setMessage("Supabase is not configured in Vercel yet. Check the missing variables listed on this page.");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Check your email for the sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected sign-in error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-950 shadow-xl">
        <h1 className="text-2xl font-bold">Rudys VIP</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to start building Rudy’s Marketing Twin.</p>

        {!isConfigured && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Supabase is not configured for this deployment.</p>
            <p className="mt-2">Missing:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {!config.hasUrl && <li>NEXT_PUBLIC_SUPABASE_URL</li>}
              {!config.hasKey && <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY</li>}
            </ul>
            <p className="mt-3">Add the missing variable in Vercel, then redeploy without build cache.</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6">
          <label className="block text-sm font-medium">Email</label>
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
            disabled={loading || !isConfigured}
            className="mt-6 w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Sending link..." : "Send sign-in link"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
      </section>
    </main>
  );
}
