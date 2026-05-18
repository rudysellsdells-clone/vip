/**
 * Temporary compatibility helper for newly added tables that are not yet present
 * in the generated Supabase Database TypeScript types.
 *
 * Long-term, regenerate Supabase types after running migrations and remove this.
 */
export function untypedSupabase<T>(client: T) {
  return client as any;
}
