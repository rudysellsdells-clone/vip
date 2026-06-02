# VIP LinkedIn Zapier MCP Action-Key Surgical Patch

## What this fixes

This fixes:

```text
Action 'execute_zapier_write_action' not found
```

That error means VIP is still using the Zapier MCP executor/tool name as the LinkedIn app action key.

## Correct mapping

```text
MCP tool/executor: execute_zapier_write_action
LinkedIn Page action: create_company_update
```

## Files included

```text
scripts/fix-linkedin-zapier-action.mjs
docs/manual-linkedin-zapier-action-fix.md
README.md
```

No TypeScript example route is included, so this package should not create a Vercel build failure by itself.

## How to use

Copy this file into your repo:

```text
scripts/fix-linkedin-zapier-action.mjs
```

From your repo root, run:

```bash
node scripts/fix-linkedin-zapier-action.mjs
```

Then run:

```bash
npm run build
```

## What the script changes

It looks at:

```text
src/lib/zapier/linkedin.ts
src/lib/zapier/action-registry.ts
```

It keeps this as the MCP tool/executor:

```ts
execute_zapier_write_action
```

But prevents it from being used as the LinkedIn action.

It changes likely bad patterns like:

```ts
action: getLinkedInMcpToolName()
```

to:

```ts
action: getLinkedInMcpActionKey()
```

And adds this helper to `src/lib/zapier/linkedin.ts`:

```ts
export function getLinkedInMcpActionKey() {
  return process.env.ZAPIER_LINKEDIN_ACTION_KEY?.trim() || "create_company_update";
}
```

It also changes this if found:

```ts
action: "execute_zapier_write_action"
```

to:

```ts
action: "create_company_update"
```

## Recommended Vercel environment variables

```text
ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action
ZAPIER_LINKEDIN_ACTION_KEY=create_company_update
```

Do not set any LinkedIn action-key environment variable to:

```text
execute_zapier_write_action
```

## Backup behavior

The script creates backups before editing files:

```text
src/lib/zapier/linkedin.ts.bak-...
src/lib/zapier/action-registry.ts.bak-...
```
