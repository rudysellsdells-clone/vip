"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export default function LoginPage() {
  const config = getPublicSupabaseConfig();
  const supabase = useMemo(() => {
    if (!config.isConfigured) return null;
    return createClient();
  }, [config.isConfigured]);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const redirectTo = `${window.location.origin}/auth/confirm?next=/dashboard`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email for the sign-in link. Open the newest email only.");
  }

  if (!config.isConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-slate-950 shadow-xl">
          <h1 className="text-2xl font-bold">Supabase configuration needed</h1>
          <p className="mt-3 text-sm text-slate-600">
            The app loaded, but Supabase public environment variables are missing from this deployment.
          </p>
          <div className="mt-6 rounded-lg bg-slate-100 p-4 text-sm">
            <p className="font-semibold">Missing:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {!config.hasUrl && <li>NEXT_PUBLIC_SUPABASE_URL</li>}
              {!config.hasKey && (
                <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-950 shadow-xl"
      >
        <h1 className="text-2xl font-bold">Rudys VIP</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to start building Rudy’s Marketing Twin.
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
