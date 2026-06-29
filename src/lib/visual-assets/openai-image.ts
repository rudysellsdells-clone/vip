export type OpenAiImageResult = {
  bytes: ArrayBuffer;
  contentType: string;
  model: string;
  size: string;
};

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it in Vercel Environment Variables and redeploy.");
  }

  return apiKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function firstImageData(responseJson: unknown) {
  if (!isRecord(responseJson) || !Array.isArray(responseJson.data)) return null;
  const first = responseJson.data[0];
  return isRecord(first) ? first : null;
}

async function bytesFromRemoteUrl(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not download generated image: ${response.status} ${response.statusText}`);
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") || "image/png",
  };
}

export async function generateOpenAiImage(input: {
  prompt: string;
  size?: string;
}): Promise<OpenAiImageResult> {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = input.size || process.env.OPENAI_IMAGE_SIZE || "1024x1024";

  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    n: 1,
    size,
  };

  const quality = process.env.OPENAI_IMAGE_QUALITY;
  if (quality) body.quality = quality;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image request failed: ${response.status} ${response.statusText} — ${errorText}`);
  }

  const responseJson = await response.json();
  const imageData = firstImageData(responseJson);

  if (!imageData) {
    throw new Error("OpenAI image response did not include image data.");
  }

  const b64Json = imageData.b64_json;
  if (typeof b64Json === "string" && b64Json.trim()) {
    const buffer = Buffer.from(b64Json, "base64");
    return {
      bytes: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      contentType: "image/png",
      model,
      size,
    };
  }

  const url = imageData.url;
  if (typeof url === "string" && url.trim()) {
    const remote = await bytesFromRemoteUrl(url);
    return {
      bytes: remote.bytes,
      contentType: remote.contentType,
      model,
      size,
    };
  }

  throw new Error("OpenAI image response did not include b64_json or url output.");
}
