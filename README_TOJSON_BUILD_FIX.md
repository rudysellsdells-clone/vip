# VIP GalaxyAI Companion Prompt toJson Build Fix

## What this fixes

Vercel failed with:

```text
Type error: Cannot find name 'toJson'. Did you mean 'JSON'?
```

The file:

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

uses `toJson(...)` for metadata, but the helper was not defined in that route.

## File replaced

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

## Change made

Added:

```ts
import type { Json } from "@/types/database.types";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
```

No GalaxyAI behavior changed. This is only a TypeScript build fix for the companion prompt patch.
