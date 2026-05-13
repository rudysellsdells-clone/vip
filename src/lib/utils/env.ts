export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  galaxyAiApiKey: process.env.GALAXYAI_API_KEY ?? "",
  galaxyAiWebhookSecret: process.env.GALAXYAI_WEBHOOK_SECRET ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
};
