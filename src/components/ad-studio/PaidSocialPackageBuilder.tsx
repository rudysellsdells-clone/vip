"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { SearchCampaignOption } from "./GoogleSearchPackageBuilder";

type GeneratedResponse = {
  message?: string;
  error?: string;
  asset?: { id?: string };
};

export function PaidSocialPackageBuilder({
  campaigns,
  defaultDestinationUrl,
  canManage,
}: {
  campaigns: SearchCampaignOption[];
  defaultDestinationUrl: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCampaignId = searchParams.get("campaignId");
  const initialCampaignId =
    campaigns.find((campaign) => campaign.id === requestedCampaignId)?.id ??
    campaigns[0]?.id ??
    "";
  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const [platform, setPlatform] = useState<"meta" | "linkedin">("meta");
  const [destinationUrl, setDestinationUrl] = useState(defaultDestinationUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assetId, setAssetId] = useState("");
  const selected = useMemo(
    () => campaigns.find((campaign) => campaign.id === campaignId) ?? null,
    [campaignId, campaigns],
  );

  async function generate() {
    setBusy(true);
    setMessage("");
    setError("");
    setAssetId("");

    try {
      const response = await fetch("/api/ad-studio/paid-social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, destinationUrl, platform }),
      });
      const result = (await response.json()) as GeneratedResponse;
      if (!response.ok) throw new Error(result.error || "Unable to generate ads.");
      setMessage(result.message || "Paid Social package created.");
      setAssetId(result.asset?.id || "");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate ads.");
    } finally {
      setBusy(false);
    }
  }

  if (!campaigns.length) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        Create a campaign and approve its Marketing Spine before generating paid social ads.
        <div className="mt-3">
          <Link href="/campaigns" className="font-black underline">
            Open Campaigns →
          </Link>
        </div>
      </div>
    );
  }

  const platformLabel = platform === "meta" ? "Meta" : "LinkedIn";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
      <div className="border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Approved campaign
            </label>
            <select
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
              className="mt-2 w-full border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-950"
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Paid social platform
            </label>
            <select
              value={platform}
              onChange={(event) =>
                setPlatform(event.target.value === "linkedin" ? "linkedin" : "meta")
              }
              className="mt-2 w-full border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-950"
            >
              <option value="meta">Meta — Facebook & Instagram</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
        </div>

        <label className="mt-5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Final landing-page URL
        </label>
        <input
          type="url"
          value={destinationUrl}
          onChange={(event) => setDestinationUrl(event.target.value)}
          placeholder="https://example.com/service"
          className="mt-2 w-full border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          The package receives paid-social attribution and remains in Needs Review until explicitly approved.
        </p>

        <button
          type="button"
          disabled={!canManage || !campaignId || !destinationUrl || busy}
          onClick={generate}
          className="mt-5 inline-flex min-h-11 items-center justify-center bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? `Building ${platformLabel} Package…` : `Generate ${platformLabel} Package`}
        </button>

        {!canManage ? (
          <p className="mt-3 text-sm text-amber-700">
            Account owner or administrator access is required to generate ads.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        ) : null}
        {message ? (
          <div className="mt-4 border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            {message}{" "}
            {assetId ? (
              <Link href={`/assets/${assetId}`} className="font-black underline">
                Open package →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <aside className="border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Four concept angles
        </p>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <li><strong>1. Direct response</strong> — clear offer and action.</li>
          <li><strong>2. Problem aware</strong> — recognizable buyer situation.</li>
          <li><strong>3. Credibility led</strong> — approved proof without invention.</li>
          <li><strong>4. Educational</strong> — useful point of view that earns attention.</li>
        </ol>
        {selected ? (
          <div className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            Building for <strong>{selected.audience}</strong> from the approved campaign objective and offer. Each concept also includes an image creative brief.
          </div>
        ) : null}
      </aside>
    </div>
  );
}
