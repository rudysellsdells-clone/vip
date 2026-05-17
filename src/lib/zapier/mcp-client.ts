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

  if (maybeResult.isError !== true) return null;

  const textContent = maybeResult.content?.find(
    (item) => item.type === "text" && typeof item.text === "string"
  )?.text;

  if (!textContent) {
    return "Zapier MCP returned an error.";
  }

  try {
    const parsed = JSON.parse(textContent) as {
      error?: string;
      message?: string;
    };

    return parsed.error ?? parsed.message ?? textContent;
  } catch {
    return textContent;
  }
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
        arguments: args,
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
