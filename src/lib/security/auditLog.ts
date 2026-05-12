import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

type AuditLogInput = {
  userId: string;
  activityType: string;
  title: string;
  description?: string | null;
  metadata?: Json;
};

export async function logActivity(
  supabase: SupabaseClient<Database>,
  input: AuditLogInput
) {
  const { error } = await supabase.from("activity_log").insert({
    user_id: input.userId,
    activity_type: input.activityType,
    title: input.title,
    description: input.description ?? null,
    metadata: input.metadata ?? {}
  });

  if (error) {
    console.error("Failed to write activity log", error);
  }
}
