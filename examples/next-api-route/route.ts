/**
 * Example Next.js route integration.
 *
 * Location suggestion:
 * app/api/vip/publish/route.ts
 *
 * This is an example only. Merge the relevant pieces into your existing VIP route
 * instead of replacing a working route wholesale.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildSocialPublishPayload } from "@/src/lib/zapierMcpSocialActions";
import { normalizeZapierMcpPublishResponse } from "@/src/lib/zapierMcpPublishResponse";

type PublishRequestBody = {
  channel: "facebook_page" | "linkedin_page" | "linkedin_share";
  message: string;
  params?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PublishRequestBody;

    if (!body.message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing post message." },
        { status: 400 },
      );
    }

    const payload = buildSocialPublishPayload({
      channel: body.channel,
      message: body.message,
      params: body.params,
    });

    if (!payload.success) {
      return NextResponse.json(
        { success: false, error: payload.error },
        { status: 400 },
      );
    }

    /**
     * Replace this placeholder with your existing VIP Zapier MCP execution function.
     *
     * The important correction:
     * - payload.executor is the tool/executor layer
     * - payload.action is the real app action key
     *
     * For LinkedIn Page:
     * payload.action === "create_company_update"
     *
     * It should never be:
     * payload.action === "execute_zapier_write_action"
     */
    const zapierResponse = await executeVipZapierMcpWriteAction({
      app: payload.app!,
      action: payload.action!,
      instructions: payload.instructions!,
      params: payload.params!,
      output: payload.output!,
    });

    const platform =
      body.channel === "facebook_page"
        ? "Facebook"
        : body.channel.startsWith("linkedin")
          ? "LinkedIn"
          : "Social";

    const normalized = normalizeZapierMcpPublishResponse(
      zapierResponse,
      platform,
    );

    if (normalized.success) {
      return NextResponse.json({
        success: true,
        message: normalized.message,
        postId: normalized.postId,
        postUrl: normalized.postUrl,
        executionId: normalized.executionId,
        feedbackUrl: normalized.feedbackUrl,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: normalized.message,
        raw: normalized.raw,
      },
      { status: 502 },
    );
  } catch (error) {
    /**
     * Important:
     * Some wrappers may throw even when the nested Zapier response contains results.id.
     * Run the error message through the same success normalizer before returning failure.
     */
    const message = error instanceof Error ? error.message : String(error);
    const normalized = normalizeZapierMcpPublishResponse(message, "Social");

    if (normalized.success) {
      return NextResponse.json({
        success: true,
        message: normalized.message,
        postId: normalized.postId,
        postUrl: normalized.postUrl,
        executionId: normalized.executionId,
        feedbackUrl: normalized.feedbackUrl,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

/**
 * Placeholder. Replace this with your existing Zapier MCP client code.
 */
async function executeVipZapierMcpWriteAction(input: {
  app: string;
  action: string;
  instructions: string;
  params: Record<string, unknown>;
  output: string;
}): Promise<unknown> {
  throw new Error(
    `Replace executeVipZapierMcpWriteAction with your existing MCP client. Received action: ${input.action}`,
  );
}
