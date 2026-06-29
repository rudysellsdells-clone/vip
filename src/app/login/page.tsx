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
  "Quality scoring before publishing",
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
      <main className="min-h-screen bg-[#f7fbff] px-[4%] py-[clamp(3rem,8vw,6rem)] text-slate-950">
        <section className="mx-auto w-full max-w-[44rem] rounded-[2rem] border border-[#dbeaf7] bg-white p-[clamp(1.5rem,4vw,3rem)] shadow-2xl shadow-slate-200/70">
          <img src="/wsp-logo.png" alt="Web Search Professionals" className="h-14 w-auto object-contain" />
          <p className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">
            Setup required
          </p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-black leading-tight tracking-[-0.04em]">
            Marketing VIP needs Supabase configuration
          </h1>
          <p className="mt-5 text-base font-medium leading-8 text-slate-600">
            Supabase is not fully configured in this deployed environment. Add the missing public configuration values in Vercel before logging in.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-[#dbeaf7] bg-[#f7fbff] p-6 text-sm">
            <p className="font-black text-slate-950">Missing configuration:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 font-semibold text-slate-700">
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
    <main className="min-h-screen bg-[#f7fbff] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-[92%] max-w-[76rem] items-center justify-between gap-6 py-5">
          <Link href="/" className="flex items-center gap-4">
            <img
              src="/wsp-logo.png"
              alt="Web Search Professionals"
              className="h-14 w-auto max-w-[48vw] object-contain"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[#0b4a7a]/20 bg-white px-5 py-3 text-sm font-black text-[#0b4a7a] transition hover:bg-[#eef7ff]"
          >
            Back to home
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-[92%] max-w-[76rem] items-center gap-[8%] py-[clamp(4rem,9vw,8rem)] lg:grid-cols-[48%_44%]">
        <div>
          <p className="inline-flex rounded-full border border-[#cfe3f6] bg-[#eef7ff] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#0b4a7a]">
            Secure workspace access
          </p>
          <h1 className="mt-8 max-w-[12ch] text-[clamp(2.8rem,7vw,5.8rem)] font-black leading-[0.95] tracking-[-0.06em] text-slate-950">
            Sign in to your content marketing command center
          </h1>
          <p className="mt-8 max-w-[43rem] text-base font-medium leading-8 text-slate-600">
            Plan campaigns, review assets, approve content, and move into publishing preflight from one account-aware workspace.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {trustItems.map((item) => (
              <div key={item} className="flex items-center gap-4 rounded-3xl border border-[#dbeaf7] bg-white p-5 shadow-lg shadow-slate-200/50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b4a7a] text-sm font-black text-white">
                  ✓
                </span>
                <span className="text-sm font-black leading-6 text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="mx-auto w-full max-w-[34rem] rounded-[2rem] border border-[#dbeaf7] bg-white p-[clamp(1.25rem,3vw,2.25rem)] shadow-2xl shadow-slate-200/70">
          <div className="rounded-[1.5rem] bg-[#f7fbff] p-[clamp(1.25rem,3vw,2rem)]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">
              Welcome back
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              Enter Marketing VIP
            </h2>
            <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
              Choose your login method to continue into the authenticated workspace.
            </p>

            <div className="mt-8 grid grid-cols-2 rounded-full border border-[#dbeaf7] bg-white p-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setMessage(null);
                  setErrorMessage(null);
                }}
                className={`rounded-full px-4 py-3 font-black transition ${
                  mode === "password"
                    ? "bg-[#0b4a7a] text-white shadow-md shadow-[#0b4a7a]/15"
                    : "text-slate-500 hover:text-[#0b4a7a]"
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
                className={`rounded-full px-4 py-3 font-black transition ${
                  mode === "magic-link"
                    ? "bg-[#0b4a7a] text-white shadow-md shadow-[#0b4a7a]/15"
                    : "text-slate-500 hover:text-[#0b4a7a]"
                }`}
              >
                Magic Link
              </button>
            </div>

            {mode === "password" ? (
              <form onSubmit={handlePasswordLogin} className="mt-7 space-y-5">
                <div>
                  <label className="block text-sm font-black text-slate-800">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#dbeaf7] bg-white px-4 py-4 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0b4a7a]/50 focus:ring-4 focus:ring-[#0b4a7a]/10"
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
                    className="mt-2 w-full rounded-2xl border border-[#dbeaf7] bg-white px-4 py-4 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0b4a7a]/50 focus:ring-4 focus:ring-[#0b4a7a]/10"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#0b4a7a] px-5 py-4 font-black text-white shadow-xl shadow-[#0b4a7a]/15 transition hover:-translate-y-0.5 hover:bg-[#083b62] disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="mt-7 space-y-5">
                <div>
                  <label className="block text-sm font-black text-slate-800">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#dbeaf7] bg-white px-4 py-4 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0b4a7a]/50 focus:ring-4 focus:ring-[#0b4a7a]/10"
                    placeholder="rudy@example.com"
                  />
                </div>

                <div className="rounded-2xl border border-[#f5e1aa] bg-[#fff8e8] p-5 text-sm font-semibold leading-7 text-slate-700">
                  Magic links use Supabase email sending and may be rate limited. Password login is still the fastest testing path.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#0b4a7a] px-5 py-4 font-black text-white shadow-xl shadow-[#0b4a7a]/15 transition hover:-translate-y-0.5 hover:bg-[#083b62] disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send magic link"}
                </button>
              </form>
            )}

            {message && (
              <p className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm font-bold text-green-700">
                {message}
              </p>
            )}

            {errorMessage && (
              <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
                {errorMessage}
              </p>
            )}

            <div className="mt-7 rounded-2xl border border-[#dbeaf7] bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b4a7a]">
                Protected workflow
              </p>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                After login, VIP sends you into the authenticated dashboard where workspace and role rules control what each user can see and do.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
