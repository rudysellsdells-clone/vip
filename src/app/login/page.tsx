"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import styles from "./login.module.css";

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
      <main className={styles.page}>
        <section className={styles.setupShell}>
          <div className={styles.setupCard}>
            <img className={styles.logo} src="/wsp-logo.png" alt="Web Search Professionals" />
            <p className={styles.eyebrow}>Setup required</p>
            <h1 className={styles.cardTitle}>Marketing VIP needs Supabase configuration</h1>
            <p className={styles.cardCopy}>
              Supabase is not fully configured in this deployed environment. Add the missing
              public configuration values in Vercel before logging in.
            </p>

            <div className={styles.warningBox}>
              <p>Missing configuration:</p>
              <ul>
                {!config.hasUrl && <li>NEXT_PUBLIC_SUPABASE_URL</li>}
                {!config.hasKey && (
                  <li>
                    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" aria-label="Back to Marketing VIP home">
            <img className={styles.logo} src="/wsp-logo.png" alt="Web Search Professionals" />
          </Link>
          <Link href="/" className={styles.backLink}>
            Back to home
          </Link>
        </div>
      </header>

      <section className={styles.shell}>
        <div>
          <p className={styles.eyebrow}>Secure workspace access</p>
          <h1 className={styles.title}>Sign in to your content marketing command center</h1>
          <p className={styles.copy}>
            Plan campaigns, review assets, approve content, and move into publishing preflight
            from one clean, account-aware workspace.
          </p>

          <div className={styles.trustGrid}>
            {trustItems.map((item) => (
              <div key={item} className={styles.trustItem}>
                <span className={styles.check}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <section className={styles.loginCard}>
          <p className={styles.eyebrow}>Welcome back</p>
          <h2 className={styles.cardTitle}>Enter Marketing VIP</h2>
          <p className={styles.cardCopy}>
            Choose your login method to continue into the authenticated workspace.
          </p>

          <div className={styles.modeSwitch}>
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setMessage(null);
                setErrorMessage(null);
              }}
              className={`${styles.modeButton} ${
                mode === "password" ? styles.modeButtonActive : ""
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
              className={`${styles.modeButton} ${
                mode === "magic-link" ? styles.modeButtonActive : ""
              }`}
            >
              Magic Link
            </button>
          </div>

          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={styles.input}
                  placeholder="rudy@example.com"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={styles.input}
                  placeholder="Enter your password"
                />
              </div>

              <button type="submit" disabled={loading} className={styles.primaryButton}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="magic-email">Email</label>
                <input
                  id="magic-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={styles.input}
                  placeholder="rudy@example.com"
                />
              </div>

              <div className={styles.magicNote}>
                Magic links use Supabase email sending and may be rate limited. Password login is
                still the fastest testing path.
              </div>

              <button type="submit" disabled={loading} className={styles.primaryButton}>
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          )}

          {message && <p className={styles.successBox}>{message}</p>}
          {errorMessage && <p className={styles.errorBox}>{errorMessage}</p>}

          <div className={styles.infoBox}>
            <strong>Protected workflow</strong>
            After login, VIP sends you into the authenticated dashboard where workspace and role
            rules control what each user can see and do.
          </div>
        </section>
      </section>
    </main>
  );
}
