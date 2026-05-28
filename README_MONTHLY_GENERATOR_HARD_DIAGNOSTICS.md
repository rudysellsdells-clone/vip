# VIP Monthly Generator Hard Diagnostics

## Problem

The UI still only shows:

```text
Unable to generate campaigns
```

That means either:

```text
1. The current page is not using the patched generator component.
2. A different route/component is throwing the generic message.
3. The API response is failing before readable JSON reaches the client.
```

## What This Patch Adds

### 1. Generator diagnostic API

```text
src/app/api/content-calendar/monthly-campaigns/generate-diagnostic/route.ts
```

This endpoint does not generate content. It checks:

```text
auth
OPENAI_API_KEY presence
OPENAI_MODEL
memory sources
campaign plan/week count
expected asset count
existing campaigns for the month
likely next issue
```

### 2. Hard UI diagnostics

Replaces:

```text
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
```

Adds:

```text
Run Generator Diagnostic button
raw HTTP status display
raw/parsed response debug panel
exact API response body when available
```

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/generate-diagnostic/route.ts
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
README_MONTHLY_GENERATOR_HARD_DIAGNOSTICS.md
```

## Apply

1. Add the diagnostic route.
2. Replace the generator button component.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add hard diagnostics for monthly generator
```

## Test

1. Open the monthly generation page.
2. Click:

```text
Run Generator Diagnostic
```

3. Copy the Debug details.

## Important

If you do **not** see the new `Run Generator Diagnostic` button after deployment, then the page is not using:

```text
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
```

In that case, search the repo for:

```text
Unable to generate campaigns
```

and patch that component instead.
