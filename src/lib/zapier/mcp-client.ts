import { assertZapierToolResultHasNoError } from "./result-utils";

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

type ZapierMcpWriteActionInput = {
  app: string;
  action: string;
  instructions: string;
  output: string;
  params?: Record<string, unknown>;
};

function getZapierMcpServerUrl() {
  const url = process.env.ZAPIER_MCP_SERVER_URL;
  if (!url) throw new Error("Missing ZAPIER_MCP_SERVER_URL environment variable.");
  return url;
}

function getZapierMcpAuthToken() {
  return process.env.ZAPIER_MCP_AUTH_TOKEN;
}

function parseMcpResponse(text: string): JsonRpcResponse {
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as JsonRpcResponse;

  const dataLines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""))
    .filter((line) => line && line !== "[DONE]");

  const lastJsonLine = dataLines.reverse().find((line) => line.startsWith("{"));
  if (!lastJsonLine) throw new Error(`Unable to parse MCP response: ${text.slice(0, 500)}`);
  return JSON.parse(lastJsonLine) as JsonRpcResponse;
}

function buildMcpHeaders(sessionId?: string) {
  const token = getZapierMcpAuthToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
  };
}

async function postJsonRpc(
  method: string,
  params: Record<string, unknown>,
  sessionId?: string
) {
  const response = await fetch(getZapierMcpServerUrl(), {
    method: "POST",
    headers: buildMcpHeaders(sessionId),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Zapier MCP request failed: ${response.status} ${response.statusText} — ${text}`);
  }

  const parsed = parseMcpResponse(text);
  if (parsed.error) throw new Error(`Zapier MCP error: ${parsed.error.message ?? "Unknown error"}`);

  return {
    result: parsed.result,
    sessionId:
      response.headers.get("mcp-session-id") ??
      response.headers.get("Mcp-Session-Id") ??
      sessionId,
  };
}

async function initializeZapierMcp() {
  try {
    const initialized = await postJsonRpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "rudys-vip",
        version: "0.1.0",
      },
    });
    return initialized.sessionId;
  } catch {
    return undefined;
  }
}

export async function executeZapierMcpWriteAction(input: ZapierMcpWriteActionInput) {
  const sessionId = await initializeZapierMcp();

  const argumentsPayload: Record<string, unknown> = {
    app: input.app,
    action: input.action,
    instructions: input.instructions,
    output: input.output,
  };

  if (input.params) argumentsPayload.params = input.params;

  const { result } = await postJsonRpc(
    "tools/call",
    {
      name: "execute_zapier_write_action",
      arguments: argumentsPayload,
    },
    sessionId
  );

  assertZapierToolResultHasNoError(result);
  return result;
}
