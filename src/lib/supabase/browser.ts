import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/utils/env";

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey()
  );
}
