import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ENCRYPTION_VERSION = "v1";

type OAuthStatePayload = {
  accountId: string;
  userId: string;
  nonce: string;
  exp: number;
  returnTo: string;
};

function decodeEncryptionKey(value: string) {
  const trimmed = value.trim();

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const decoded = Buffer.from(trimmed, "base64");
  if (decoded.length === 32) {
    return decoded;
  }

  throw new Error(
    "ANALYTICS_ENCRYPTION_KEY must be a 32-byte base64 value or a 64-character hexadecimal value.",
  );
}

export function getAnalyticsEncryptionKey() {
  const value = process.env.ANALYTICS_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("Missing ANALYTICS_ENCRYPTION_KEY.");
  }

  return decodeEncryptionKey(value);
}

export function encryptAnalyticsSecret(value: string) {
  const key = getAnalyticsEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptAnalyticsSecret(value: string) {
  const [version, ivValue, authTagValue, encryptedValue] = value.split(".");

  if (
    version !== ENCRYPTION_VERSION ||
    !ivValue ||
    !authTagValue ||
    !encryptedValue
  ) {
    throw new Error("Analytics secret has an unsupported encrypted format.");
  }

  const key = getAnalyticsEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", getAnalyticsEncryptionKey())
    .update(value)
    .digest("base64url");
}

export function createAnalyticsOAuthState(
  payload: Omit<OAuthStatePayload, "nonce" | "exp">,
) {
  const completePayload: OAuthStatePayload = {
    ...payload,
    nonce: randomBytes(24).toString("base64url"),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(completePayload)).toString(
    "base64url",
  );
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAnalyticsOAuthState(value: string): OAuthStatePayload {
  const [encodedPayload, providedSignature] = value.split(".");
  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid analytics OAuth state.");
  }

  const expectedSignature = signValue(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error("Analytics OAuth state signature did not match.");
  }

  const parsed = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8"),
  ) as Partial<OAuthStatePayload>;

  if (
    typeof parsed.accountId !== "string" ||
    typeof parsed.userId !== "string" ||
    typeof parsed.nonce !== "string" ||
    typeof parsed.exp !== "number" ||
    typeof parsed.returnTo !== "string"
  ) {
    throw new Error("Analytics OAuth state payload was incomplete.");
  }

  if (parsed.exp < Date.now()) {
    throw new Error("Analytics OAuth state expired.");
  }

  return parsed as OAuthStatePayload;
}
