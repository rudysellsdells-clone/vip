# VIP Fast Batch Monthly Generation Fix

## Problem

Vercel returned:

```text
FUNCTION_INVOCATION_TIMEOUT
HTTP 504
```

The diagnostic proved the setup is valid:

```text
5 campaign weeks
65 expected assets
no existing campaigns
auth working
OPENAI_API_KEY present
```

So the issue is not planning. The generation request is doing too much work and timing out.

## What This Fix Does

### 1. Makes monthly generation fast and deterministic

Replaces:

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

The route now:

```text
does not call OpenAI
does not read memory
builds the monthly plan locally
batch inserts all campaigns
batch inserts all generated assets
returns durationMs
```

### 2. Simplifies the generator UI

Replaces:

```text
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
```

The UI now clearly shows:

```text
Fast batch mode is active
no automatic quality review inside generation
created campaign/asset counts
durationMs
```

## Why

Monthly generation should create the campaign package quickly.

Content improvement should happen after creation through:

```text
Monthly Review
Bulk Quality Review
resubmission/regeneration
approval
publishing
```

Not inside the initial request.

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
README_FAST_BATCH_MONTHLY_GENERATION_FIX.md
```

## Apply

1. Replace the two files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Use fast batch monthly generation
```

## Test

1. Reset June if needed.
2. Open monthly calendar.
3. Generate June.
4. Confirm it creates:
   - 5 campaigns
   - 65 assets
5. Open Monthly Review.
6. Run Bulk Quality Review manually.
