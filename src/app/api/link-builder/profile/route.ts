import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { splitList } from "@/lib/link-builder/profile";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("directory_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  const payload = {
    user_id: user.id,
    profile_name: String(formData.get("profile_name") || "Web Search Pros Directory Profile"),
    business_name: String(formData.get("business_name") || ""),
    website_url: String(formData.get("website_url") || ""),
    business_email: String(formData.get("business_email") || ""),
    phone: String(formData.get("phone") || ""),
    address: String(formData.get("address") || ""),
    service_area: String(formData.get("service_area") || ""),
    logo_url: String(formData.get("logo_url") || ""),
    short_description: String(formData.get("short_description") || ""),
    long_description: String(formData.get("long_description") || ""),
    categories: splitList(formData.get("categories")),
    services: splitList(formData.get("services")),
    anchor_text_options: splitList(formData.get("anchor_text_options")),
    social_links: {
      facebook: String(formData.get("facebook_url") || ""),
      linkedin: String(formData.get("linkedin_url") || ""),
      youtube: String(formData.get("youtube_url") || ""),
    },
    active: true,
  };

  if (!payload.business_name || !payload.website_url) {
    return NextResponse.json({ error: "Business name and website URL are required." }, { status: 400 });
  }

  const result = id
    ? await supabase.from("directory_profiles").update(payload).eq("id", id).eq("user_id", user.id).select("*").single()
    : await supabase.from("directory_profiles").insert(payload).select("*").single();

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "directory_profile_saved",
    title: "Directory profile saved",
    description: payload.business_name,
    metadata: { profileId: result.data.id, websiteUrl: payload.website_url },
  });

  return NextResponse.json({ profile: result.data });
}
