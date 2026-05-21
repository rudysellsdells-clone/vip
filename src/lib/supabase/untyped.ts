/**
 * Temporary compatibility helper for newly added tables that are not yet present
 * in generated Supabase TypeScript types.
 */
export function untypedSupabase<T>(client: T) {
  return client as any;
}
