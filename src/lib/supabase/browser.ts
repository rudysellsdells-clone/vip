import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { assertPublicSupabaseConfig } from "@/lib/supabase/config";

export function createClient() {
  const { url, key } = assertPublicSupabaseConfig();
  return createBrowserClient<Database>(url, key);
}
