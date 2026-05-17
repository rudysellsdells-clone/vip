"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

type Option = {
  id: string;
  name: string;
};

export function CampaignWebsiteForm({
  serviceLines,
  offers,
}: {
  serviceLines: Option[];
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
    <form action={handleSubmit} className="space-y-5 rounded-[18px] bg-white p-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">
          Create a campaign
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Start with the business goal, buyer segment, offer, and CTA. VIP will turn this into review-ready assets.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">Campaign Name</span>
          <input name="name" className="w-full rounded-xl border border-slate-300 px-3 py-3" required />
        </label>

        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">Buyer Segment</span>
          <input name="buyer_segment" className="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Contractors, dental practices..." />
        </label>
      </div>

      <label>
        <span className="mb-2 block text-sm font-black text-slate-700">Campaign Idea</span>
        <textarea name="idea" className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-3" required />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">Service Line</span>
          <select name="service_line_id" className="w-full rounded-xl border border-slate-300 px-3 py-3">
            <option value="">Select service line</option>
            {serviceLines.map((serviceLine) => (
              <option key={serviceLine.id} value={serviceLine.id}>
                {serviceLine.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">Offer</span>
          <select name="offer_id" className="w-full rounded-xl border border-slate-300 px-3 py-3">
            <option value="">Select offer</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">Goal</span>
          <input name="goal" className="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Book audit calls" />
        </label>

        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">CTA</span>
          <input name="cta" className="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Book a call" />
        </label>

        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">Tone</span>
          <input name="tone" className="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Clear, practical, confident" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">Audience</span>
          <input name="audience" className="w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Business owners..." />
        </label>

        <label>
          <span className="mb-2 block text-sm font-black text-slate-700">Platforms</span>
          <input name="platforms" className="w-full rounded-xl border border-slate-300 px-3 py-3" defaultValue="Email, LinkedIn, Facebook, YouTube" />
        </label>
      </div>

      <label>
        <span className="mb-2 block text-sm font-black text-slate-700">Notes</span>
        <textarea name="notes" className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-3" />
      </label>

      <div className={websiteStyles.actionRow}>
        <button type="submit" disabled={saving} className={websiteStyles.primarySubmit}>
          {saving ? "Creating..." : "Create Campaign"}
        </button>
        {message ? <p className="text-sm font-bold text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
      </div>
    </form>
  );
}
