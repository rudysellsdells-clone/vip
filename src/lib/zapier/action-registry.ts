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
    defaultToolName: "linkedin_create_company_update",
    envToolNameKey: "ZAPIER_LINKEDIN_MCP_TOOL_NAME",
  },
} satisfies Record<string, ZapierActionConfig>;

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function getZapierInputObject(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

export function getZapierActionConfig(input: unknown, actionName?: string | null) {
  const objectInput = getZapierInputObject(input);
  const policyKey = readString(objectInput.policyKey);
  const app = readString(objectInput.app);
  const action = readString(objectInput.action);
  const normalizedActionName = (actionName ?? "").toLowerCase();

  const configs = Object.values(ZAPIER_ACTIONS);

  return configs.find((config) => {
    return (
      policyKey === config.policyKey ||
      (app === config.app && action === config.action) ||
      normalizedActionName.includes(config.policyKey) ||
      normalizedActionName.includes(config.app.toLowerCase()) ||
      normalizedActionName.includes(config.action.toLowerCase())
    );
  }) ?? null;
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

export function getZapierToolArgs(input: unknown) {
  const objectInput = getZapierInputObject(input);
  const params = objectInput.params;

  if (params && typeof params === "object" && !Array.isArray(params)) {
    return params as Record<string, unknown>;
  }

  return objectInput;
}
