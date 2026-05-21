# VIP Strategic Content Calendar Foundation

## Goal

Add the first Phase Two planning layer: a monthly Strategic Content Calendar.

This creates one distinct campaign per week and planned content items for blogs, social posts, videos, outreach, and What-If Stories.

## What This Adds

### Database migration

```text
db/migrations/20260521_strategic_content_calendar.sql
```

Creates:

```text
content_calendar_plans
content_calendar_items
```

### Planner logic

```text
src/lib/content-calendar/monthly-plan.ts
```

Generates:

```text
1 monthly theme
4 weekly campaign plans
28 planned content items
```

Each week includes:

```text
Weekly campaign
Blog post
LinkedIn post
Facebook post
Video concept
What-If Story
Email/outreach angle
```

### API routes

```text
src/app/api/content-calendar/plans/generate/route.ts
src/app/api/content-calendar/items/[itemId]/status/route.ts
```

### UI components

```text
src/components/content-calendar/GenerateMonthlyPlanForm.tsx
src/components/content-calendar/CalendarItemStatusForm.tsx
```

### App page

```text
src/app/(app)/content-calendar/page.tsx
```

### Navigation update

```text
src/components/layout/SidebarNav.tsx
```

Adds:

```text
Command → Content Calendar
```

## Workflow

```text
Open /content-calendar
→ Enter month, theme, goal, audience, offer, CTA
→ Generate Monthly Plan
→ VIP creates one distinct campaign per week
→ VIP creates planned content items
→ Rudy reviews the calendar
→ Statuses can be updated
```

## Statuses

```text
planned
generated
needs_review
approved
scheduled
published
skipped
```

## No external API required yet

This foundation does not use OpenAI yet.

That is intentional. This first build creates the planning structure. The next sprint can turn calendar items into generated assets using the Authority Content Engine.

## Apply

1. Add/replace included files.
2. Run SQL migration in Supabase:

```text
db/migrations/20260521_strategic_content_calendar.sql
```

3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add Strategic Content Calendar foundation
```

## Test

1. Open `/content-calendar`.
2. Enter:
   - Month
   - Monthly theme
   - Business goal
   - Target audience
   - Offer focus
   - CTA
3. Click **Generate Monthly Plan**.
4. Confirm the page shows:
   - 4 weekly campaigns
   - planned blog posts
   - planned social posts
   - planned video concepts
   - planned What-If Stories
   - planned outreach angles
5. Update one item status and confirm it saves.

## Next Sprint

The next build should connect calendar items to asset generation:

```text
Calendar item
→ Generate asset
→ Review / revise / approve
→ Prepare publishing or outreach
```
