"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export type SearchCampaignOption = {
  id: string;
  name: string;
  objective: string;
  audience: string;
  offer: string;
};

type GeneratedResponse = {
  message?: string;
  error?: string;
  asset?: { id?: string };
};

export function GoogleSearchPackageBuilder({
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
      const response = await fetch("/api/ad-studio/google-search/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, destinationUrl }),
      });
      const result = (await response.json()) as GeneratedResponse;
      if (!response.ok) throw new Error(result.error || "Unable to generate ads.");
      setMessage(result.message || "Google Search package created.");
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
        Create a campaign and approve its Marketing Spine before generating Google Search ads.
        <div className="mt-3">
          <Link href="/campaigns" className="font-black underline">
            Open Campaigns →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
      <div className="border border-slate-200 bg-white p-5">
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
          The final URL is validated and stored with CPC attribution. Publishing remains approval-gated.
        </p>

        <button
          type="button"
          disabled={!canManage || !campaignId || !destinationUrl || busy}
          onClick={generate}
          className="mt-5 inline-flex min-h-11 items-center justify-center bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Building Search Package…" : "Generate Google Search Package"}
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
          Inherited campaign context
        </p>
        {selected ? (
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-black text-slate-950">Objective</dt>
              <dd className="mt-1 leading-6 text-slate-600">{selected.objective}</dd>
            </div>
            <div>
              <dt className="font-black text-slate-950">Audience</dt>
              <dd className="mt-1 leading-6 text-slate-600">{selected.audience}</dd>
            </div>
            <div>
              <dt className="font-black text-slate-950">Offer</dt>
              <dd className="mt-1 leading-6 text-slate-600">{selected.offer}</dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
          The API rechecks the current Strategy Foundation, Market Intelligence, campaign inputs, permissions, and Marketing Spine signature before any ad is generated.
        </p>
      </aside>
    </div>
  );
}
