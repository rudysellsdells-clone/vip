# VIP LinkedIn Action Output Payload Fix

This is a surgical patch for the uploaded VIP Next.js/TypeScript repo.

## File to replace

Copy this file into the repo, replacing the existing file:

```text
src/lib/publishing/output-payload.ts
```

## What changed

The old LinkedIn config could fall back to:

```text
ZAPIER_LINKEDIN_MCP_TOOL_NAME
```

as the `action` value. Since that environment variable is supposed to contain:

```text
execute_zapier_write_action
```

VIP ended up sending the wrong LinkedIn action.

The new code separates action keys from executor/tool names and defaults LinkedIn Page publishing to:

```text
create_company_update
```

## After applying

Run or let Vercel run:

```bash
npm run build
```

Then test the LinkedIn publish again. The payload preview should show:

```json
{
  "app": "LinkedIn",
  "action": "create_company_update"
}
```
