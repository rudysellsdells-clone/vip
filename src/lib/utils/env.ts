export function getPublicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  return supabaseUrl;
}

export function getSupabasePublishableKey() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!publishableKey) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  return publishableKey;
}

export function getServerEnv() {
  return {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    galaxyAiApiKey: process.env.GALAXYAI_API_KEY,
    galaxyAiWebhookSecret: process.env.GALAXYAI_WEBHOOK_SECRET,
    openAiApiKey: process.env.OPENAI_API_KEY,
    zapierMcpServerUrl: process.env.ZAPIER_MCP_SERVER_URL
  };
}
