"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

type LoginMode = "password" | "magic-link";

const trustItems = [
  "Workspace-aware approvals",
  "Publishing preflight controls",
  "Client-safe account separation",
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
      <main className="flex min-h-screen items-center justify-center bg-[#061826] px-6 py-12 text-white">
        <section className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white p-8 text-slate-950 shadow-2xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0b4a7a]">
            Setup required
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Marketing VIP needs Supabase configuration</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            Supabase is not fully configured in this deployed environment. Add the missing public configuration values in Vercel before logging in.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
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
    <main className="min-h-screen overflow-hidden bg-[#061826] text-white">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_12%_18%,rgba(245,182,66,0.22),transparent_26rem),radial-gradient(circle_at_82%_16%,rgba(14,116,144,0.32),transparent_28rem),linear-gradient(135deg,#061826_0%,#08263d_48%,#0f172a_100%)]" />
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_0.86fr] lg:px-10">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5b642] text-lg font-black text-[#061826] shadow-lg shadow-[#f5b642]/25">
              VIP
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.28em] text-white">
                Marketing VIP
              </span>
              <span className="block text-xs font-semibold text-white/55">
                Powered by Web Search Pros
              </span>
            </span>
          </Link>

          <div className="mt-16 max-w-2xl">
            <p className="inline-flex rounded-full border border-[#f5b642]/30 bg-[#f5b642]/10 px-4 py-2 text-sm font-bold text-[#ffd56f]">
              Secure workspace access
            </p>
            <h1 className="mt-7 text-6xl font-black leading-[0.95] tracking-[-0.055em]">
              Sign in to your content marketing command center.
            </h1>
            <p className="mt-6 text-lg font-medium leading-8 text-white/68">
              Plan campaigns, review assets, approve content, and move into publishing preflight from a single account-aware workspace.
            </p>
          </div>

          <div className="mt-10 grid max-w-2xl gap-3">
            {trustItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/10 backdrop-blur"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-black text-emerald-200">
                  ✓
                </span>
                <span className="text-sm font-bold text-white/76">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-lg">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5b642] text-lg font-black text-[#061826]">
                VIP
              </span>
              <span className="text-sm font-black uppercase tracking-[0.24em] text-white">
                Marketing VIP
              </span>
            </Link>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.08] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="rounded-[1.6rem] bg-white p-6 text-slate-950 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0b4a7a]">
                    Welcome back
                  </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    Enter Marketing VIP
                  </h1>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                    Sign in to continue planning, approving, and publishing content.
                  </p>
                </div>
                <Link
                  href="/"
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-[#0b4a7a]/30 hover:text-[#0b4a7a]"
                >
                  Home
                </Link>
              </div>

              <div className="mt-7 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMode("password");
                    setMessage(null);
                    setErrorMessage(null);
                  }}
                  className={`rounded-xl px-3 py-3 font-black transition ${
                    mode === "password"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
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
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
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
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0b4a7a]/50 focus:bg-white focus:ring-4 focus:ring-[#0b4a7a]/10"
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
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0b4a7a]/50 focus:bg-white focus:ring-4 focus:ring-[#0b4a7a]/10"
                      placeholder="Enter your password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[#0b4a7a] px-4 py-4 font-black text-white shadow-xl shadow-[#0b4a7a]/20 transition hover:-translate-y-0.5 hover:bg-[#083b62] disabled:translate-y-0 disabled:opacity-60"
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
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0b4a7a]/50 focus:bg-white focus:ring-4 focus:ring-[#0b4a7a]/10"
                      placeholder="rudy@example.com"
                    />
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                    Magic links use Supabase email sending and may be rate limited. Password login is still the fastest testing path.
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[#0b4a7a] px-4 py-4 font-black text-white shadow-xl shadow-[#0b4a7a]/20 transition hover:-translate-y-0.5 hover:bg-[#083b62] disabled:translate-y-0 disabled:opacity-60"
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

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
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
