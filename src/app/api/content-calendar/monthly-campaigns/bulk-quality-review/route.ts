import { NextResponse } from "next/server";
import { runMonthlyQualityReview } from "@/lib/content-quality/monthly-quality-review-runner";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function normalizeMonth(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) return text;

  return "";
}

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const month = normalizeMonth(body.month);

  if (!month) {
    return NextResponse.json(
      { error: "A valid month is required. Expected format: YYYY-MM." },
      { status: 400 }
    );
  }

  try {
    const stats = await runMonthlyQualityReview({
      supabase,
      userId: user.id,
      month,
      regenerateWeakAssets: body.regenerateWeakAssets !== false,
      maxRegenerations: Number(body.maxRegenerations ?? 1),
      includeAlreadyChecked: Boolean(body.includeAlreadyChecked),
    });

    return NextResponse.json({
      ok: true,
      month,
      ...stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected bulk quality review error.";

    return NextResponse.json(
      {
        error: message,
        hint:
          "Campaign generation may have succeeded. Check that the bulk quality review SQL fields exist, then run Bulk Quality Review manually from Monthly Review.",
      },
      { status: 400 }
    );
  }
}
