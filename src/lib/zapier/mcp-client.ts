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
  return value.trim().toLowerCase().startsWith("<!doctype html") ||
    value.trim().toLowerCase().startsWith("<html");
}

function parseMcpResponse(text: string): JsonRpcResponse {
  if (responseLooksLikeHtml(text)) {
    throw new Error(
      `Unable to parse MCP response. Zapier returned HTML instead of JSON. Check ZAPIER_MCP_SERVER_URL and token. Preview: ${text.slice(0, 240)}`
    );
  }

  try {
    return JSON.parse(text) as JsonRpcResponse;
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
    const parsed = JSON.parse(textContent) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? textContent;
  } catch {
    return textContent;
  }
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
    throw new Error(
      `Zapier MCP error: ${payload.error.message ?? "Unknown MCP error"}`
    );
  }

  const nestedError = extractNestedToolError(payload.result);

  if (nestedError) {
    throw new Error(nestedError);
  }

  return payload.result;
}
