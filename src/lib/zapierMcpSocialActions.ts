/**
 * VIP Zapier MCP Social Publish Action Map
 *
 * Purpose:
 * Keep the Zapier MCP executor/tool name separate from the actual app action key.
 *
 * Correct LinkedIn Page publishing:
 * executor/tool: execute_zapier_write_action
 * app: LinkedIn
 * action: create_company_update
 *
 * Wrong:
 * action: execute_zapier_write_action
 */

export type SocialPublishChannel =
  | "facebook_page"
  | "linkedin_page"
  | "linkedin_share";

export type ZapierMcpExecutor =
  | "execute_zapier_write_action"
  | "execute_zapier_read_action";

export interface ZapierMcpActionConfig {
  executor: ZapierMcpExecutor;
  app: string;
  action: string;
  instructions: string;
  output: string;
}

export interface BuildSocialPublishPayloadInput {
  channel: SocialPublishChannel;
  message: string;
  params?: Record<string, unknown>;
}

export type BuildSocialPublishPayloadResult =
  | {
      success: true;
      executor: ZapierMcpExecutor;
      app: string;
      action: string;
      instructions: string;
      output: string;
      params: Record<string, unknown>;
    }
  | {
      success: false;
      error: string;
    };

const RESERVED_EXECUTOR_NAMES = new Set<string>([
  "execute_zapier_write_action",
  "execute_zapier_read_action",
]);

export const SOCIAL_PUBLISH_ACTIONS: Record<
  SocialPublishChannel,
  ZapierMcpActionConfig
> = {
  facebook_page: {
    executor: "execute_zapier_write_action",
    app: "Facebook Pages",
    action: "facebook_pages_create_page_post",
    instructions:
      "Create a Facebook Page post using the structured params provided with this tool call. Use params.message as the Facebook post body.",
    output:
      "Return the created Facebook post id, url if available, execution id, and confirmation status.",
  },

  linkedin_page: {
    executor: "execute_zapier_write_action",
    app: "LinkedIn",
    action: "create_company_update",
    instructions:
      "Create a LinkedIn Company/Page update using the structured params provided with this tool call. Use params.message as the LinkedIn post body. Do not use execute_zapier_write_action as the LinkedIn action key.",
    output:
      "Return the created LinkedIn update id, url if available, execution id, and confirmation status.",
  },

  linkedin_share: {
    executor: "execute_zapier_write_action",
    app: "LinkedIn",
    action: "share",
    instructions:
      "Create a LinkedIn share update using the structured params provided with this tool call. Use params.message as the LinkedIn post body.",
    output:
      "Return the created LinkedIn share id, url if available, execution id, and confirmation status.",
  },
};

export function validateZapierMcpActionConfig(
  config: ZapierMcpActionConfig,
): { success: true } | { success: false; error: string } {
  if (!config.app) {
    return { success: false, error: "Missing Zapier MCP app name." };
  }

  if (!config.action) {
    return { success: false, error: "Missing Zapier MCP app action key." };
  }

  if (RESERVED_EXECUTOR_NAMES.has(config.action)) {
    return {
      success: false,
      error:
        `Invalid Zapier MCP action key "${config.action}". ` +
        "That is an executor/tool name, not an app action key. " +
        "For LinkedIn Page publishing, use create_company_update.",
    };
  }

  return { success: true };
}

export function buildSocialPublishPayload(
  input: BuildSocialPublishPayloadInput,
): BuildSocialPublishPayloadResult {
  const config = SOCIAL_PUBLISH_ACTIONS[input.channel];

  if (!config) {
    return {
      success: false,
      error: `Unsupported social publish channel: ${input.channel}`,
    };
  }

  const validation = validateZapierMcpActionConfig(config);

  if (!validation.success) {
    return {
      success: false,
      error: validation.error,
    };
  }

  return {
    success: true,
    executor: config.executor,
    app: config.app,
    action: config.action,
    instructions: config.instructions,
    output: config.output,
    params: {
      ...(input.params ?? {}),
      message: input.message,
    },
  };
}
