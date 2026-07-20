import { NextResponse } from "next/server";
import {
  activeWorkspaceManageRequiredMessage,
  activeWorkspaceRequiredMessage,
  getActiveWorkspaceForUser,
} from "@/lib/accounts/active-workspace";
import { provisionVipGalaxyAiWorkflows } from "@/lib/galaxyai/provisioning";
import { logActivity } from "@/lib/security/auditLog";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export async function POST() {
  try {
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

    if (!workspace) {
      return NextResponse.json({ error: activeWorkspaceRequiredMessage() }, { status: 400 });
    }

    if (!workspace.canManageActiveAccount) {
      return NextResponse.json({ error: activeWorkspaceManageRequiredMessage() }, { status: 403 });
    }

    const { data: existingRows } = await supabase
      .from("galaxyai_workflows")
      .select("galaxy_workflow_id, metadata")
      .eq("account_id", workspace.activeAccountId);

    const result = await provisionVipGalaxyAiWorkflows({
      existingWorkflows: ((existingRows ?? []) as Array<Record<string, unknown>>).flatMap((row) => {
        const workflowId = typeof row.galaxy_workflow_id === "string" ? row.galaxy_workflow_id : null;
        if (!workflowId) return [];
        return [{ workflowId, metadata: row.metadata ?? null }];
      }),
    });

    for (const workflow of [...result.reused, ...result.created]) {
      const { error } = await supabase.from("galaxyai_workflows").upsert(
        {
          user_id: user.id,
          account_id: workspace.activeAccountId,
          galaxy_workflow_id: workflow.workflowId,
          name: workflow.name,
          description: workflow.description,
          metadata: workflow.metadata,
          active: true,
          last_synced_at: new Date().toISOString(),
        },
        {
          onConflict: "account_id,galaxy_workflow_id",
        },
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "galaxyai_workflows_provisioned",
      title: "VIP GalaxyAI workflows provisioned",
      description: `Provisioned or verified ${result.created.length + result.reused.length} VIP GalaxyAI workflows for the active workspace.`,
      metadata: {
        accountId: workspace.activeAccountId,
        catalogCount: result.catalogCount,
        createdWorkflowIds: result.created.map((item) => item.workflowId),
        reusedWorkflowIds: result.reused.map((item) => item.workflowId),
        diagnostics: result.diagnostics,
      },
    });

    const ok = result.created.length + result.reused.length > 0;

    return NextResponse.json(
      {
        ok,
        created: result.created,
        reused: result.reused,
        diagnostics: result.diagnostics,
        selectedImageNode: result.imageNode,
        selectedVideoNode: result.videoNode,
      },
      { status: ok ? 200 : 400 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error provisioning GalaxyAI workflows." },
      { status: 500 },
    );
  }
}
