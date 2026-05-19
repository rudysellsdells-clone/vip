type LumaGenerationRequest = {
  prompt: string;
  model?: string;
  resolution?: string;
  duration?: "5s" | "9s";
  aspect_ratio?: string;
  loop?: boolean;
  callback_url?: string;
  keyframes?: Record<
    string,
    | {
        type: "image";
        url: string;
      }
    | {
        type: "generation";
        id: string;
      }
  >;
};

export type LumaGeneration = {
  id: string;
  state?: "queued" | "dreaming" | "completed" | "failed" | string;
  failure_reason?: string | null;
  created_at?: string;
  assets?: {
    video?: string;
    image?: string;
    thumbnail?: string;
    [key: string]: unknown;
  };
  version?: string;
  request?: Record<string, unknown>;
};

function getLumaApiKey() {
  const key = process.env.LUMA_API_KEY?.trim();

  if (!key) {
    throw new Error("Missing LUMA_API_KEY.");
  }

  return key;
}

function getBaseUrl() {
  return "https://api.lumalabs.ai/dream-machine/v1";
}

async function parseLumaResponse(response: Response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Luma API request failed: ${response.status} ${response.statusText} — ${text.slice(0, 800)}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unable to parse Luma response: ${text.slice(0, 500)}`);
  }
}

export async function createLumaGeneration(request: LumaGenerationRequest) {
  const response = await fetch(`${getBaseUrl()}/generations`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getLumaApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return (await parseLumaResponse(response)) as LumaGeneration;
}

export async function getLumaGeneration(generationId: string) {
  const response = await fetch(`${getBaseUrl()}/generations/${generationId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getLumaApiKey()}`,
    },
    cache: "no-store",
  });

  return (await parseLumaResponse(response)) as LumaGeneration;
}

export function getLumaVideoUrl(generation: LumaGeneration | null | undefined) {
  return generation?.assets?.video ?? null;
}

export function getPublicAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    ""
  );
}
