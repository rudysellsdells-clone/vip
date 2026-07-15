"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(app)/analytics/Analytics.module.css";

export type AnalyticsPropertyOption = {
  accountId: string;
  accountDisplayName: string;
  propertyId: string;
  propertyDisplayName: string;
  propertyResourceName: string;
  propertyType: string | null;
  canEdit: boolean;
};

type NativeSource = {
  status: string;
  name: string;
  websiteUrl: string | null;
  collectionKey: string | null;
  keyRotatedAt: string | null;
} | null;

type Ga4Source = {
  status: string;
  name: string;
  propertyId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  availableProperties: AnalyticsPropertyOption[];
  selectedProperty: AnalyticsPropertyOption | null;
} | null;

function responseMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function AnalyticsSetupPanel({
  nativeSource,
  ga4Source,
  canManage,
  googleConfigured,
  trackerBaseUrl,
}: {
  nativeSource: NativeSource;
  ga4Source: Ga4Source;
  canManage: boolean;
  googleConfigured: boolean;
  trackerBaseUrl: string;
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState(trackerBaseUrl);
  const [websiteUrl, setWebsiteUrl] = useState(nativeSource?.websiteUrl ?? "");
  const [nativeKey, setNativeKey] = useState(nativeSource?.collectionKey ?? "");
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    ga4Source?.propertyId ?? ga4Source?.availableProperties[0]?.propertyId ?? "",
  );
  const [nativeBusy, setNativeBusy] = useState(false);
  const [ga4Busy, setGa4Busy] = useState(false);
  const [rollupBusy, setRollupBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (!origin && typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [origin]);

  const snippet = useMemo(() => {
    if (!origin || !nativeKey) return "";
    return `<script async src="${origin}/api/analytics/tracker.js?key=${nativeKey}"></script>`;
  }, [nativeKey, origin]);

  function showMessage(type: "success" | "error", value: string) {
    setMessageType(type);
    setMessage(value);
  }

  async function saveNative(rotateKey = false) {
    setNativeBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/analytics/native/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl, rotateKey }),
      });
      const payload = (await response.json()) as {
        source?: { collection_key?: string; website_url?: string };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(responseMessage(payload, "Native analytics setup failed."));
      }

      if (payload.source?.collection_key) {
        setNativeKey(payload.source.collection_key);
      }
      if (payload.source?.website_url) {
        setWebsiteUrl(payload.source.website_url);
      }

      showMessage(
        "success",
        rotateKey
          ? "The native tracking key was rotated. Replace the old website snippet with the new one."
          : "Native analytics is active for this website.",
      );
      router.refresh();
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Native analytics setup failed.",
      );
    } finally {
      setNativeBusy(false);
    }
  }

  async function copySnippet() {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      showMessage("success", "Tracking snippet copied.");
    } catch {
      showMessage("error", "The browser could not copy the tracking snippet.");
    }
  }

  async function selectProperty() {
    setGa4Busy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/analytics/ga4/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: selectedPropertyId }),
      });
      const payload = (await response.json()) as {
        error?: string;
        warning?: string | null;
      };

      if (!response.ok) {
        throw new Error(responseMessage(payload, "GA4 property selection failed."));
      }

      showMessage(
        payload.warning ? "error" : "success",
        payload.warning || "GA4 property selected and the first 30 days were synchronized.",
      );
      router.refresh();
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "GA4 property selection failed.",
      );
    } finally {
      setGa4Busy(false);
    }
  }

  async function syncGa4() {
    setGa4Busy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/analytics/ga4/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(responseMessage(payload, "GA4 synchronization failed."));
      }

      showMessage("success", "GA4 reporting data was synchronized for the last 30 days.");
      router.refresh();
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "GA4 synchronization failed.",
      );
    } finally {
      setGa4Busy(false);
    }
  }

  async function rollupNative() {
    setRollupBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/analytics/rollup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(responseMessage(payload, "Native analytics rollup failed."));
      }

      showMessage("success", "Native events were rolled into dashboard reporting.");
      router.refresh();
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Native analytics rollup failed.",
      );
    } finally {
      setRollupBusy(false);
    }
  }

  return (
    <section className={styles.setupPanel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelEyebrow}>Connections and collection</p>
          <h2>Activate the hybrid analytics system</h2>
          <p className={styles.panelCopy}>
            Install first-party tracking for Marketing VIP attribution, then connect GA4 for historical traffic and familiar website reporting.
          </p>
        </div>
        <span className={styles.panelPill}>H1.7B</span>
      </div>

      {message ? (
        <div className={messageType === "success" ? styles.setupSuccess : styles.setupError}>
          {message}
        </div>
      ) : null}

      <div className={styles.setupGrid}>
        <article className={styles.setupCard}>
          <div className={styles.setupCardHeader}>
            <div>
              <span className={styles.sourceIcon}>VIP</span>
            </div>
            <span className={nativeKey ? styles.sourceActive : styles.sourcePending}>
              {nativeKey ? "Active" : "Not installed"}
            </span>
          </div>
          <h3>Marketing VIP Native</h3>
          <p>
            Collect page views, engagement, calls, emails, forms, campaign visits, asset activity, conversions, and revenue without sending form values or personal details.
          </p>

          <label className={styles.setupLabel} htmlFor="analytics-website-url">
            Website URL
          </label>
          <input
            id="analytics-website-url"
            className={styles.setupInput}
            type="url"
            value={websiteUrl}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setWebsiteUrl(event.target.value)}
            placeholder="https://example.com"
            disabled={!canManage || nativeBusy}
          />

          <div className={styles.setupActions}>
            <button
              type="button"
              className={styles.setupPrimaryButton}
              onClick={() => saveNative(false)}
              disabled={!canManage || nativeBusy || !websiteUrl.trim()}
            >
              {nativeBusy ? "Saving…" : nativeKey ? "Update Website" : "Enable Native Analytics"}
            </button>
            {nativeKey ? (
              <button
                type="button"
                className={styles.setupSecondaryButton}
                onClick={rollupNative}
                disabled={!canManage || rollupBusy}
              >
                {rollupBusy ? "Rolling up…" : "Refresh Native Metrics"}
              </button>
            ) : null}
          </div>

          {snippet ? (
            <div className={styles.snippetBox}>
              <p>Place this once before the closing <code>&lt;/head&gt;</code> tag.</p>
              <code>{snippet}</code>
              <div className={styles.setupActions}>
                <button
                  type="button"
                  className={styles.setupSecondaryButton}
                  onClick={copySnippet}
                >
                  Copy Snippet
                </button>
                <button
                  type="button"
                  className={styles.setupTextButton}
                  onClick={() => saveNative(true)}
                  disabled={!canManage || nativeBusy}
                >
                  Rotate Tracking Key
                </button>
              </div>
            </div>
          ) : null}

          {nativeSource?.keyRotatedAt ? (
            <p className={styles.setupMeta}>
              Tracking key last rotated {formatDateTime(nativeSource.keyRotatedAt)}
            </p>
          ) : null}
        </article>

        <article className={styles.setupCard}>
          <div className={styles.setupCardHeader}>
            <div>
              <span className={styles.sourceIcon}>G4</span>
            </div>
            <span className={ga4Source?.propertyId ? styles.sourceActive : styles.sourcePending}>
              {ga4Source?.propertyId ? "Connected" : ga4Source ? "Property required" : "Not connected"}
            </span>
          </div>
          <h3>Google Analytics 4</h3>
          <p>
            Import users, sessions, engagement, page views, channel attribution, key events, and revenue into Marketing VIP's cached reporting model.
          </p>

          {!googleConfigured ? (
            <div className={styles.inlineWarning}>
              Add the Google Analytics OAuth environment variables in Vercel before connecting an account.
            </div>
          ) : null}

          {ga4Source?.availableProperties.length ? (
            <>
              <label className={styles.setupLabel} htmlFor="ga4-property">
                GA4 property
              </label>
              <select
                id="ga4-property"
                className={styles.setupInput}
                value={selectedPropertyId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedPropertyId(event.target.value)}
                disabled={!canManage || ga4Busy}
              >
                {ga4Source.availableProperties.map((property) => (
                  <option key={property.propertyId} value={property.propertyId}>
                    {property.accountDisplayName} — {property.propertyDisplayName}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <div className={styles.setupActions}>
            {!ga4Source ? (
              <a
                className={styles.setupPrimaryLink}
                href={googleConfigured && canManage ? "/api/analytics/ga4/connect" : undefined}
                aria-disabled={!googleConfigured || !canManage}
              >
                Connect Google Analytics
              </a>
            ) : ga4Source.availableProperties.length && !ga4Source.propertyId ? (
              <button
                type="button"
                className={styles.setupPrimaryButton}
                onClick={selectProperty}
                disabled={!canManage || ga4Busy || !selectedPropertyId}
              >
                {ga4Busy ? "Connecting…" : "Use Selected Property"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.setupPrimaryButton}
                  onClick={syncGa4}
                  disabled={!canManage || ga4Busy || !ga4Source.propertyId}
                >
                  {ga4Busy ? "Synchronizing…" : "Sync Last 30 Days"}
                </button>
                <a
                  className={styles.setupSecondaryLink}
                  href={googleConfigured && canManage ? "/api/analytics/ga4/connect" : undefined}
                  aria-disabled={!googleConfigured || !canManage}
                >
                  Reconnect Google
                </a>
              </>
            )}
          </div>

          {ga4Source?.selectedProperty ? (
            <dl className={styles.setupDetails}>
              <div>
                <dt>Property</dt>
                <dd>{ga4Source.selectedProperty.propertyDisplayName}</dd>
              </div>
              <div>
                <dt>Property ID</dt>
                <dd>{ga4Source.selectedProperty.propertyId}</dd>
              </div>
              <div>
                <dt>Last synchronized</dt>
                <dd>{formatDateTime(ga4Source.lastSyncedAt)}</dd>
              </div>
            </dl>
          ) : null}

          {ga4Source?.lastError ? (
            <div className={styles.inlineWarning}>{ga4Source.lastError}</div>
          ) : null}
        </article>
      </div>

      {!canManage ? (
        <p className={styles.setupReadOnly}>
          You can view analytics, but only an account owner or administrator can change connections.
        </p>
      ) : null}
    </section>
  );
}
