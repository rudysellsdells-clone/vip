type ZapierWriteActionArgs = {
  app: string;
  action: string;
  instructions: string;
  params?: Record<string, unknown> | null;
  output?: string;
  selected_api?: string;
  selectedApi?: string;
};

function getZapierMcpServerUrl() {
  const url = process.env.ZAPIER_MCP_SERVER_URL?.trim();

  if (!url) {
    throw new Error("Missing ZAPIER_MCP_SERVER_URL.");
  }

  return url;
}

function getZapierMcpToken() {
  return (
    process.env.ZAPIER_MCP_TOKEN?.trim() ||
    process.env.ZAPIER_MCP_AUTH_TOKEN?.trim() ||
    ""
  );
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

function selectedApiForApp(app: string) {
  const normalized = String(app ?? "").trim().toLowerCase();

  if (normalized === "linkedin" || normalized.includes("linkedin")) {
    return envValue("ZAPIER_LINKEDIN_SELECTED_API", "ZAPIER_MCP_LINKEDIN_SELECTED_API") || "LinkedInCLIAPI";
  }

  if (normalized === "facebook" || normalized.includes("facebook")) {
    return envValue("ZAPIER_FACEBOOK_SELECTED_API", "ZAPIER_MCP_FACEBOOK_SELECTED_API") || "FacebookV2CLIAPI";
  }

  if (normalized === "gmail" || normalized.includes("gmail") || normalized.includes("google mail")) {
    return envValue("ZAPIER_GMAIL_SELECTED_API", "ZAPIER_MCP_GMAIL_SELECTED_API") || "GoogleMailV2CLIAPI";
  }

  if (normalized === "wordpress" || normalized.includes("wordpress")) {
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

function executionInstructionEnvelope({
  app,
  action,
  instructions,
}: {
  app: string;
  action: string;
  instructions: string;
}) {
  return [
    "EXECUTE THE ZAPIER WRITE ACTION NOW.",
    "This is an execution request, not a preview, simulation, field-mapping review, or confirmation request.",
    `Call the connected app action now: app=${app}, action=${action}.`,
    "Use the structured params object exactly as provided. Do not replace params with a summary of the request.",
    "Do not ask a follow-up question when the required params are present.",
    "If the connected app/API refuses execution, return an explicit error object instead of asking for confirmation.",
    "After the action executes, return the real provider response only.",
    "",
    "Original approved publishing instruction:",
    instructions,
  ].join("\n");
}

function executionOutputEnvelope(output: unknown) {
  const requestedOutput = String(output ?? "").trim();

  return [
    "Return JSON only after the write action executes.",
    "Do not return followUpQuestion.",
    "Do not return a field-mapping confirmation.",
    "Do not simulate a provider response.",
    "Use this shape when successful: {\"results\":{\"record_id\":\"...\",\"url\":\"...\",\"status\":\"PUBLISHED\",\"message\":\"...\"}}.",
    "If the action cannot execute, use this shape: {\"error\":\"...\",\"status\":\"failed\"}.",
    requestedOutput ? `Additional requested output: ${requestedOutput}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildZapierWriteArguments({
  app,
  action,
  instructions,
  params,
  output,
  selected_api,
  selectedApi,
}: ZapierWriteActionArgs) {
  const safeParams = cleanRecord(asRecord(params));
  const safeApp = requiredString(app, "app");
  const safeAction = requiredString(action, "action");
  const safeInstructions = requiredString(instructions, "instructions");

  return {
    selected_api: requiredString(selected_api ?? selectedApi ?? selectedApiForApp(safeApp), "selected_api"),
    app: safeApp,
    action: safeAction,
    instructions: executionInstructionEnvelope({
      app: safeApp,
      action: safeAction,
      instructions: safeInstructions,
    }),
    params: safeParams,
    output: executionOutputEnvelope(output),
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
