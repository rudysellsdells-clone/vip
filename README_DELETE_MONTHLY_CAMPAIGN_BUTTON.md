# VIP Delete Monthly Campaign Button

## Goal

Add a button to erase a selected monthly campaign package and all related assets before anything goes out the door.

## What This Adds

A new reset/delete card on:

```text
/content-calendar/monthly
```

It lets the user delete the selected month’s campaign package.

## New API Route

```text
POST /api/content-calendar/monthly-campaigns/delete-month
```

Payload:

```json
{
  "month": "2026-06",
  "confirmText": "2026-06",
  "includeExecuted": false
}
```

## New Component

```text
src/components/content-calendar/DeleteMonthlyCampaignButton.tsx
```

## Updated Page

```text
src/app/(app)/content-calendar/monthly/page.tsx
```

## What It Deletes

For the selected month, it deletes related:

```text
campaigns
generated_assets
content_calendar_items
asset_quality_reviews
quality_gate_decisions
publishing_execution_runs
selected monthly activity_log entries
```

## Safety Behavior

The delete action is blocked if the selected month has assets with completed/sent publishing runs.

To override that, the user must check:

```text
Also delete records with completed/sent publishing runs
```

The user must also type the month value, such as:

```text
2026-06
```

before the delete button activates.

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/delete-month/route.ts
src/components/content-calendar/DeleteMonthlyCampaignButton.tsx
src/app/(app)/content-calendar/monthly/page.tsx
README_DELETE_MONTHLY_CAMPAIGN_BUTTON.md
```

## No SQL Required

This uses existing tables and fields.

## Apply

1. Add the API route.
2. Add the button component.
3. Replace the monthly page.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Add monthly campaign reset button
```

## Test

1. Open:

```text
/content-calendar/monthly?month=2026-06
```

2. Type:

```text
2026-06
```

3. Click:

```text
Delete Monthly Campaign Package
```

4. Confirm the browser prompt.
5. Confirm the month clears.
6. Regenerate the month with new strategy inputs.
