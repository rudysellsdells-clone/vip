export type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
  profile?: {
    name?: string;
  };
  extra_snippets?: string[];
};

export type BraveSearchResponse = {
  query?: {
    original?: string;
    more_results_available?: boolean;
  };
  web?: {
    results?: BraveWebResult[];
  };
};

function getBraveApiKey() {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();

  if (!key) {
    throw new Error("Missing BRAVE_SEARCH_API_KEY.");
  }

  return key;
}

export async function searchBraveWeb({
  query,
  count = 10,
  country = "US",
  searchLang = "en",
}: {
  query: string;
  count?: number;
  country?: string;
  searchLang?: string;
}) {
  const safeCount = Math.max(1, Math.min(20, Number(count) || 10));
  const url = new URL("https://api.search.brave.com/res/v1/web/search");

  url.searchParams.set("q", query);
  url.searchParams.set("count", String(safeCount));
  url.searchParams.set("country", country || "US");
  url.searchParams.set("search_lang", searchLang || "en");
  url.searchParams.set("safesearch", "strict");
  url.searchParams.set("extra_snippets", "true");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": getBraveApiKey(),
    },
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Brave Search request failed: ${response.status} ${response.statusText} — ${text.slice(0, 500)}`
    );
  }

  try {
    return JSON.parse(text) as BraveSearchResponse;
  } catch {
    throw new Error(`Unable to parse Brave Search response: ${text.slice(0, 500)}`);
  }
}
