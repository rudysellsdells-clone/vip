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

function throwIfMcpToolError(json: any, toolText: string | null) {
  if (json?.error) {
    throw new Error(
      `MCP error ${json.error.code ?? ""}: ${json.error.message ?? JSON.stringify(json.error)}`
    );
  }

  if (json?.result?.isError === true || json?.isError === true) {
    if (toolText) {
      try {
        const parsedToolText = JSON.parse(toolText);
        throw new Error(
          parsedToolText?.error ??
            parsedToolText?.message ??
            parsedToolText?.errorDetails?.message ??
            toolText
        );
      } catch (error) {
        if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
          throw error;
        }

        throw new Error(toolText);
      }
    }

    throw new Error("Zapier MCP tool returned an error.");
  }

  if (toolText) {
    try {
      const parsedToolText = JSON.parse(toolText);

      if (parsedToolText?.isError === true || parsedToolText?.error) {
        throw new Error(
          parsedToolText?.error ??
            parsedToolText?.message ??
            parsedToolText?.errorDetails?.message ??
            toolText
        );
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes("Unexpected")) {
        throw error;
      }
    }
  }
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
  const toolText = extractToolText(json);

  throwIfMcpToolError(json, toolText);

  if (toolText) {
    try {
      const nested = JSON.parse(toolText);

      return {
        raw: json,
        text: toolText,
        parsedText: nested,
      };
    } catch {
      return {
        raw: json,
        text: toolText,
        parsedText: null,
      };
    }
  }

  return {
    raw: json,
    text,
    parsedText: null,
  };
}
