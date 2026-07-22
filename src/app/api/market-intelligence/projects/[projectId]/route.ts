import { NextResponse } from "next/server";
import { logActivity } from "@/lib/security/auditLog";
import {
  MarketIntelligenceApiError,
  requireMarketIntelligenceApiContext,
} from "@/lib/market-intelligence/api-context";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

type RouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { projectId } = await params;
    const { supabase, user, accountId } =
      await requireMarketIntelligenceApiContext();

    const { data: project, error: projectError } = await supabase
      .from("market_research_projects")
      .select("id,title,status,metadata")
      .eq("id", projectId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 400 });
    }
    if (!project) {
      return NextResponse.json({ error: "Research run was not found." }, { status: 404 });
    }

    const metadata = object(project.metadata);
    const automation = object(metadata.automation);
    const automationStatus = String(automation.status ?? "").trim();

    if (automationStatus !== "failed") {
      return NextResponse.json(
        { error: "Only failed automated research runs can be deleted here." },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabase
      .from("market_research_projects")
      .delete()
      .eq("id", projectId)
      .eq("account_id", accountId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "failed_market_research_deleted",
      title: "Failed market research run deleted",
      description: String(project.title ?? "Failed automated market research run"),
      metadata: { accountId, projectId },
    });

    return NextResponse.json({ deleted: true, projectId });
  } catch (error) {
    if (error instanceof MarketIntelligenceApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete the failed research run.",
      },
      { status: 500 },
    );
  }
}
