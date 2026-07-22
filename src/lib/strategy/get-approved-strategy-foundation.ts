import { fetchAccountMarketProfile } from "@/lib/accounts/account-market-profile";
import {
  buildApprovedStrategyFoundation,
  type StrategyFoundation,
} from "@/lib/strategy/strategy-foundation";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function getApprovedStrategyFoundation({
  supabase,
  accountId,
}: {
  supabase: SupabaseLike;
  accountId: string;
}): Promise<StrategyFoundation> {
  const [
    accountResult,
    brandProfileResult,
    cloneProfileResult,
    brandRulesResult,
    knowledgeSourcesResult,
    approvedExamplesResult,
    marketProfile,
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,website_url,primary_cta,updated_at")
      .eq("id", accountId)
      .maybeSingle(),
    supabase
      .from("account_brand_profiles")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("digital_clone_profiles")
      .select(
        "id,business_summary,audience_summary,offer_summary,voice_summary,sales_outcome_summary,updated_at",
      )
      .eq("account_id", accountId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("brand_rules")
      .select("id,rule_text,category,priority,updated_at")
      .eq("account_id", accountId)
      .eq("active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("knowledge_sources")
      .select("id,title,source_type,summary,content,updated_at")
      .eq("account_id", accountId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("content_examples")
      .select("id,title,content_type,source,updated_at")
      .eq("account_id", accountId)
      .eq("approved", true)
      .order("updated_at", { ascending: false })
      .limit(20),
    fetchAccountMarketProfile({ supabase, accountId }),
  ]);

  return buildApprovedStrategyFoundation({
    accountId,
    account: (accountResult.data ?? null) as Record<string, unknown> | null,
    brandProfile: (brandProfileResult.data ?? null) as Record<string, unknown> | null,
    cloneProfile: (cloneProfileResult.data ?? null) as Record<string, unknown> | null,
    brandRules: (brandRulesResult.data ?? []) as Array<Record<string, unknown>>,
    serviceLines: marketProfile.serviceLines,
    audiences: marketProfile.audiences,
    offers: marketProfile.offers,
    knowledgeSources: (knowledgeSourcesResult.data ?? []) as Array<Record<string, unknown>>,
    approvedExamples: (approvedExamplesResult.data ?? []) as Array<Record<string, unknown>>,
  });
}
