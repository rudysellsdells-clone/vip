"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

type LoginMode = "password" | "magic-link";

const platformPoints = [
  "Monthly strategy and calendar planning",
  "AI-generated content from approved brand inputs",
  "VIP Content Score before approval",
  "Publishing workflow for connected channels",
];

const scoreRows = [
  ["Brand Voice", "92"],
  ["Audience Fit", "88"],
  ["CTA Strength", "84"],
  ["Publish Readiness", "91"],
];

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

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
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

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
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
      <main className="flex min-h-screen items-center justify-center bg-[#f6fbff] px-6 py-16 text-slate-900 sm:px-10">
        <section className="w-full max-w-2xl rounded-[2.5rem] border border-[#d9edf8] bg-white p-8 shadow-2xl shadow-[#0b5d95]/10 sm:p-12">
          <Image
            src="/wsp-logo.png"
            alt="Web Search Professionals"
            width={260}
            height={87}
            priority
            className="h-auto w-[240px]"
          />
          <p className="mt-10 text-sm font-black uppercase tracking-[0.24em] text-[#148ac0]">
            Setup required
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51]">
            Marketing VIP needs Supabase configuration
          </h1>
          <p className="mt-5 text-base font-medium leading-8 text-slate-600">
            Supabase is not fully configured in this deployed environment. Add the missing public configuration values in Vercel before logging in.
          </p>

          <div className="mt-8 rounded-3xl border border-[#d9edf8] bg-[#f8fcff] p-6 text-sm">
            <p className="font-black text-[#082f51]">Missing configuration:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
              {!config.hasUrl && <li>NEXT_PUBLIC_SUPABASE_URL</li>}
              {!config.hasKey && (
                <li>
                  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY
                </li>
              )}
            </ul>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-[#d9edf8] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-10 lg:px-12">
          <Link href="/" className="flex items-center">
            <Image
              src="/wsp-logo.png"
              alt="Web Search Professionals"
              width={260}
              height={87}
              priority
              className="h-auto w-[210px] sm:w-[250px]"
            />
          </Link>
          <Link
            href="/"
            className="rounded-full border border-[#b9d9ea] bg-white px-5 py-3 text-sm font-black text-[#0b5d95] shadow-sm transition hover:-translate-y-0.5 hover:border-[#25aee4] hover:bg-[#f7fcff]"
          >
            Back to landing
          </Link>
        </div>
      </header>

      <section className="bg-white px-6 py-16 sm:px-10 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto grid w-full max-w-7xl items-start gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[2.5rem] border border-[#d9edf8] bg-[#f8fcff] p-7 shadow-xl shadow-[#0b5d95]/8 sm:p-10 lg:p-12">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#148ac0]">
              Managed AI Marketing Platform
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.055em] text-[#082f51] sm:text-6xl">
              Sign in to your AI marketing team in a box
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-slate-700">
              Plan monthly strategy, review generated content, score every asset, approve work, and publish with confidence from one workspace-aware platform.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {platformPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-[#d9edf8] bg-white p-5 text-sm font-black leading-6 text-[#082f51] shadow-sm"
                >
                  <span className="mr-2 text-[#25aee4]">✓</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-[2rem] border border-[#d9edf8] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 border-b border-[#e6f2f8] pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#148ac0]">
                    VIP Content Score
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-[#082f51]">
                    Publishing confidence
                  </h2>
                </div>
                <div className="rounded-[2rem] border border-[#b9d9ea] bg-[#eef9ff] px-6 py-4 text-center">
                  <p className="text-5xl font-black tracking-[-0.08em] text-[#0b5d95]">92</p>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#148ac0]">Ready</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {scoreRows.map(([label, score]) => (
                  <div key={label} className="rounded-3xl border border-[#e0f0f8] bg-[#f8fcff] p-4">
                    <div className="flex items-center justify-between gap-3 text-sm font-black text-[#082f51]">
                      <span>{label}</span>
                      <span className="text-[#0b5d95]">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="rounded-[2.5rem] border border-[#d9edf8] bg-white p-7 shadow-2xl shadow-[#0b5d95]/10 sm:p-10 lg:p-12">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#148ac0]">
              Welcome back
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#082f51]">
              Enter Marketing VIP
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-slate-600">
              Use your account email and password, or request a magic link.
            </p>

            <div className="mt-8 grid grid-cols-2 rounded-full border border-[#d9edf8] bg-[#f8fcff] p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setMessage(null);
                  setErrorMessage(null);
                }}
                className={`rounded-full px-4 py-3 text-sm font-black transition ${
                  mode === "password"
                    ? "bg-white text-[#0b5d95] shadow-sm"
                    : "text-slate-500 hover:text-[#0b5d95]"
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
                className={`rounded-full px-4 py-3 text-sm font-black transition ${
                  mode === "magic-link"
                    ? "bg-white text-[#0b5d95] shadow-sm"
                    : "text-slate-500 hover:text-[#0b5d95]"
                }`}
              >
                Magic link
              </button>
            </div>

            {mode === "password" ? (
              <form onSubmit={handlePasswordLogin} className="mt-8 space-y-5">
                <label className="block">
                  <span className="text-sm font-black text-[#082f51]">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#c6e5f4] bg-white px-4 py-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:ring-4 focus:ring-[#25aee4]/15"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-[#082f51]">Password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#c6e5f4] bg-white px-4 py-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:ring-4 focus:ring-[#25aee4]/15"
                    placeholder="••••••••"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#0b5d95] px-6 py-4 text-base font-black text-white shadow-lg shadow-[#0b5d95]/20 transition hover:-translate-y-0.5 hover:bg-[#084a78] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="mt-8 space-y-5">
                <label className="block">
                  <span className="text-sm font-black text-[#082f51]">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#c6e5f4] bg-white px-4 py-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:ring-4 focus:ring-[#25aee4]/15"
                    placeholder="you@example.com"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#0b5d95] px-6 py-4 text-base font-black text-white shadow-lg shadow-[#0b5d95]/20 transition hover:-translate-y-0.5 hover:bg-[#084a78] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? "Sending link..." : "Send magic link"}
                </button>
              </form>
            )}

            {message && (
              <div className="mt-6 rounded-3xl border border-[#b9d9ea] bg-[#eef9ff] p-4 text-sm font-black text-[#0b5d95]">
                {message}
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
                {errorMessage}
              </div>
            )}

            <p className="mt-8 text-center text-sm font-medium leading-6 text-slate-500">
              Access is managed by Web Search Professionals. Contact your workspace admin if you need an invite.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
