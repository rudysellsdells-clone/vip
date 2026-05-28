# VIP Generator Error Message Fix

## Problem

The monthly generator showed:

```text
[object Object]
```

under the button.

## Cause

The API returned an object-shaped error, but the UI tried to display it as a plain string.

That hid the real error.

## What This Fix Does

Adds:

```text
src/lib/errors/readable-error.ts
```

Replaces:

```text
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
```

## Improvements

```text
no more [object Object]
shows real API error/message/details/hint
safely reads non-JSON error responses
shows debug details when generation returns zero assets
shows debug details when quality review fails after generation
maps warnings/errors arrays into readable text
```

## Important

This may not fix the underlying generation failure yet.

It fixes the visibility problem so the next test shows the actual cause.

## Apply

1. Add the new error helper.
2. Replace the monthly generation button.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Show readable generator API errors
```

## Test

1. Open monthly generation.
2. Generate the same month again.
3. If it fails, copy the real error shown under the button or from Debug details.
4. That error will point to the actual next patch.
