"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function AuthorityContentGeneratorForm() {
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
      const response = await fetch("/api/authority-content/generate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate authority content.");
      }

      setAssetId(result.asset?.id ?? null);
      setMessage("Authority content generated and sent to approvals.");
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
        <h2 className={formStyles.title}>Generate authority content</h2>
        <p className={formStyles.description}>
          Create blog posts, white papers, and strategic authority assets that flow into the normal VIP review and approval system.
        </p>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Content Type</span>
          <select name="content_type" defaultValue="blog_post" className={formStyles.select}>
            <option value="blog_post">Blog Post</option>
            <option value="white_paper">White Paper</option>
            <option value="authority_asset">Authority Asset</option>
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Title</span>
          <input
            name="title"
            className={formStyles.input}
            placeholder="How AI Search Is Changing Local Visibility"
            required
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Topic</span>
          <input
            name="topic"
            className={formStyles.input}
            placeholder="AI search visibility for local businesses"
            required
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Audience</span>
          <input
            name="audience"
            className={formStyles.input}
            placeholder="Local service business owners"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Business Goal</span>
          <input
            name="business_goal"
            className={formStyles.input}
            placeholder="Generate more qualified strategy calls"
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Offer Focus</span>
          <input
            name="offer_focus"
            className={formStyles.input}
            defaultValue="SEO, AIO, content, link building, social media, and marketing automation"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Tone</span>
          <select name="tone" defaultValue="strategic and helpful" className={formStyles.select}>
            <option value="strategic and helpful">Strategic + helpful</option>
            <option value="executive and authoritative">Executive + authoritative</option>
            <option value="friendly and educational">Friendly + educational</option>
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

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Keywords / Phrases</span>
          <input
            name="keywords"
            className={formStyles.input}
            placeholder="AI search, local SEO, content strategy, marketing automation"
          />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Additional Notes</span>
          <textarea
            name="notes"
            rows={5}
            className={formStyles.textarea}
            placeholder="Add any angle, market context, examples, or points you want included."
          />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={running} className={formStyles.submit}>
          {running ? "Generating..." : "Generate Authority Content"}
        </button>

        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}

        {assetId ? (
          <Link href={`/assets/${assetId}`} className={websiteStyles.link}>
            Open generated asset →
          </Link>
        ) : null}
      </div>
    </form>
  );
}
