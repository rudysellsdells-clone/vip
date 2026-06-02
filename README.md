# VIP TypeScript Zapier MCP Social Publish Fix — Clean Vercel-Safe Version

This version removes the compilable example route that caused the Vercel build error.

## Why Vercel failed

The previous patch included:

```text
examples/next-api-route/route.ts
```

Your Vercel/Next build type-checked that file and failed on this import:

```ts
import { buildSocialPublishPayload } from "@/src/lib/zapierMcpSocialActions";
```

That example file should not have been included as a real `.ts` file.

## Immediate cleanup

Delete this file/folder from your repo if it exists:

```text
examples/next-api-route/route.ts
```

Safe cleanup command for Mac/Linux:

```bash
rm -rf examples/next-api-route
```

Safe cleanup command for Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .\examples\next-api-route
```

## Files in this clean patch

Copy only these files into your repo:

```text
src/lib/zapierMcpSocialActions.ts
src/lib/zapierMcpPublishResponse.ts
docs/zapier-mcp-social-publish-integration.md
```

There is no `.ts` file under `examples/`.

## Import path note

If your code is inside `src/app/...` and your TypeScript alias maps `@/*` to `./src/*`, imports usually look like this:

```ts
import { buildSocialPublishPayload } from "@/lib/zapierMcpSocialActions";
import { normalizeZapierMcpPublishResponse } from "@/lib/zapierMcpPublishResponse";
```

Not this:

```ts
import { buildSocialPublishPayload } from "@/src/lib/zapierMcpSocialActions";
```

If your alias maps `@/*` to the project root instead, then `@/src/lib/...` may be correct. Your error suggests it is not correct in this repo.

## LinkedIn fix

Use:

```ts
action: "create_company_update"
```

Do not use:

```ts
action: "execute_zapier_write_action"
```

Correct structure:

```text
Executor/tool: execute_zapier_write_action
App: LinkedIn
Action: create_company_update
```

## Facebook fix

Treat a Zapier MCP response containing `results.id` as success, even if `url`, `status`, and `message` are null.
