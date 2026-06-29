"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

type LoginMode = "password" | "magic-link";

const trustItems = [
  "Brand inputs stay connected to every asset",
  "Quality scoring before publishing",
  "Workspace-safe client separation",
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
      <main className="flex min-h-screen items-center justify-center bg-[#f5f9fc] px-6 py-12 text-slate-950">
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
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0b2f4e]">
            Marketing VIP needs Supabase configuration
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            Supabase is not fully configured in this deployed environment. Add the missing public configuration values in Vercel before logging in.
          </p>

          <div className="mt-6 rounded-2xl border border-[#d9edf8] bg-[#f7fbff] p-4 text-sm">
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
    <main className="min-h-screen overflow-hidden bg-[#f5f9fc] text-slate-950">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#0d4d80] via-[#25aee4] to-[#7fd6f6]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="relative hidden overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#ffffff_0%,#eff8fd_48%,#dff3fb_100%)] p-8 shadow-2xl shadow-[#0d4d80]/12 lg:block">
          <div className="absolute left-[-9rem] top-[-9rem] h-[24rem] w-[24rem] rounded-full bg-[#25aee4]/20 blur-3xl" />
          <div className="absolute bottom-[-11rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[#0d4d80]/12 blur-3xl" />
          <div className="relative">
            <Link href="/" className="inline-flex">
              <Image
                src="/wsp-logo.png"
                alt="Web Search Professionals"
                width={280}
                height={94}
                priority
                className="h-auto w-[260px]"
              />
            </Link>

            <div className="mt-14 max-w-2xl">
              <p className="inline-flex rounded-full border border-[#b9d9ea] bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#0d4d80] shadow-sm">
                Managed AI Marketing Platform
              </p>
              <h1 className="mt-7 text-6xl font-black leading-[0.95] tracking-[-0.055em] text-[#0b2f4e]">
                Sign in to your AI marketing team in a box.
              </h1>
              <p className="mt-6 text-lg font-semibold leading-8 text-slate-700">
                Plan monthly strategy, review content, score every asset, approve work, and publish with confidence from one workspace-aware platform.
              </p>
            </div>

            <div className="mt-10 grid max-w-2xl gap-3">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-[#d9edf8] bg-white p-4 shadow-sm"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d4d80] text-sm font-black text-white">
                    ✓
                  </span>
                  <span className="text-sm font-black text-[#0b2f4e]">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[2rem] bg-[linear-gradient(135deg,#0b2f4e_0%,#0d4d80_52%,#148ac0_100%)] p-5 text-white shadow-xl shadow-[#0d4d80]/18">
              <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9fe4ff]">
                    VIP Content Score
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Publishing confidence</h2>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-black tracking-[-0.08em]">92</p>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9fe4ff]">Ready</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {scoreRows.map(([label, score]) => (
                  <div key={label} className="rounded-2xl border border-white/12 bg-white/10 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm font-black">
                      <span>{label}</span>
                      <span className="text-[#9fe4ff]">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-lg">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center">
              <Image
                src="/wsp-logo.png"
                alt="Web Search Professionals"
                width={230}
                height={77}
                priority
                className="h-auto w-[210px]"
              />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[#c6e5f4] bg-white p-3 shadow-2xl shadow-[#0d4d80]/14">
            <div className="rounded-[1.6rem] bg-white p-6 text-slate-950 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#25aee4]">
                    Welcome back
                  </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0b2f4e] sm:text-4xl">
                    Enter Marketing VIP
                  </h1>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                    Sign in to continue planning, approving, and publishing content.
                  </p>
                </div>
                <Link
                  href="/"
                  className="rounded-full border border-[#d9edf8] px-3 py-2 text-xs font-black text-[#0d4d80] transition hover:border-[#25aee4] hover:text-[#072e4f]"
                >
                  Home
                </Link>
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
                      ? "bg-white text-[#0b2f4e] shadow-sm"
                      : "text-slate-500 hover:text-[#0b2f4e]"
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
                      ? "bg-white text-[#0b2f4e] shadow-sm"
                      : "text-slate-500 hover:text-[#0b2f4e]"
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
                      className="mt-2 w-full rounded-2xl border border-[#d9edf8] bg-[#f7fbff] px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:bg-white focus:ring-4 focus:ring-[#25aee4]/15"
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
                      className="mt-2 w-full rounded-2xl border border-[#d9edf8] bg-[#f7fbff] px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:bg-white focus:ring-4 focus:ring-[#25aee4]/15"
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
                      className="mt-2 w-full rounded-2xl border border-[#d9edf8] bg-[#f7fbff] px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#25aee4] focus:bg-white focus:ring-4 focus:ring-[#25aee4]/15"
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

              <div className="mt-6 rounded-2xl border border-[#d9edf8] bg-[#f7fbff] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#25aee4]">
                  Protected workflow
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  After login, VIP sends you into the authenticated dashboard where workspace and role rules control what each user can see and do.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
