type CountOptions = {
  table: string;
  userId: string;
  userColumn?: string;
  filters?: Array<(query: any) => any>;
};

type SelectOptions = {
  table: string;
  userId: string;
  userColumn?: string;
  select?: string;
  filters?: Array<(query: any) => any>;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
};

export async function safeCount(
  supabase: any,
  {
    table,
    userId,
    userColumn = "user_id",
    filters = [],
  }: CountOptions
) {
  try {
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(userColumn, userId);

    for (const filter of filters) {
      query = filter(query);
    }

    const { count, error } = await query;

    if (error) {
      return {
        value: 0,
        error: error.message,
      };
    }

    return {
      value: count ?? 0,
      error: null,
    };
  } catch (error) {
    return {
      value: 0,
      error: error instanceof Error ? error.message : "Unknown reporting count error.",
    };
  }
}

export async function safeSelect(
  supabase: any,
  {
    table,
    userId,
    userColumn = "user_id",
    select = "*",
    filters = [],
    orderBy = "created_at",
    ascending = false,
    limit = 10,
  }: SelectOptions
) {
  try {
    let query = supabase
      .from(table)
      .select(select)
      .eq(userColumn, userId);

    for (const filter of filters) {
      query = filter(query);
    }

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      return {
        data: [],
        error: error.message,
      };
    }

    return {
      data: data ?? [],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unknown reporting select error.",
    };
  }
}

export function activeOnly(query: any) {
  return query.is("archived_at", null);
}

export function statusIs(status: string) {
  return (query: any) => query.eq("status", status);
}

export function typeIs(assetType: string) {
  return (query: any) => query.eq("asset_type", assetType);
}

export function typeIn(assetTypes: string[]) {
  return (query: any) => query.in("asset_type", assetTypes);
}

export function exportTypeIs(exportType: string) {
  return (query: any) => query.eq("export_type", exportType);
}

export function itemStatusIs(status: string) {
  return (query: any) => query.eq("status", status);
}

export function runStatusIs(status: string) {
  return (query: any) => query.eq("status", status);
}

export function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-US");
}

export function statusPercent(part: number, whole: number) {
  if (!whole) return "0%";

  return `${Math.round((part / whole) * 100)}%`;
}
