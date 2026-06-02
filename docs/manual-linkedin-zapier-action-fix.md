# Manual LinkedIn Zapier MCP Fix

Use this if you prefer to patch by hand.

## 1. Open this file

```text
src/lib/zapier/linkedin.ts
```

You already found this function:

```ts
export function getLinkedInMcpToolName() {
  return process.env.ZAPIER_LINKEDIN_MCP_TOOL_NAME?.trim() || "execute_zapier_write_action";
}
```

That function is okay if it is used as the MCP tool/executor.

Leave it in place.

## 2. Add this function below it

```ts
export function getLinkedInMcpActionKey() {
  return process.env.ZAPIER_LINKEDIN_ACTION_KEY?.trim() || "create_company_update";
}
```

## 3. Find bad usages

Search in `src/lib/zapier/linkedin.ts` for:

```text
action: getLinkedInMcpToolName()
```

Change it to:

```ts
action: getLinkedInMcpActionKey()
```

Also search for:

```text
const action = getLinkedInMcpToolName();
```

Change it to:

```ts
const action = getLinkedInMcpActionKey();
```

## 4. Check the registry

Open:

```text
src/lib/zapier/action-registry.ts
```

For the LinkedIn Page publishing entry, the pattern should be:

```ts
action: "create_company_update",
defaultToolName: "execute_zapier_write_action",
envToolNameKey: "ZAPIER_LINKEDIN_MCP_TOOL_NAME",
```

Do not use:

```ts
action: "execute_zapier_write_action",
```

## 5. Vercel env vars

Correct:

```text
ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action
ZAPIER_LINKEDIN_ACTION_KEY=create_company_update
```

Wrong:

```text
ZAPIER_LINKEDIN_ACTION_KEY=execute_zapier_write_action
```

## 6. Run build

```bash
npm run build
```
