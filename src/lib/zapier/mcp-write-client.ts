type ZapierWriteActionArgs = {
  app: string;
  action: string;
  instructions: string;
  params?: Record<string, unknown>;
  output?: string;
};

function getZapierMcpServerUrl() {
  const url = process.env.ZAPIER_MCP_SERVER_URL?.trim();

  if (!url) {
    throw new Error("Missing ZAPIER_MCP_SERVER_URL.");
  }

  return url;
}

function getZapierMcpToken() {
  return process.env.ZAPIER_MCP_TOKEN?.trim() || "";
}

function parseSsePayload(text: string) {
  const dataLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""))
    .filter((line) => line && line !== "[DONE]");

  const parsed: unknown[] = [];

  for (const line of dataLines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      // Ignore non-JSON SSE fragments.
    }
  }

  return parsed.length ? parsed[parsed.length - 1] : null;
}

function parsePossibleJson(text: string, contentType: string) {
  if (contentType.includes("text/event-stream")) {
    const sse = parseSsePayload(text);
    if (sse) return sse;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractToolText(result: any) {
  const content = result?.result?.content ?? result?.content;

  if (!Array.isArray(content)) {
    return null;
  }

  const textParts = content
    .map((item) => (typeof item?.text === "string" ? item.text : ""))
    .filter(Boolean);

  return textParts.join("\n").trim() || null;
}

export async function executeZapierMcpWriteAction({
  app,
  action,
  instructions,
  params = {},
  output = "Return the created record ID, URL if available, and any status or error details.",
}: ZapierWriteActionArgs) {
  const token = getZapierMcpToken();
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestBody = {
    jsonrpc: "2.0",
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`,
    method: "tools/call",
    params: {
      name: "execute_zapier_write_action",
      arguments: {
        app,
        action,
        instructions,
        params,
        output,
      },
    },
  };

  const response = await fetch(getZapierMcpServerUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const parsed = parsePossibleJson(text, contentType);

  if (!response.ok) {
    throw new Error(
      `Zapier MCP request failed: ${response.status} ${response.statusText} — ${text.slice(0, 1000)}`
    );
  }

  const json = parsed as any;

  if (json?.error) {
    throw new Error(
      `MCP error ${json.error.code ?? ""}: ${json.error.message ?? JSON.stringify(json.error)}`
    );
  }

  const toolText = extractToolText(json);

  if (toolText) {
    try {
      const nested = JSON.parse(toolText);

      if (nested?.isError || nested?.error) {
        throw new Error(nested?.error ?? nested?.errorDetails?.message ?? toolText);
      }

      return {
        raw: json,
        text: toolText,
        parsedText: nested,
      };
    } catch (error) {
      if (error instanceof Error && toolText.includes('"isError":true')) {
        throw error;
      }

      return {
        raw: json,
        text: toolText,
        parsedText: null,
      };
    }
  }

  return {
    raw: json,
    text: text,
    parsedText: null,
  };
}
