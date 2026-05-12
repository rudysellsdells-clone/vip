"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const serviceLines = [
  "AIO — AI Optimization",
  "SEO — Search Engine Optimization",
  "Web Development",
  "Content Creation",
  "Performance Marketing / Paid Ads",
  "Marketing Automation",
  "Local Visibility / Local SEO",
  "Website Health, Speed, and Conversion Improvements"
];

const buyerSegments = [
  "Contractors",
  "Mid-sized manufacturers",
  "Machine shops",
  "Dental practices",
  "Legal firms"
];

const platforms = ["Email", "LinkedIn", "Facebook", "YouTube", "Video", "Website", "Paid Ads"];

export function CampaignForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "Email",
    "LinkedIn",
    "Facebook",
    "YouTube"
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    const payload = {
      name: String(formData.get("name") ?? ""),
      serviceLine: String(formData.get("serviceLine") ?? ""),
      buyerSegment: String(formData.get("buyerSegment") ?? ""),
      idea: String(formData.get("idea") ?? ""),
      goal: String(formData.get("goal") ?? ""),
      platforms: selectedPlatforms,
      tone: String(formData.get("tone") ?? "Clear, practical, confident"),
      cta: String(formData.get("cta") ?? ""),
      notes: String(formData.get("notes") ?? "")
    };

    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    router.push(`/campaigns/${result.campaign.id}`);
  }

  function togglePlatform(platform: string) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <label className="text-sm font-medium">Campaign name</label>
        <input
          name="name"
          required
          className="mt-2 w-full rounded-lg border px-4 py-3"
          placeholder="AI Visibility Audit for Dental Practices"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Service line</label>
          <select name="serviceLine" className="mt-2 w-full rounded-lg border px-4 py-3">
            {serviceLines.map((serviceLine) => (
              <option key={serviceLine} value={serviceLine}>
                {serviceLine}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Buyer segment</label>
          <select name="buyerSegment" className="mt-2 w-full rounded-lg border px-4 py-3">
            {buyerSegments.map((segment) => (
              <option key={segment} value={segment}>
                {segment}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Campaign idea</label>
        <textarea
          name="idea"
          required
          rows={5}
          className="mt-2 w-full rounded-lg border px-4 py-3"
          placeholder="Help dental practices understand how AI search affects patient acquisition."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Goal</label>
          <input
            name="goal"
            required
            className="mt-2 w-full rounded-lg border px-4 py-3"
            placeholder="Book audit calls"
          />
        </div>

        <div>
          <label className="text-sm font-medium">CTA</label>
          <input
            name="cta"
            required
            className="mt-2 w-full rounded-lg border px-4 py-3"
            placeholder="Book an AI Visibility Audit"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Platforms</label>
        <div className="mt-3 flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => togglePlatform(platform)}
              className={`rounded-full border px-4 py-2 text-sm ${
                selectedPlatforms.includes(platform)
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Tone</label>
        <input
          name="tone"
          className="mt-2 w-full rounded-lg border px-4 py-3"
          defaultValue="Clear, practical, confident"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea
          name="notes"
          rows={3}
          className="mt-2 w-full rounded-lg border px-4 py-3"
          placeholder="Any extra details Rudy wants the clone to know."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Saving campaign..." : "Create Campaign"}
      </button>
    </form>
  );
}
