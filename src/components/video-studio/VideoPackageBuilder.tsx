"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  useVideoProviderAvailability,
  type VideoProviderAvailability,
} from "./useVideoProviderAvailability";

export type VideoCampaignOption = {
  id: string;
  name: string;
  objective: string;
  audience: string;
  offer: string;
};

export type VideoAdOption = {
  id: string;
  title: string;
  campaignName: string;
  channel: string;
  objective: string;
  audience: string;
};

type GenerateResponse = {
  message?: string;
  error?: string;
  asset?: { id?: string };
};

function initialProvider(availability: VideoProviderAvailability): "luma" | "magica" {
  if (availability.luma) return "luma";
  if (availability.magica) return "magica";
  return "luma";
}

export function VideoPackageBuilder({
  campaigns,
  ads,
  defaultDestinationUrl,
  providerAvailability: initialProviderAvailability,
  canManage,
}: {
  campaigns: VideoCampaignOption[];
  ads: VideoAdOption[];
  defaultDestinationUrl: string;
  providerAvailability?: VideoProviderAvailability;
  canManage: boolean;
}) {
  const router = useRouter();
  const { availability, loading: providerStatusLoading } =
    useVideoProviderAvailability(initialProviderAvailability);
  const providerAvailability = availability ?? { luma: false, magica: false };
  const [sourceType, setSourceType] = useState<"campaign" | "ad_package">(
    campaigns.length ? "campaign" : "ad_package",
  );
  const [sourceId, setSourceId] = useState(campaigns[0]?.id ?? ads[0]?.id ?? "");
  const [provider, setProvider] = useState<"luma" | "magica">(
    initialProvider(initialProviderAvailability ?? { luma: false, magica: false }),
  );
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [destinationUrl, setDestinationUrl] = useState(defaultDestinationUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assetId, setAssetId] = useState("");

  useEffect(() => {
    if (!availability || availability[provider]) return;
    setProvider(initialProvider(availability));
  }, [availability, provider]);

  const hasConfiguredProvider = providerAvailability.luma || providerAvailability.magica;
  const selectedProviderAvailable = providerAvailability[provider];
  const options = useMemo(
    () =>
      sourceType === "campaign"
        ? campaigns.map((campaign) => ({
            id: campaign.id,
            label: campaign.name,
            audience: campaign.audience,
          }))
        : ads.map((ad) => ({
            id: ad.id,
            label: ad.title,
            audience: ad.audience,
          })),
    [ads, campaigns, sourceType],
  );
  const selected = useMemo(
    () => options.find((option) => option.id === sourceId) ?? null,
    [options, sourceId],
  );

  function changeSourceType(next: "campaign" | "ad_package") {
    setSourceType(next);
    setSourceId(next === "campaign" ? campaigns[0]?.id ?? "" : ads[0]?.id ?? "");
    setMessage("");
    setError("");
  }

  async function generate() {
    setBusy(true);
    setMessage("");
    setError("");
    setAssetId("");
    try {
      const response = await fetch("/api/video-studio/packages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceId,
          provider,
          aspectRatio,
          destinationUrl,
        }),
      });
      const result = (await response.json()) as GenerateResponse;
      if (!response.ok) throw new Error(result.error || "Unable to create video package.");
      setMessage(result.message || "Video package created.");
      setAssetId(result.asset?.id || "");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create video package.");
    } finally {
      setBusy(false);
    }
  }

  if (!campaigns.length && !ads.length) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        Approve a campaign Marketing Spine or approve an Ad Studio package before creating video.
        <div className="mt-3 flex flex-wrap gap-4 max-sm:flex-col">
          <Link href="/campaigns" className="font-black underline">Open Campaigns →</Link>
          <Link href="/ad-studio" className="font-black underline">Open Ad Studio →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
      <div className="min-w-0 border border-slate-200 bg-white p-5 max-sm:p-4">
        {providerStatusLoading ? (
          <div className="mb-5 border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700" role="status">
            Checking video provider availability…
          </div>
        ) : !hasConfiguredProvider ? (
          <div className="mb-5 border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
            Video package generation is unavailable until Luma or Magica credentials are configured for this deployment.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Source type</label>
            <select
              value={sourceType}
              onChange={(event) => changeSourceType(event.target.value === "ad_package" ? "ad_package" : "campaign")}
              className="mt-2 min-h-11 w-full min-w-0 border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-950"
            >
              <option value="campaign" disabled={!campaigns.length}>Approved campaign</option>
              <option value="ad_package" disabled={!ads.length}>Approved ad package</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Source</label>
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className="mt-2 min-h-11 w-full min-w-0 border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-950"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Video provider</label>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value === "magica" ? "magica" : "luma")}
              disabled={providerStatusLoading || !hasConfiguredProvider}
              className="mt-2 min-h-11 w-full min-w-0 border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="luma" disabled={!providerAvailability.luma}>
                Luma Dream Machine{providerAvailability.luma ? "" : " — unavailable"}
              </option>
              <option value="magica" disabled={!providerAvailability.magica}>
                Magica{providerAvailability.magica ? "" : " — unavailable"}
              </option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Aspect ratio</label>
            <select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value === "9:16" ? "9:16" : event.target.value === "1:1" ? "1:1" : "16:9")}
              className="mt-2 min-h-11 w-full min-w-0 border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-950"
            >
              <option value="16:9">16:9 — landscape</option>
              <option value="9:16">9:16 — vertical</option>
              <option value="1:1">1:1 — square</option>
            </select>
          </div>
        </div>

        <label className="mt-5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Landing-page URL</label>
        <input
          type="url"
          inputMode="url"
          value={destinationUrl}
          onChange={(event) => setDestinationUrl(event.target.value)}
          className="mt-2 min-h-11 w-full min-w-0 border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950"
          placeholder="https://example.com/service"
        />

        <button
          type="button"
          onClick={generate}
          disabled={!canManage || !sourceId || !destinationUrl || busy || providerStatusLoading || !selectedProviderAvailable}
          className="mt-5 inline-flex min-h-11 items-center justify-center bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full"
        >
          {busy ? "Building Video Package…" : "Generate Video Package"}
        </button>

        <div aria-live="polite" aria-atomic="true">
          {error ? <p className="mt-4 break-words border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
          {message ? (
            <div className="mt-4 break-words border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              {message}{" "}
              {assetId ? <Link href={`/assets/${assetId}`} className="font-black underline">Open package →</Link> : null}
            </div>
          ) : null}
        </div>
      </div>

      <aside className="min-w-0 border border-slate-200 bg-slate-50 p-5 max-sm:p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">What VIP creates</p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <li><strong>20-second concept</strong> with a fast hook and one CTA.</li>
          <li><strong>Four-scene shot list</strong> with visual direction and voiceover.</li>
          <li><strong>Provider-ready package</strong> for Luma or Magica.</li>
          <li><strong>Approval gate</strong> before any provider render starts.</li>
        </ul>
        {selected ? (
          <div className="mt-5 break-words border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            Source: <strong>{selected.label}</strong>
            {selected.audience ? <> for <strong>{selected.audience}</strong></> : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
