import "server-only";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function getStrategyMarketWorkspace({
  supabase,
  accountId,
}: {
  supabase: SupabaseLike;
  accountId: string;
}) {
  const [serviceLinesResult, audiencesResult, offersResult] = await Promise.all([
    supabase
      .from("service_lines")
      .select("id,name,short_name,description,primary_outcome")
      .eq("account_id", accountId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("buyer_segments")
      .select("id,name,description,common_pains,desired_outcomes,objections")
      .eq("account_id", accountId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("offers")
      .select(
        "id,service_line_id,name,description,offer_type,primary_cta,outcome,price_notes,target_buyer_segments",
      )
      .eq("account_id", accountId)
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  return {
    serviceLines: serviceLinesResult.data ?? [],
    audiences: audiencesResult.data ?? [],
    offers: offersResult.data ?? [],
  };
}
