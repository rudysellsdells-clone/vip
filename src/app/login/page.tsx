"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

type LoginMode = "password" | "magic-link";

const trustItems = [
  "Monthly planning",
  "Quality scoring",
  "Approval workflow",
  "Publishing readiness",
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
      <main className="flex min-h-screen items-center justify-center bg-[#f4f9fd] px-6 py-12 text-slate-950">
        <section className="w-full max-w-2xl rounded-[2rem] border border-[#d9edf8] bg-white p-8 shadow-2xl shadow-[#0d4d80]/10">
          <Image
            src="/wsp-logo.png"
            alt="Web Search Professionals"
            width={250}
            height={84}
            priority
            className="h-auto w-[230px]"
          />
          <p className="mt-8 text-sm font-black uppercase tracking-[0.24em] text-[#0d4d80]">
            Setup required
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#082f51]">
            Marketing VIP needs Supabase configuration
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            Supabase is not fully configured in this deployed environment. Add the missing public configuration values in Vercel before logging in.
          </p>

          <div className="mt-6 rounded-2xl border border-[#d9edf8] bg-[#f8fcff] p-4 text-sm">
            <p className="font-black text-slate-950">Missing configuration:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
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
    <main className="min-h-screen bg-[#f4f9fd] text-slate-950">
      <div className="h-2 bg-gradient-to-r from-[#0d4d80] via-[#25aee4] to-[#7fd6f6]" />

      <div className="mx-auto flex min-h-[calc(100vh-0.5rem)] w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/wsp-logo.png"
              alt="Web Search Professionals"
              width={250}
              height={84}
              priority
              className="h-auto w-[210px] sm:w-[240px]"
            />
          </Link>
          <Link
            href="/"
            className="rounded-full border border-[#b9d9ea] bg-white px-4 py-2.5 text-sm font-black text-[#0d4d80] shadow-sm transition hover:-translate-y-0.5 hover:border-[#25aee4]"
          >
            Home
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div className="rounded-[2.25rem] border border-[#d8ebf5] bg-white p-6 shadow-2xl shadow-[#0d4d80]/10 sm:p-8 lg:p-10">
            <p className="inline-flex rounded-full border border-[#b9d9ea] bg-[#f4f9fd] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#0d4d80]">
              Managed AI Marketing Platform
            </p>
            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] text-[#082f51] sm:text-5xl lg:text-6xl">
              Sign in to your AI marketing team in a box.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-700 sm:text-lg">
              Plan monthly strategy, review generated content, score every asset, approve work, and publish with confidence from one workspace-aware platform.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div key={item} className="rounded-2xl border border-[#d9edf8] bg-[#f8fcff] p-4 text-sm font-black text-[#082f51]">
                  <span className="mr-2 text-[#25aee4]">✓</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-[#c6e5f4] bg-[#eaf7fd] p-5">
              <div className="flex items-end justify-between gap-5 border-b border-[#b9d9ea] pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0d4d80]">
                    VIP Content Score
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#082f51]">Publishing confidence</h2>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-black tracking-[-0.08em] text-[#0d4d80]">92</p>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#148ac0]">Ready</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {scoreRows.map(([label, score]) => (
                  <div key={label} className="rounded-2xl border border-[#d9edf8] bg-white p-3">
                    <div className="flex items-center justify-between gap-3 text-sm font-black text-[#082f51]">
                      <span>{label}</span>
                      <span className="text-[#0d4d80]">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="mx-auto w-full max-w-lg rounded-[2.25rem] border border-[#c6e5f4] bg-white p-4 shadow-2xl shadow-[#0d4d80]/12">
            <div className="rounded-[1.75rem] bg-white p-5 sm:p-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#25aee4]">
                  Welcome back
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#082f51] sm:text-4xl">
                  Enter Marketing VIP
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                  Sign in to continue planning, approving, and publishing content.
                </p>
              </div>

              <div className="mt-7 grid grid-cols-2 rounded-2xl bg-[#f1f8fc] p-1 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMode("password");
                    setMessage(null);
                    setErrorMessage(null);
                  }}
                  className={`rounded-xl px-3 py-3 font-black transition ${
                    mode === "password"
                      ? "bg-white text-[#082f51] shadow-sm"
                      : "text-slate-500 hover:text-[#082f51]"
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
                  className={`rounded-xl px-3 py-3 font-black transition ${
                    mode === "magic-link"
                      ? "bg-white text-[#082f51] shadow-sm"
                      : "text-slate-500 hover:text-[#082f51]"
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {mode === "password" ? (
                <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-black text-slate-800">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[#d9edf8] bg-[#f8fcff] px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:bg-white focus:ring-4 focus:ring-[#25aee4]/15"
                      placeholder="rudy@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-800">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[#d9edf8] bg-[#f8fcff] px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:bg-white focus:ring-4 focus:ring-[#25aee4]/15"
                      placeholder="Enter your password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[#0d4d80] px-4 py-4 font-black text-white shadow-xl shadow-[#0d4d80]/20 transition hover:-translate-y-0.5 hover:bg-[#083b63] disabled:translate-y-0 disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMagicLink} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-black text-slate-800">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[#d9edf8] bg-[#f8fcff] px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:bg-white focus:ring-4 focus:ring-[#25aee4]/15"
                      placeholder="rudy@example.com"
                    />
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                    Magic links use Supabase email sending and may be rate limited. Password login is still the fastest testing path.
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[#0d4d80] px-4 py-4 font-black text-white shadow-xl shadow-[#0d4d80]/20 transition hover:-translate-y-0.5 hover:bg-[#083b63] disabled:translate-y-0 disabled:opacity-60"
                  >
                    {loading ? "Sending..." : "Send magic link"}
                  </button>
                </form>
              )}

              {message && (
                <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
                  {message}
                </p>
              )}

              {errorMessage && (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {errorMessage}
                </p>
              )}

              <div className="mt-6 rounded-2xl border border-[#d9edf8] bg-[#f8fcff] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#25aee4]">
                  Protected workflow
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  After login, workspace and role rules control what each user can see and do.
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
