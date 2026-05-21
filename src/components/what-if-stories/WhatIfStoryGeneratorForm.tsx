"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function WhatIfStoryGeneratorForm() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setRunning(true);
    setAssetId(null);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/what-if-stories/generate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate What-If Story.");
      }

      setAssetId(result.asset?.id ?? null);
      setMessage("What-If Success Story generated and sent to approvals.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Generate personalized What-If Story</h2>
        <p className={formStyles.description}>
          Create a prospect-facing strategic scenario that shows what could be possible with a connected Web Search Pros growth system. The output is clearly labeled as hypothetical and goes to approvals.
        </p>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Prospect Name</span>
          <input
            name="prospect_name"
            className={formStyles.input}
            placeholder="Jane Smith"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Business Name</span>
          <input
            name="business_name"
            className={formStyles.input}
            placeholder="ABC Roofing"
            required
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Website</span>
          <input
            name="website_url"
            className={formStyles.input}
            placeholder="https://example.com"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Industry</span>
          <input
            name="industry"
            className={formStyles.input}
            placeholder="Roofing, dental, legal, home services..."
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Location / Market</span>
          <input
            name="location"
            className={formStyles.input}
            placeholder="Chicago suburbs, Wisconsin, national..."
          />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Current Situation</span>
          <textarea
            name="current_situation"
            className={formStyles.textarea}
            placeholder="What do we know or reasonably observe about where this business is today?"
            rows={4}
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Pain Point</span>
          <textarea
            name="pain_point"
            className={formStyles.textarea}
            placeholder="What problem are they likely facing?"
            rows={4}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Opportunity</span>
          <textarea
            name="opportunity"
            className={formStyles.textarea}
            placeholder="What could change if their visibility, content, and follow-up improved?"
            rows={4}
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Offer Focus</span>
          <input
            name="offer_focus"
            className={formStyles.input}
            defaultValue="SEO, AIO, content, link building, social media, and automation"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Tone</span>
          <select name="tone" defaultValue="consultative and confident" className={formStyles.select}>
            <option value="consultative and confident">Consultative + confident</option>
            <option value="friendly and helpful">Friendly + helpful</option>
            <option value="executive and strategic">Executive + strategic</option>
            <option value="bold and direct">Bold + direct</option>
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>CTA</span>
          <input
            name="cta"
            className={formStyles.input}
            defaultValue="schedule a strategy call"
          />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={running} className={formStyles.submit}>
          {running ? "Generating..." : "Generate What-If Story"}
        </button>

        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}

        {assetId ? (
          <Link href={`/assets/${assetId}`} className={websiteStyles.link}>
            Open generated story →
          </Link>
        ) : null}
      </div>
    </form>
  );
}
