import { NextResponse } from "next/server";
import {
  activeWorkspaceManageRequiredMessage,
  activeWorkspaceRequiredMessage,
  getActiveWorkspaceForUser,
} from "@/lib/accounts/active-workspace";
import { getAccountWriteClient } from "@/lib/accounts/account-utils";
import { parseKnowledgeDocument } from "@/lib/knowledge/document-parser";
import { storeKnowledgeDocument } from "@/lib/knowledge/document-storage";
import { logActivity } from "@/lib/security/auditLog";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const runtime = "nodejs";

function getString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function getTags(value: unknown) {
  return String(value ?? "")
    .split(/,|\r?\n/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Uploaded brand learning document";
}

export async function POST(request: Request) {
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

    const writeSupabase = getAccountWriteClient();

    if (!writeSupabase) {
      return NextResponse.json(
        { error: "Uploading brand learning documents requires SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const documentValue = formData.get("document");

    if (!(documentValue instanceof File)) {
      return NextResponse.json({ error: "Please choose a document to upload." }, { status: 400 });
    }

    const parsed = await parseKnowledgeDocument(documentValue);
    const stored = await storeKnowledgeDocument({
      accountId: workspace.activeAccountId,
      file: documentValue,
    });
    const title = getString(formData.get("title"), titleFromFileName(documentValue.name));
    const summary = getString(formData.get("summary"), `Uploaded ${parsed.detectedType.toUpperCase()} document: ${documentValue.name}`);
    const tags = Array.from(new Set([...getTags(formData.get("tags")), "uploaded_document", parsed.detectedType]));

    const { data: source, error: sourceError } = await writeSupabase
      .from("knowledge_sources")
      .insert({
        user_id: user.id,
        account_id: workspace.activeAccountId,
        title,
        source_type: "uploaded_document",
        source_url: null,
        content: parsed.text,
        summary,
        tags,
        active: true,
        original_file_name: stored.fileName,
        storage_bucket: stored.bucket,
        storage_path: stored.storagePath,
        file_mime_type: stored.contentType,
        file_size_bytes: stored.fileSizeBytes,
        extracted_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "knowledge_document_uploaded",
      title: "Knowledge document uploaded",
      description: title,
      metadata: {
        sourceId: source.id,
        accountId: workspace.activeAccountId,
        fileName: stored.fileName,
        storageBucket: stored.bucket,
        storagePath: stored.storagePath,
        detectedType: parsed.detectedType,
      },
    });

    return NextResponse.json({ source, title });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error uploading knowledge document." },
      { status: 500 },
    );
  }
}
