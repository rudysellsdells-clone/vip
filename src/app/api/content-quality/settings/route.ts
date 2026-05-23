import { NextResponse } from "next/server";
import {
  getOrCreateQualityGateSettings,
  normalizeQualityGateSettings,
} from "@/lib/content-quality/quality-gates";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function clampScore(value: unknown, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function approvalMode(value: unknown) {
  const mode = String(value ?? "").trim();

  if (mode === "mark_ready" || mode === "auto_approve" || mode === "disabled") {
    return mode;
  }

  return "mark_ready";
}

export async function GET() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await getOrCreateQualityGateSettings({
      supabase,
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      settings: normalizeQualityGateSettings(row),
      row,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected quality settings error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
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

  const payload = {
    user_id: user.id,
    overall_min: clampScore(body.overall_min, 90),
    brand_voice_min: clampScore(body.brand_voice_min, 85),
    clarity_min: clampScore(body.clarity_min, 80),
    cta_min: clampScore(body.cta_min, 85),
    seo_aio_min: clampScore(body.seo_aio_min, 75),
    conversion_min: clampScore(body.conversion_min, 80),
    approval_mode: approvalMode(body.approval_mode),
    require_human_approval: Boolean(body.require_human_approval),
    is_enabled: Boolean(body.is_enabled),
    metadata: {
      updatedFrom: "quality_settings_page",
      updatedAt: new Date().toISOString(),
    },
  };

  const { data, error } = await supabase
    .from("quality_gate_settings")
    .upsert(payload, {
      onConflict: "user_id",
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to save quality settings." },
      { status: 400 }
    );
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "quality_gate_settings_updated",
    title: "Quality gate settings updated",
    description: "Editable quality thresholds were updated.",
    metadata: payload,
  });

  return NextResponse.json({
    ok: true,
    settings: normalizeQualityGateSettings(data),
    row: data,
  });
}
