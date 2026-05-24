# VIP Sprint 2.20B — Campaign-Aware Monthly Calendar

## Goal

Make the monthly calendar the center of the content system.

Rudy confirmed the desired flow:

```text
One campaign per week
Each campaign immediately generates:
- 1 blog post
- 5 LinkedIn posts
- 5 Facebook posts
- 1 email
- 1 video script

Calendar should show campaigns and assets by intended publish month, not creation date.
```

## What This Fixes

### June not showing in the dropdown

The previous calendar relied too much on `created_at` and scheduled dates.

This patch adds explicit planning fields:

```text
campaign_month
intended_publish_month
planned_publish_date
campaign_week_number
campaign_week_start_date
```

The monthly dropdown now pulls from:

```text
campaigns
content calendar items
generated assets
planned dates
scheduled dates
intended month
campaign month
```

## New SQL

Run:

```text
db/migrations/20260524_campaign_aware_calendar_fields.sql
```

This safely adds planning fields to:

```text
campaigns
generated_assets
content_calendar_items
```

## New Generator

Adds:

```text
POST /api/content-calendar/monthly-campaigns/generate
```

This creates one weekly campaign per usable campaign week and immediately generates the full asset package.

## Updated Monthly Calendar

Page:

```text
/content-calendar/monthly
```

Now includes:

```text
month dropdown
generate monthly campaigns form
campaign entries
planned items
generated assets
campaign labels inside asset cards
week numbers
planned publish dates
scheduled times
```

## Default Weekly Layout

```text
Monday
- LinkedIn post
- Facebook post

Tuesday
- Blog post
- LinkedIn post
- Facebook post

Wednesday
- LinkedIn post
- Facebook post

Thursday
- Email
- LinkedIn post
- Facebook post

Friday
- Video script
- LinkedIn post
- Facebook post
```

## Files Included

```text
db/migrations/20260524_campaign_aware_calendar_fields.sql
src/lib/content-calendar/monthly-campaign-blueprint.ts
src/lib/content-calendar/monthly-campaign-planner.ts
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
src/components/content-calendar/GenerateMonthlyCampaignsButton.tsx
src/lib/content-calendar/campaign-aware-monthly-calendar.ts
src/components/content-calendar/MonthlyCalendarDayBox.tsx
src/components/content-calendar/MonthSelector.tsx
src/app/(app)/content-calendar/monthly/page.tsx
src/components/layout/SidebarNav.tsx
README_CAMPAIGN_AWARE_MONTHLY_CALENDAR_2_20B.md
```

## Apply

1. Add/replace included files.
2. Run SQL migration.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add campaign-aware monthly calendar
```

## Test

1. Run SQL.
2. Open:

```text
/content-calendar/monthly
```

3. Select June.
4. Generate monthly campaigns.
5. Confirm June appears in the dropdown.
6. Confirm each week has one campaign.
7. Confirm each campaign created:
   - 1 blog post
   - 5 LinkedIn posts
   - 5 Facebook posts
   - 1 email
   - 1 video script
8. Confirm assets show on the correct calendar days.
9. Open a generated asset from a calendar day box.

## Important Note

This sprint uses a deterministic planner for the first version.

That means it generates structured campaign packages immediately without needing a long AI generation step. Later, we can upgrade the content body generation to use richer AI prompts per asset while keeping the same campaign/calendar structure.
