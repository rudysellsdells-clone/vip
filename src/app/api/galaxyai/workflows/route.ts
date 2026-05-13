import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listGalaxyAiWorkflows } from "@/lib/galaxyai/client";
import { logActivity } from "@/lib/security/auditLog";
import type { Json } from "@/types/database.types";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function getWorkflowId(workflow: Record<string, unknown>) {
  const id = workflow.id ?? workflow.workflow_id ?? workflow.workflowId;

  if (typeof id !== "string" || !id.trim()) {
    throw new Error("GalaxyAI workflow is missing an id.");
  }

  return id;
}

function getWorkflowName(workflow: Record<string, unknown>) {
  const name = workflow.name ?? workflow.title;

  if (typeof name === "string" && name.trim()) {
    return name;
  }

  return "Untitled GalaxyAI Workflow";
}

function getWorkflowDescription(workflow: Record<string, unknown>) {
  const description = workflow.description ?? workflow.summary;

  return typeof description === "string" ? description : null;
}

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
      const workflowRecord = workflow as Record<string, unknown>;
      const workflowId = getWorkflowId(workflowRecord);

      const { error } = await supabase.from("galaxyai_workflows").upsert(
        {
          user_id: user.id,
          galaxy_workflow_id: workflowId,
          name: getWorkflowName(workflowRecord),
          description: getWorkflowDescription(workflowRecord),
          metadata: toJson(workflow),
          active: true,
          last_synced_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,galaxy_workflow_id",
        }
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "galaxyai_workflows_synced",
      title: "GalaxyAI workflows synced",
      description: `Synced ${workflows.length} GalaxyAI workflows.`,
      metadata: {
        workflowCount: workflows.length,
      },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error syncing GalaxyAI workflows." },
      { status: 500 }
    );
  }
}
