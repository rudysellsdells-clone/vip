# VIP Sprint 2.17 — Schedule-Aware Publishing Ready

## Goal

Make `/publishing-ready` respect scheduled publish dates and times.

Before this sprint, Publishing Ready treated approved assets as ready to execute immediately.

Now it separates approved assets into:

```text
Due Now
Upcoming
Unscheduled
Already Executed
```

Only **Due Now** assets can be executed.

## Files Included

```text
src/lib/publishing/schedule-status.ts
src/components/publishing/ExecuteApprovedAssetButton.tsx
src/app/api/publishing/assets/[assetId]/execute/route.ts
src/app/(app)/publishing-ready/page.tsx
README_SCHEDULE_AWARE_PUBLISHING_READY_2_17.md
```

## No SQL Required

This uses the scheduling fields from Sprint 2.16:

```text
scheduled_publish_at
publish_timezone
scheduling_status
scheduling_notes
```

## What Changes

### Publishing Ready Page

```text
/publishing-ready
```

Now shows:

```text
Due Now
Upcoming
Unscheduled
Already Executed
Recent execution history
```

### Execution Protection

The execution API now blocks direct execution if:

```text
asset is scheduled for the future
asset is unscheduled
asset is already marked published
asset is skipped
```

### After Execution

When an asset execution completes, the asset is updated to:

```text
scheduling_status = published
```

## Workflow

```text
Create content
→ Assign publish date/time
→ Review quality
→ Apply quality gate
→ Ready Queue
→ Approve
→ Publishing Ready
→ Execute only when due
```

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Make publishing ready schedule aware
```

## Test

1. Open `/publishing-schedule`.
2. Schedule one approved asset for the future.
3. Open `/publishing-ready`.
4. Confirm it appears under **Upcoming** and cannot execute.
5. Schedule one approved asset for the past/current time.
6. Confirm it appears under **Due Now** and can execute.
7. Confirm unscheduled approved assets appear under **Unscheduled**.
8. Execute a Due Now asset.
9. Confirm it moves toward completed/executed state.
