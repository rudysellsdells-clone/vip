export const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const publicSupabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export function getPublicSupabaseConfig() {
  return {
    url: publicSupabaseUrl,
    key: publicSupabaseKey,
    hasUrl: Boolean(publicSupabaseUrl),
    hasKey: Boolean(publicSupabaseKey),
  };
}

export function assertPublicSupabaseConfig() {
  const config = getPublicSupabaseConfig();

  if (!config.hasUrl || !config.hasKey) {
    const missing = [
      !config.hasUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !config.hasKey ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
    ].filter(Boolean);

    throw new Error(`Missing Supabase public environment variable(s): ${missing.join(", ")}`);
  }

  return { url: config.url, key: config.key };
}
