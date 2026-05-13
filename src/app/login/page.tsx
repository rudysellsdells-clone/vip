"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

type LoginMode = "password" | "magic-link";

export default function LoginPage() {
  const router = useRouter();
  const config = getPublicSupabaseConfig();
  const isConfigured = config.hasUrl && config.hasKey;

  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected login error."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage("Check your email for the magic link.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected magic link error."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!isConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-xl rounded-2xl bg-white p-8 text-slate-950 shadow-xl">
          <h1 className="text-2xl font-bold">Rudys VIP Setup Needed</h1>
          <p className="mt-3 text-sm text-slate-600">
            Supabase is not fully configured in this deployed environment.
          </p>

          <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm">
            <p className="font-semibold">Missing configuration:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {!config.hasUrl && <li>NEXT_PUBLIC_SUPABASE_URL</li>}
              {!config.hasKey && (
                <li>
                  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </li>
              )}
            </ul>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-950 shadow-xl">
        <h1 className="text-2xl font-bold">Rudys VIP</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to continue building Rudy’s Marketing Twin.
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setMessage(null);
              setErrorMessage(null);
            }}
            className={`rounded-lg px-3 py-2 font-semibold ${
              mode === "password" ? "bg-white shadow-sm" : "text-slate-600"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic-link");
              setMessage(null);
              setErrorMessage(null);
            }}
            className={`rounded-lg px-3 py-2 font-semibold ${
              mode === "magic-link" ? "bg-white shadow-sm" : "text-slate-600"
            }`}
          >
            Magic Link
          </button>
        </div>

        {mode === "password" ? (
          <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                placeholder="rudy@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                placeholder="rudy@example.com"
              />
            </div>

            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Magic links use Supabase email sending and may be rate limited.
              Use password login for Sprint 1 testing.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </form>
        )}

        {message && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <p className="mt-6 text-xs text-slate-500">
          For Sprint 1, create Rudy’s user manually in Supabase Auth and use
          password login to avoid email rate limits.
        </p>
      </section>
    </main>
  );
}
