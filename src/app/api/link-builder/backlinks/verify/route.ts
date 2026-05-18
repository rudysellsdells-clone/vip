import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDomain, normalizeUrl } from "@/lib/link-builder/directory-scoring";
import { verifyBacklinkInHtml } from "@/lib/link-builder/backlink-verifier";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const sourceUrl = normalizeUrl(String(formData.get("source_url") || ""));
  const targetUrl = normalizeUrl(String(formData.get("target_url") || ""));
  const notes = String(formData.get("notes") || "");

  if (!sourceUrl || !targetUrl) return NextResponse.json({ error: "Source URL and target URL are required." }, { status: 400 });

  let verification: any = { found: false, linkType: "unknown", anchorText: null, status: "needs_review" };
  try {
    const response = await fetch(sourceUrl, { headers: { "User-Agent": "RudysVIP-LinkVerifier/1.0" }, signal: AbortSignal.timeout(15000) });
    verification = verifyBacklinkInHtml({ html: await response.text(), targetUrl });
  } catch {}

  const { data, error } = await supabase.from("acquired_backlinks").insert({
    user_id: user.id,
    source_domain: extractDomain(sourceUrl),
    source_url: sourceUrl,
    target_url: targetUrl,
    anchor_text: verification.anchorText,
    link_type: verification.linkType,
    first_seen_at: verification.found ? new Date().toISOString() : null,
    last_checked_at: new Date().toISOString(),
    status: verification.status,
    notes,
  }).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ backlink: data, verification });
}
