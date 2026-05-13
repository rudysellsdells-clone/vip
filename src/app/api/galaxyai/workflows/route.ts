import { NextResponse } from "next/server";
import { listGalaxyAiWorkflows } from "@/lib/galaxyai/client";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/security/auditLog";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await listGalaxyAiWorkflows();

    for (const workflow of workflows) {
      await supabase.from("galaxyai_workflows").upsert(
        {
          user_id: user.id,
          galaxy_workflow_id: workflow.id,
          name: workflow.name,
          description: workflow.description ?? null,
          metadata: workflow,
          active: true,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,galaxy_workflow_id" }
      );
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "galaxyai_workflows_synced",
      title: "GalaxyAI workflows synced",
      description: `Synced ${workflows.length} workflows from GalaxyAI.`,
      metadata: { workflowCount: workflows.length },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error syncing GalaxyAI workflows." },
      { status: 400 }
    );
  }
}
