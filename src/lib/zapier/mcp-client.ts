import { getZapierToolArgs, getZapierToolName } from "@/lib/zapier/action-registry";

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: string | number | null;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

function getMcpServerUrl() {
  const url = process.env.ZAPIER_MCP_SERVER_URL?.trim();

  if (!url) {
    throw new Error("Missing ZAPIER_MCP_SERVER_URL.");
  }

  return url;
}

function getMcpToken() {
  return (
    process.env.ZAPIER_MCP_TOKEN?.trim() ||
    process.env.ZAPIER_MCP_AUTH_TOKEN?.trim() ||
    process.env.ZAPIER_MCP_BEARER_TOKEN?.trim() ||
    ""
  );
}

function responseLooksLikeHtml(value: string) {
  const normalized = value.trim().toLowerCase();

  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html");
}

function extractJsonFromServerSentEvents(text: string) {
  const dataLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, "").trim())
    .filter((line) => line && line !== "[DONE]");

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines[dataLines.length - 1];
}

function parseMcpResponse(text: string): JsonRpcResponse {
  if (responseLooksLikeHtml(text)) {
    throw new Error(
      `Unable to parse MCP response. Zapier returned HTML instead of JSON. Check ZAPIER_MCP_SERVER_URL and token. Preview: ${text.slice(0, 240)}`
    );
  }

  const trimmed = text.trim();
  const sseJson = extractJsonFromServerSentEvents(trimmed);
  const candidate = sseJson ?? trimmed;

  try {
    return JSON.parse(candidate) as JsonRpcResponse;
  } catch {
    throw new Error(`Unable to parse MCP response: ${text.slice(0, 500)}`);
  }
}

function extractNestedToolError(result: unknown) {
  if (!result || typeof result !== "object") return null;

  const maybeResult = result as {
    isError?: unknown;
    content?: Array<{ type?: string; text?: string }>;
  };

  const textContent = maybeResult.content
    ?.map((item) => (item.type === "text" && typeof item.text === "string" ? item.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!textContent) {
    return maybeResult.isError === true ? "Zapier MCP returned an error." : null;
  }

  try {
    const parsed = JSON.parse(textContent) as {
      error?: string;
      message?: string;
      errorDetails?: { message?: string };
    };

    const parsedError =
      parsed.error ?? parsed.message ?? parsed.errorDetails?.message ?? null;

    if (parsedError) {
      return parsedError;
    }
  } catch {
    // Non-JSON text is allowed unless it clearly looks like an MCP error.
  }

  if (/^MCP error/i.test(textContent) || /Input validation error/i.test(textContent)) {
    return textContent;
  }

  return maybeResult.isError === true ? textContent : null;
}

function readOptionString(options: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = options[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getCompatInput(options: Record<string, any>) {
  return (
    options.input ??
    options.mcpInput ??
    options.zapierInput ??
    options.toolRun?.input ??
    {}
  );
}

function getCompatActionName(options: Record<string, any>) {
  return (
    readOptionString(options, ["actionName", "action_name"]) ||
    readOptionString(options.toolRun ?? {}, ["actionName", "action_name"]) ||
    null
  );
}

function getCompatRequestId(options: Record<string, any>) {
  return (
    readOptionString(options, ["requestId", "toolRunId", "id"]) ||
    readOptionString(options.toolRun ?? {}, ["id"]) ||
    `zapier-${Date.now()}`
  );
}

function getCompatToolName(options: Record<string, any>, input: unknown, actionName: string | null) {
  const explicitToolName = readOptionString(options, [
    "toolName",
    "mcpToolName",
    "zapierToolName",
  ]);

  if (explicitToolName) {
    return explicitToolName;
  }

  const toolRunToolName = readOptionString(options.toolRun ?? {}, [
    "toolName",
    "mcpToolName",
    "zapierToolName",
  ]);

  if (toolRunToolName) {
    return toolRunToolName;
  }

  return getZapierToolName(input, actionName);
}

function getCompatToolArgs(
  options: Record<string, any>,
  input: unknown,
  actionName: string | null,
  toolName: string
) {
  const explicitArgs =
    options.toolArgs ??
    options.arguments ??
    options.mcpArgs ??
    options.zapierArgs;

  if (explicitArgs && typeof explicitArgs === "object" && !Array.isArray(explicitArgs)) {
    return explicitArgs as Record<string, unknown>;
  }

  return getZapierToolArgs(input, actionName, toolName);
}


function isGenericZapierExecutor(toolName: string) {
  return toolName === "execute_zapier_write_action" || toolName === "execute_zapier_read_action";
}

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function selectedApiForApp(app: unknown) {
  const normalized = String(app ?? "").trim().toLowerCase();

  if (normalized.includes("linkedin")) {
    return envValue("ZAPIER_LINKEDIN_SELECTED_API", "ZAPIER_MCP_LINKEDIN_SELECTED_API") || "LinkedInCLIAPI";
  }

  if (normalized.includes("facebook")) {
    return envValue("ZAPIER_FACEBOOK_SELECTED_API", "ZAPIER_MCP_FACEBOOK_SELECTED_API") || "FacebookV2CLIAPI";
  }

  if (normalized.includes("gmail") || normalized.includes("google mail")) {
    return envValue("ZAPIER_GMAIL_SELECTED_API", "ZAPIER_MCP_GMAIL_SELECTED_API") || "GoogleMailV2CLIAPI";
  }

  if (normalized.includes("wordpress")) {
    return envValue("ZAPIER_WORDPRESS_SELECTED_API", "ZAPIER_MCP_WORDPRESS_SELECTED_API") || "WordPressCLIAPI";
  }

  return envValue("ZAPIER_MCP_SELECTED_API");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeGenericZapierArgs(toolName: string, args: Record<string, unknown>) {
  if (!isGenericZapierExecutor(toolName)) {
    return args;
  }

  const normalized = { ...args };
  const app = normalized.app;
  const params = asRecord(normalized.params);

  normalized.selected_api =
    typeof normalized.selected_api === "string" && normalized.selected_api.trim()
      ? normalized.selected_api.trim()
      : selectedApiForApp(app);

  normalized.params = params;

  return normalized;
}

export async function callZapierMcpTool({
  toolName,
  args,
  requestId,
}: {
  toolName: string;
  args: Record<string, unknown>;
  requestId: string;
}) {
  const serverUrl = getMcpServerUrl();
  const normalizedArgs = normalizeGenericZapierArgs(toolName, args);
  const token = getMcpToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(serverUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: normalizedArgs,
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Zapier MCP request failed: ${response.status} ${response.statusText} — ${responseText.slice(0, 500)}`
    );
  }

  const payload = parseMcpResponse(responseText);

  if (payload.error) {
    const message = payload.error.message ?? "Unknown MCP error";

    if (payload.error.code === -32602 && message.toLowerCase().includes("tool") && message.toLowerCase().includes("not found")) {
      throw new Error(
        `MCP tool not found: ${toolName}. Your Zapier MCP server likely uses execute_zapier_write_action with an app/action key instead of a static tool name.`
      );
    }

    throw new Error(`Zapier MCP error: ${message}`);
  }

  const nestedError = extractNestedToolError(payload.result);

  if (nestedError) {
    throw new Error(nestedError);
  }

  return payload.result;
}

/**
 * Backwards-compatible export for older Zapier execution routes.
 */
export async function executeZapierMcpWriteAction(...args: any[]): Promise<any> {
  const options = (args[0] ?? {}) as Record<string, any>;
  const input = getCompatInput(options);
  const actionName = getCompatActionName(options);
  const requestId = getCompatRequestId(options);
  const toolName = getCompatToolName(options, input, actionName);
  const toolArgs = getCompatToolArgs(options, input, actionName, toolName);

  return callZapierMcpTool({
    toolName,
    args: toolArgs,
    requestId,
  });
}
