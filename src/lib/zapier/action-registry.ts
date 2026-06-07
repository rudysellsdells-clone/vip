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
  facebookTextPost: {
    policyKey: "facebook_pages_page_stream",
    app: "Facebook Pages",
    action: "page_stream",
    defaultToolName: "execute_zapier_write_action",
    envToolNameKey: "ZAPIER_FACEBOOK_MCP_TOOL_NAME",
  },
  facebookPhotoPost: {
    policyKey: "facebook_pages_page_photo",
    app: "Facebook Pages",
    action: "page_photo",
    defaultToolName: "execute_zapier_write_action",
    envToolNameKey: "ZAPIER_FACEBOOK_MCP_TOOL_NAME",
  },
  facebookVideoPost: {
    policyKey: "facebook_pages_page_video",
    app: "Facebook Pages",
    action: "page_video",
    defaultToolName: "execute_zapier_write_action",
    envToolNameKey: "ZAPIER_FACEBOOK_MCP_TOOL_NAME",
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

function nonEmptyRecord(value: Record<string, unknown>) {
  return Object.values(value).some((item) => item !== null && item !== undefined && item !== "");
}

function pickKnownParams(input: Record<string, unknown>, keys: string[]) {
  const picked: Record<string, unknown> = {};

  for (const key of keys) {
    const value = input[key];

    if (value !== null && value !== undefined && value !== "") {
      picked[key] = value;
    }
  }

  return picked;
}

function paramsForConfig(input: Record<string, unknown>, config: ZapierActionConfig) {
  const explicitParams = readObject(input.params);

  if (nonEmptyRecord(explicitParams)) {
    return explicitParams;
  }

  const normalizedApp = config.app.toLowerCase();

  if (normalizedApp.includes("linkedin")) {
    return pickKnownParams(input, [
      "comment",
      "message",
      "content",
      "text",
      "company_id",
      "company",
      "organization_id",
      "linkedin_page_name",
      "allow_reserved_characters",
      "image",
      "image_url",
      "hosted_image_url",
      "media_url",
      "image_type",
    ]);
  }

  if (normalizedApp.includes("facebook")) {
    return pickKnownParams(input, [
      "message",
      "content",
      "Page",
      "page",
      "page_id",
      "pageId",
      "facebook_page_id",
      "facebookPageId",
      "source",
      "photo_url",
      "picture",
      "image_url",
      "hosted_image_url",
      "media_url",
    ]);
  }

  if (normalizedApp.includes("gmail")) {
    return pickKnownParams(input, [
      "to",
      "recipient",
      "subject",
      "body",
      "message",
      "content",
      "html",
      "cc",
      "bcc",
    ]);
  }

  return explicitParams;
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


function selectedApiForApp(app: string) {
  const normalized = String(app ?? "").trim().toLowerCase();

  if (normalized === "linkedin" || normalized.includes("linkedin")) {
    return (
      process.env.ZAPIER_LINKEDIN_SELECTED_API?.trim() ||
      process.env.ZAPIER_MCP_LINKEDIN_SELECTED_API?.trim() ||
      "LinkedInCLIAPI"
    );
  }

  if (normalized === "facebook" || normalized.includes("facebook")) {
    return (
      process.env.ZAPIER_FACEBOOK_SELECTED_API?.trim() ||
      process.env.ZAPIER_MCP_FACEBOOK_SELECTED_API?.trim() ||
      "FacebookV2CLIAPI"
    );
  }

  if (normalized === "gmail" || normalized.includes("gmail") || normalized.includes("google mail")) {
    return (
      process.env.ZAPIER_GMAIL_SELECTED_API?.trim() ||
      process.env.ZAPIER_MCP_GMAIL_SELECTED_API?.trim() ||
      "GoogleMailV2CLIAPI"
    );
  }

  if (normalized === "wordpress" || normalized.includes("wordpress")) {
    return (
      process.env.ZAPIER_WORDPRESS_SELECTED_API?.trim() ||
      process.env.ZAPIER_MCP_WORDPRESS_SELECTED_API?.trim() ||
      "WordPressCLIAPI"
    );
  }

  return process.env.ZAPIER_MCP_SELECTED_API?.trim() || "";
}

function isGenericZapierExecutor(toolName?: string | null) {
  return toolName === "execute_zapier_write_action" || toolName === "execute_zapier_read_action";
}

function formatExactFieldValues(params: Record<string, unknown>) {
  const lines = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      const serialized = Array.isArray(value)
        ? JSON.stringify(value)
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

      return `- ${key}: ${serialized}`;
    });

  if (lines.length === 0) {
    return "";
  }

  return ["Use these exact Zapier field values:", ...lines].join("\n");
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
  const baseInstructions =
    firstString(input.instructions) ||
    `Execute the ${config.app} action ${config.action}.`;

  const fieldValues = formatExactFieldValues(params);
  const mediaUploadMode = firstString(input.mediaUploadMode);
  const primaryMediaUrl = firstString(input.primaryMediaUrl);

  const lines = [
    baseInstructions,
    "",
    `App: ${config.app}`,
    `Action key: ${config.action}`,
  ];

  if (mediaUploadMode) {
    lines.push(`Media upload mode: ${mediaUploadMode}`);
  }

  if (primaryMediaUrl) {
    lines.push(`Primary media URL for upload field: ${primaryMediaUrl}`);
  }

  if (fieldValues) {
    lines.push("", fieldValues);
  }

  lines.push(
    "",
    "Do not paste the media URL into the public post text unless the selected Zapier action explicitly requires it as an upload/source field."
  );

  if (config.app === "LinkedIn") {
    lines.push(
      "LinkedIn rule: use image as the native image upload field and image_type as post_media when an image is provided. Do not publish to a personal profile."
    );
  }

  if (config.app === "Facebook Pages") {
    lines.push(
      "Facebook rule: use source as the native photo/video upload field for page_photo or page_video. Do not publish to a personal profile."
    );
  }

  return lines.join("\n");
}

function buildGenericZapierOutput(config: ZapierActionConfig) {
  if (config.app === "LinkedIn") {
    return "Return the LinkedIn company update result, including post id, URL, and whether the image was uploaded as post media.";
  }

  if (config.app === "Facebook Pages") {
    return "Return the Facebook Pages publishing result, including post id, URL, and whether media was uploaded through the source field.";
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
  const config = getZapierActionConfig(input, actionName);
  const params = config ? paramsForConfig(objectInput, config) : readObject(objectInput.params);

  if (config && isGenericZapierExecutor(toolName)) {
    return {
      selected_api: firstString(
        objectInput.selected_api,
        objectInput.selectedApi,
        selectedApiForApp(config.app)
      ),
      app: config.app,
      action: config.action,
      instructions: buildGenericZapierInstructions({
        input: objectInput,
        params,
        config,
      }),
      params,
      output: buildGenericZapierOutput(config),
    };
  }

  if (Object.keys(params).length > 0) {
    return params;
  }

  return objectInput;
}
