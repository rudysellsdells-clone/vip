import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export async function GET() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("directory_submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ submissions: data ?? [] });
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

  const formData = await request.formData();
  const submissionId = String(formData.get("id") || "");
  const status = String(formData.get("status") || "draft");
  const liveUrl = String(formData.get("live_url") || "");
  const submittedUrl = String(formData.get("submitted_url") || "");
  const notes = String(formData.get("notes") || "");

  if (!submissionId) {
    return NextResponse.json({ error: "Submission id is required." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    status,
    live_url: liveUrl || null,
    submitted_url: submittedUrl || null,
    notes,
  };

  if (status === "submitted") {
    updatePayload.submitted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("directory_submissions")
    .update(updatePayload)
    .eq("id", submissionId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ submission: data });
}
