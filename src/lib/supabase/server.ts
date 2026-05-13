import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/utils/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // This can happen when called from a Server Component.
            // Proxy refreshes sessions when configured.
          }
        }
      }
    }
  );
}
