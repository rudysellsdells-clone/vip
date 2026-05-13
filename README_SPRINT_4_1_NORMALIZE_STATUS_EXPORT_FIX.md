# Sprint 4.1 Normalize GalaxyAI Status Export Fix

## Issue

The build failed with an import error:

```text
import { normalizeGalaxyAiStatus } from "@/lib/galaxyai/types";
```

The webhook route imports `normalizeGalaxyAiStatus`, but `src/lib/galaxyai/types.ts` did not export it.

## Fix

This patch replaces:

```text
src/lib/galaxyai/types.ts
```

It adds:

```ts
export function normalizeGalaxyAiStatus(status: unknown)
```

The helper converts GalaxyAI statuses like:

```text
COMPLETED
FAILED
CANCELED
RUNNING
QUEUED
```

into the lowercase values expected by the Supabase `galaxyai_runs.status` check constraint:

```text
completed
failed
canceled
running
queued
```

## Apply

1. Replace `src/lib/galaxyai/types.ts` with the patched file.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Export GalaxyAI status normalizer
```
