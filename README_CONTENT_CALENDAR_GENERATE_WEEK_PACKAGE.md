# VIP Content Calendar — Generate Week Package

## Goal

Speed up the Strategic Content Calendar workflow by generating a full weekly package from one button.

Instead of clicking each planned item one at a time, Rudy can click:

```text
Generate Week 1 Package
```

The system will:

```text
Create the weekly campaign
Generate the supporting assets for that week
Send generated assets to approvals
Link campaign/assets back to the calendar
```

## Files Added

```text
src/app/api/content-calendar/plans/[planId]/weeks/[weekNumber]/generate/route.ts
src/components/content-calendar/GenerateCalendarWeekButton.tsx
```

## File Updated

```text
src/app/(app)/content-calendar/page.tsx
```

## Workflow

```text
Open /content-calendar
→ Find a week
→ Click Generate Week Package
→ VIP creates the weekly campaign if needed
→ VIP generates planned assets for that week
→ Assets go to /approvals
→ Calendar items become generated
```

## Behavior

The route skips items that already have:

```text
metadata.generatedAssetId
metadata.generatedCampaignId
```

It also records partial errors instead of losing successful generations.

## Required Environment Variable

Uses your existing OpenAI key:

```bash
OPENAI_API_KEY=
```

Optional:

```bash
OPENAI_MODEL=gpt-4.1-mini
```

## No SQL Required

This patch uses the existing content calendar tables.

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add weekly package generation to content calendar
```

## Test

1. Open `/content-calendar`.
2. Pick a week that has planned items.
3. Click **Generate Week 1 Package**.
4. Confirm a campaign link appears.
5. Confirm asset links appear.
6. Open `/approvals`.
7. Confirm generated assets are waiting for review.
