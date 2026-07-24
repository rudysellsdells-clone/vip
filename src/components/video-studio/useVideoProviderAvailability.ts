"use client";

import { useEffect, useState } from "react";

export type VideoProviderAvailability = {
  luma: boolean;
  magica: boolean;
};

type ProviderStatusResponse = {
  providers?: VideoProviderAvailability;
};

export function useVideoProviderAvailability(
  initialAvailability?: VideoProviderAvailability,
) {
  const [availability, setAvailability] = useState<VideoProviderAvailability | null>(
    initialAvailability ?? null,
  );

  useEffect(() => {
    if (initialAvailability) return;

    let active = true;
    fetch("/api/video-studio/providers/status", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as ProviderStatusResponse;
        if (!response.ok || !result.providers) {
          throw new Error("Unable to load video provider status.");
        }
        if (active) setAvailability(result.providers);
      })
      .catch(() => {
        if (active) setAvailability({ luma: false, magica: false });
      });

    return () => {
      active = false;
    };
  }, [initialAvailability]);

  return {
    availability,
    loading: availability === null,
  };
}
