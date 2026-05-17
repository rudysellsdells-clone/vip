export type ZapierActionConfig = {
  policyKey: string;
  app: string;
  action: string;
  defaultToolName: string;
  envToolNameKey: string;
};

export const ZAPIER_ACTIONS = {
  gmailDraft: {
    policyKey: "gmail_create_draft",
    app: "Gmail",
    action: "create_draft",
    defaultToolName: "gmail_create_draft",
    envToolNameKey: "ZAPIER_GMAIL_DRAFT_TOOL_NAME",
  },
  facebookPagePost: {
    policyKey: "facebook_pages_page_stream",
    app: "Facebook Pages",
    action: "page_stream",
    defaultToolName: "facebook_pages_page_stream",
    envToolNameKey: "ZAPIER_FACEBOOK_PAGE_POST_TOOL_NAME",
  },
  linkedinCompanyPost: {
    policyKey: "linkedin_create_company_update",
    app: "LinkedIn",
    action: "create_company_update",
    defaultToolName: "execute_zapier_write_action",
    envToolNameKey: "ZAPIER_LINKEDIN_MCP_TOOL_NAME",
  },
} satisfies Record<string, ZapierActionConfig>;

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function getZapierInputObject(input: unknown) {
  return readObject(input);
}

export function getZapierActionConfig(input: unknown, actionName?: string | null) {
  const objectInput = getZapierInputObject(input);
  const policyKey = readString(objectInput.policyKey);
  const app = readString(objectInput.app);
  const action = readString(objectInput.action);
  const normalizedActionName = (actionName ?? "").toLowerCase();

  const configs = Object.values(ZAPIER_ACTIONS);

  return (
    configs.find((config) => {
      return (
        policyKey === config.policyKey ||
        (app === config.app && action === config.action) ||
        normalizedActionName.includes(config.policyKey) ||
        normalizedActionName.includes(config.app.toLowerCase()) ||
        normalizedActionName.includes(config.action.toLowerCase())
      );
    }) ?? null
  );
}

export function getZapierToolName(input: unknown, actionName?: string | null) {
  const objectInput = getZapierInputObject(input);

  const explicitToolName =
    readString(objectInput.mcpToolName) ||
    readString(objectInput.toolName) ||
    readString(objectInput.zapierToolName);

  if (explicitToolName) {
    return explicitToolName;
  }

  const config = getZapierActionConfig(input, actionName);

  if (!config) {
    throw new Error(
      `Unsupported Zapier action${actionName ? `: ${actionName}` : ""}.`
    );
  }

  return process.env[config.envToolNameKey]?.trim() || config.defaultToolName;
}

function isGenericZapierExecutor(toolName?: string | null) {
  return toolName === "execute_zapier_write_action" || toolName === "execute_zapier_read_action";
}

function buildGenericZapierInstructions({
  input,
  params,
  config,
}: {
  input: Record<string, unknown>;
  params: Record<string, unknown>;
  config: ZapierActionConfig;
}) {
  const approvedContent = firstString(
    params.text,
    params.body,
    params.comment,
    params.update_text,
    params.post_text,
    params.content,
    input.content
  );

  const pageName = firstString(
    input.pageName,
    params.page_name,
    params.company_page,
    params.company,
    params.organization,
    params.page
  );

  const organizationId = firstString(
    input.organizationId,
    params.organization_id,
    params.organizationId
  );

  const baseInstructions =
    firstString(input.instructions) ||
    `Execute the ${config.app} action ${config.action}.`;

  const lines = [
    baseInstructions,
    "",
    `App: ${config.app}`,
    `Action key: ${config.action}`,
  ];

  if (pageName) {
    lines.push(`Target company/page name: ${pageName}`);
  }

  if (organizationId) {
    lines.push(`Target organization/page ID: ${organizationId}`);
  }

  if (approvedContent) {
    lines.push("", "Approved content to use exactly:", approvedContent);
  }

  if (config.app === "LinkedIn") {
    lines.push(
      "",
      "Important LinkedIn safety rule: publish to the configured company page only. Do not publish to a personal profile."
    );
  }

  return lines.join("\n");
}

function buildGenericZapierOutput(config: ZapierActionConfig) {
  if (config.app === "LinkedIn") {
    return "Return the LinkedIn company update result, including the post id or URL if available.";
  }

  if (config.app === "Facebook Pages") {
    return "Return the Facebook Pages publishing result, including the post id or URL if available.";
  }

  if (config.app === "Gmail") {
    return "Return the Gmail draft result, including the draft id if available.";
  }

  return "Return the Zapier execution result.";
}

export function getZapierToolArgs(
  input: unknown,
  actionName?: string | null,
  toolName?: string | null
) {
  const objectInput = getZapierInputObject(input);
  const params = readObject(objectInput.params);
  const config = getZapierActionConfig(input, actionName);

  if (config && isGenericZapierExecutor(toolName)) {
    return {
      app: config.app,
      action: config.action,
      instructions: buildGenericZapierInstructions({
        input: objectInput,
        params,
        config,
      }),
      output: buildGenericZapierOutput(config),
    };
  }

  if (Object.keys(params).length > 0) {
    return params;
  }

  return objectInput;
}
