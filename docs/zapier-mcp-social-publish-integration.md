# Zapier MCP Social Publish Integration Notes

## Imports

For a standard Next.js `src` project where `@/*` maps to `./src/*`:

```ts
import { buildSocialPublishPayload } from "@/lib/zapierMcpSocialActions";
import { normalizeZapierMcpPublishResponse } from "@/lib/zapierMcpPublishResponse";
```

If your repo maps `@/*` to the project root, use:

```ts
import { buildSocialPublishPayload } from "@/src/lib/zapierMcpSocialActions";
import { normalizeZapierMcpPublishResponse } from "@/src/lib/zapierMcpPublishResponse";
```

Your Vercel error indicates the first version is more likely correct.

## LinkedIn Page publishing

```ts
const payload = buildSocialPublishPayload({
  channel: "linkedin_page",
  message: postBody,
});
```

This resolves to:

```ts
{
  executor: "execute_zapier_write_action",
  app: "LinkedIn",
  action: "create_company_update",
  params: {
    message: postBody
  }
}
```

## Facebook response handling

```ts
const normalized = normalizeZapierMcpPublishResponse(zapierResponse, "Facebook");

if (normalized.success) {
  return {
    success: true,
    message: normalized.message,
    postId: normalized.postId,
    postUrl: normalized.postUrl,
    executionId: normalized.executionId,
    feedbackUrl: normalized.feedbackUrl,
  };
}
```

## LinkedIn response handling

```ts
const normalized = normalizeZapierMcpPublishResponse(zapierResponse, "LinkedIn");

if (normalized.success) {
  return {
    success: true,
    message: normalized.message,
    postId: normalized.postId,
    postUrl: normalized.postUrl,
    executionId: normalized.executionId,
    feedbackUrl: normalized.feedbackUrl,
  };
}
```

## What not to do

Do not use the executor/tool name as the app action key:

```ts
action: "execute_zapier_write_action"
```

For LinkedIn Page publishing, use:

```ts
action: "create_company_update"
```
