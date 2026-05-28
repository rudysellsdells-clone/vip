# VIP Monthly Generation API Diagnostics Fix

## Problem

The UI now shows:

```text
Unable to generate monthly campaigns.
```

That means the browser still is not receiving enough useful detail from the generation route.

## What This Fix Does

### 1. Adds top-level API error handling

Replaces:

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

The route now catches server-side crashes and returns JSON:

```json
{
  "error": "...",
  "details": "...",
  "hint": "..."
}
```

instead of a generic 500/HTML response.

### 2. Returns 400 when generation creates zero assets

If the model calls fail for every week, the route now returns:

```text
assetCount: 0
errors: [...]
hint: No assets were created...
```

This makes the UI show the actual weekly generation errors.

### 3. Fixes repair-response parsing

Replaces:

```text
src/lib/content-generation/publish-ready-weekly-generator.ts
```

The previous repair path expected an `assets` array even though the repair prompt asks for:

```json
{ "title": "...", "content": "..." }
```

This patch allows both response shapes.

## Files Included

```text
src/lib/errors/readable-error.ts
src/lib/content-generation/publish-ready-weekly-generator.ts
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
README_MONTHLY_GENERATION_API_DIAGNOSTICS_FIX.md
```

## Apply

1. Replace the included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add diagnostics to monthly generation route
```

## Test

1. Generate the month again.
2. If it fails, the UI should now show the actual `errors` array or debug details.
3. Common likely errors:
   - Missing `OPENAI_API_KEY`
   - Model returned non-JSON
   - Publish-ready sanity check failed
   - Generated zero assets
   - Supabase insert schema mismatch
