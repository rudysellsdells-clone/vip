"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

type Option = {
  id: string;
  name: string;
};

export function CampaignWebsiteForm({
  serviceLines,
  buyerSegments,
  offers,
}: {
  serviceLines: Option[];
  buyerSegments: Option[];
  offers: Option[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const platforms = String(formData.get("platforms") ?? "")
        .split(",")
        .map((platform) => platform.trim())
        .filter(Boolean);

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          service_line_id: formData.get("service_line_id") || null,
          offer_id: formData.get("offer_id") || null,
          idea: formData.get("idea"),
          buyer_segment: formData.get("buyer_segment"),
          audience: formData.get("audience"),
          goal: formData.get("goal"),
          platforms,
          tone: formData.get("tone"),
          cta: formData.get("cta"),
          notes: formData.get("notes"),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create campaign.");
      }

      setMessage("Campaign created.");
      const campaignId = result.campaign?.id;

      if (campaignId) {
        router.push(`/campaigns/${campaignId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Create a campaign</h2>
        <p className={formStyles.description}>
          Start with the business goal, buyer segment, offer, and CTA. VIP will turn this into review-ready assets.
        </p>
      </div>

      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Campaign Name</span>
          <input name="name" className={formStyles.input} required />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Buyer Segment</span>
          <select name="buyer_segment" className={formStyles.select} required>
            <option value="">Select buyer segment</option>
            {buyerSegments.map((buyerSegment) => (
              <option key={buyerSegment.id} value={buyerSegment.name}>
                {buyerSegment.name}
              </option>
            ))}
          </select>
          {buyerSegments.length === 0 ? (
            <span className={formStyles.help}>
              No buyer segments found. Go to Settings and populate the commercial foundation.
            </span>
          ) : null}
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Campaign Idea</span>
          <textarea name="idea" className={[formStyles.textarea, formStyles.textareaLarge].join(" ")} required />
          <span className={formStyles.help}>
            Describe the offer, problem, or opportunity this campaign should focus on.
          </span>
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Service Line</span>
          <select name="service_line_id" className={formStyles.select}>
            <option value="">Select service line</option>
            {serviceLines.map((serviceLine) => (
              <option key={serviceLine.id} value={serviceLine.id}>
                {serviceLine.name}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Offer</span>
          <select name="offer_id" className={formStyles.select}>
            <option value="">Select offer</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
          {offers.length === 0 ? (
            <span className={formStyles.help}>
              No offers found. Go to Settings and populate the commercial foundation.
            </span>
          ) : null}
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Goal</span>
          <input name="goal" className={formStyles.input} placeholder="Book audit calls" />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>CTA</span>
          <input name="cta" className={formStyles.input} placeholder="Book a call" />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Tone</span>
          <input name="tone" className={formStyles.input} placeholder="Clear, practical, confident" />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Audience</span>
          <input name="audience" className={formStyles.input} placeholder="Business owners..." />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Platforms</span>
          <input name="platforms" className={formStyles.input} defaultValue="Email, LinkedIn, Facebook, YouTube" />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Notes</span>
          <textarea name="notes" className={formStyles.textarea} />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={saving} className={formStyles.submit}>
          {saving ? "Creating..." : "Create Campaign"}
        </button>
        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
