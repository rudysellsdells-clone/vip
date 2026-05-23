"use client";

import { useEffect, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

type Settings = {
  overall_min: number;
  brand_voice_min: number;
  clarity_min: number;
  cta_min: number;
  seo_aio_min: number;
  conversion_min: number;
  approval_mode: "mark_ready" | "auto_approve" | "disabled";
  require_human_approval: boolean;
  is_enabled: boolean;
};

const defaultSettings: Settings = {
  overall_min: 90,
  brand_voice_min: 85,
  clarity_min: 80,
  cta_min: 85,
  seo_aio_min: 75,
  conversion_min: 80,
  approval_mode: "mark_ready",
  require_human_approval: true,
  is_enabled: true,
};

function scoreValue(value: FormDataEntryValue | null, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.max(0, Math.min(100, Math.round(number)));
}

export function QualityGateSettingsForm() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/content-quality/settings", {
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load quality settings.");
      }

      setSettings(result.settings ?? defaultSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected settings load error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload: Settings = {
      overall_min: scoreValue(formData.get("overall_min"), defaultSettings.overall_min),
      brand_voice_min: scoreValue(formData.get("brand_voice_min"), defaultSettings.brand_voice_min),
      clarity_min: scoreValue(formData.get("clarity_min"), defaultSettings.clarity_min),
      cta_min: scoreValue(formData.get("cta_min"), defaultSettings.cta_min),
      seo_aio_min: scoreValue(formData.get("seo_aio_min"), defaultSettings.seo_aio_min),
      conversion_min: scoreValue(formData.get("conversion_min"), defaultSettings.conversion_min),
      approval_mode:
        formData.get("approval_mode") === "auto_approve"
          ? "auto_approve"
          : formData.get("approval_mode") === "disabled"
            ? "disabled"
            : "mark_ready",
      require_human_approval: formData.get("require_human_approval") === "on",
      is_enabled: formData.get("is_enabled") === "on",
    };

    try {
      const response = await fetch("/api/content-quality/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save quality settings.");
      }

      setSettings(result.settings ?? payload);
      setMessage("Quality thresholds saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected settings save error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className={formStyles.description}>Loading quality thresholds...</p>;
  }

  return (
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Quality gate thresholds</h2>
        <p className={formStyles.description}>
          Set the scores an asset must reach before VIP marks it ready or auto-approves it.
        </p>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Overall Minimum</span>
          <input
            name="overall_min"
            type="number"
            min="0"
            max="100"
            defaultValue={settings.overall_min}
            className={formStyles.input}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Brand Voice Minimum</span>
          <input
            name="brand_voice_min"
            type="number"
            min="0"
            max="100"
            defaultValue={settings.brand_voice_min}
            className={formStyles.input}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Clarity Minimum</span>
          <input
            name="clarity_min"
            type="number"
            min="0"
            max="100"
            defaultValue={settings.clarity_min}
            className={formStyles.input}
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>CTA Minimum</span>
          <input
            name="cta_min"
            type="number"
            min="0"
            max="100"
            defaultValue={settings.cta_min}
            className={formStyles.input}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>SEO/AIO Minimum</span>
          <input
            name="seo_aio_min"
            type="number"
            min="0"
            max="100"
            defaultValue={settings.seo_aio_min}
            className={formStyles.input}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Conversion Minimum</span>
          <input
            name="conversion_min"
            type="number"
            min="0"
            max="100"
            defaultValue={settings.conversion_min}
            className={formStyles.input}
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Approval Mode</span>
          <select
            name="approval_mode"
            defaultValue={settings.approval_mode}
            className={formStyles.select}
          >
            <option value="mark_ready">Mark ready only</option>
            <option value="auto_approve">Auto-approve when thresholds pass</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>

        <div className={formStyles.field}>
          <span className={formStyles.label}>Safety</span>

          <label className={formStyles.checkboxLabel}>
            <input
              name="is_enabled"
              type="checkbox"
              defaultChecked={settings.is_enabled}
            />
            <span>Enable quality gates</span>
          </label>

          <label className={formStyles.checkboxLabel}>
            <input
              name="require_human_approval"
              type="checkbox"
              defaultChecked={settings.require_human_approval}
            />
            <span>Require human approval before true auto-approval</span>
          </label>
        </div>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={saving} className={formStyles.submit}>
          {saving ? "Saving..." : "Save Quality Thresholds"}
        </button>

        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
