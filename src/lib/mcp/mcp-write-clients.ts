type ZapierWriteActionArgs = {
  app: string;
  action: string;
  instructions: string;
  params?: Record<string, unknown> | null;
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function cleanRecord(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  );
}

function requiredString(value: unknown, fieldName: string) {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(`Missing Zapier MCP ${fieldName}.`);
  }

  return text;
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

function readableUnknown(value: unknown) {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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
        const message = readableUnknown(error);

        if (message && message !== "Unexpected end of JSON input") {
          throw new Error(message);
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
      const message = readableUnknown(error);

      if (message && !message.includes("Unexpected")) {
        throw new Error(message);
      }
    }
  }
}

function buildZapierWriteArguments({
  app,
  action,
  instructions,
  params,
  output,
}: ZapierWriteActionArgs) {
  const safeParams = cleanRecord(asRecord(params));

  return {
    app: requiredString(app, "app"),
    action: requiredString(action, "action"),
    instructions: requiredString(instructions, "instructions"),
    params: safeParams,
    output:
      String(output ?? "").trim() ||
      "Return the created record ID, URL if available, and any status or error details.",
  };
}

export async function executeZapierMcpWriteAction(args: ZapierWriteActionArgs) {
  const token = getZapierMcpToken();
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const zapierArguments = buildZapierWriteArguments(args);

  const requestBody = {
    jsonrpc: "2.0",
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`,
    method: "tools/call",
    params: {
      name: "execute_zapier_write_action",
      arguments: zapierArguments,
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
        requestArguments: zapierArguments,
      };
    } catch {
      return {
        raw: json,
        text: toolText,
        parsedText: null,
        requestArguments: zapierArguments,
      };
    }
  }

  return {
    raw: json,
    text,
    parsedText: null,
    requestArguments: zapierArguments,
  };
}
