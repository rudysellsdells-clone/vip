"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

function defaultMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function GenerateMonthlyPlanForm() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/content-calendar/plans/generate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate content calendar.");
      }

      setMessage(
        `Generated ${result.plan?.month_label ?? "monthly"} plan with ${result.items?.length ?? 0} planned content items.`
      );

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
        <h2 className={formStyles.title}>Generate monthly content plan</h2>
        <p className={formStyles.description}>
          Create one distinct campaign per week and fill the month with blog, social, video, outreach, and What-If Story planning items.
        </p>
      </div>

      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Month</span>
          <input
            name="plan_month"
            type="month"
            defaultValue={defaultMonthValue()}
            className={formStyles.input}
            required
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Monthly Theme</span>
          <input
            name="monthly_theme"
            className={formStyles.input}
            placeholder="AI Search Visibility for Local Service Businesses"
            required
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Business Goal</span>
          <input
            name="business_goal"
            className={formStyles.input}
            placeholder="Generate more qualified strategy calls"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Target Audience</span>
          <input
            name="target_audience"
            className={formStyles.input}
            placeholder="Local service business owners"
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Offer Focus</span>
          <input
            name="offer_focus"
            className={formStyles.input}
            placeholder="SEO, AIO, content, link building, and automation"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Primary CTA</span>
          <input
            name="primary_cta"
            className={formStyles.input}
            placeholder="Schedule a strategy call"
          />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={running} className={formStyles.submit}>
          {running ? "Generating..." : "Generate Monthly Plan"}
        </button>
        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
