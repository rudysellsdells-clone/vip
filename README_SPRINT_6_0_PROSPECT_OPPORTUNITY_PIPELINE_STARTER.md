# Sprint 6.0 Prospect and Opportunity Pipeline Starter

## Goal

Start turning VIP from a campaign execution system into a lightweight revenue operating system.

## Why This Sprint

VIP can now:

```text
Generate → Review → Revise → Approve → Execute → Audit
```

The next missing piece is tracking who those campaigns are supposed to influence and what revenue opportunities they create.

## What This Adds

### 1. Prospects Page

Adds:

```text
/prospects
```

File:

```text
src/app/(app)/prospects/page.tsx
```

This page shows:

- Total prospects
- New prospects
- Qualified prospects
- Prospect list
- Prospect creation form
- Link to opportunities

### 2. Opportunities Page

Adds:

```text
/opportunities
```

File:

```text
src/app/(app)/opportunities/page.tsx
```

This page shows:

- Open opportunity count
- Open pipeline value
- Won count
- Total tracked count
- Opportunity creation form
- Opportunity pipeline list

### 3. API Routes

Adds:

```text
src/app/api/prospects/route.ts
src/app/api/opportunities/route.ts
```

### 4. Forms

Adds:

```text
src/components/prospects/ProspectForm.tsx
src/components/opportunities/OpportunityForm.tsx
```

## No Database Migration Needed

This sprint uses existing tables:

```text
prospects
opportunities
service_lines
offers
activity_log
```

## Behavior

Creating a prospect logs:

```text
activity_type = prospect_created
```

Creating an opportunity logs:

```text
activity_type = opportunity_created
```

If an opportunity is created from a prospect, the prospect status updates to:

```text
active_opportunity
```

## Apply

1. Copy files into repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add prospect and opportunity pipeline
```

## Test

1. Go to `/prospects`.
2. Create a prospect.
3. Confirm the prospect appears.
4. Confirm `activity_log` has `prospect_created`.
5. Go to `/opportunities`.
6. Create an opportunity linked to that prospect.
7. Confirm the opportunity appears.
8. Confirm the prospect status changes to `active_opportunity`.
9. Confirm `activity_log` has `opportunity_created`.

## Success Criteria

Sprint 6.0 is complete when Rudy can:

- Add prospects
- View prospects
- Add opportunities
- View pipeline value
- Track basic sales stages
- Link opportunities back to prospects
