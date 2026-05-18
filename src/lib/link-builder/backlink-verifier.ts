function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function domainOf(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); }
  catch { return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; }
}

export function verifyBacklinkInHtml({ html, targetUrl }: { html: string; targetUrl: string }) {
  const targetDomain = domainOf(targetUrl);
  const regex = new RegExp(`<a[^>]+href=["'][^"']*${escapeRegex(targetDomain)}[^"']*["'][^>]*>(.*?)<\\/a>`, "is");
  const match = html.match(regex);

  if (!match) return { found: false, linkType: "unknown", anchorText: null, status: "not_found" } as const;

  const tag = match[0].toLowerCase();
  const anchorText = match[1]?.replace(/<[^>]*>/g, "").trim() ?? null;
  const linkType = tag.includes("sponsored") ? "sponsored" : tag.includes("ugc") ? "ugc" : tag.includes("nofollow") ? "nofollow" : "follow";

  return { found: true, linkType, anchorText, status: linkType === "follow" ? "live" : "nofollow" } as const;
}
