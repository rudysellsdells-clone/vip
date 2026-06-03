# VIP Phase 3A v2: Owner account and monthly remove controls

## Purpose

This patch revises Phase 3A around two product requirements:

1. Bring back the ability to remove a full month of generated content from the main monthly screens.
2. Make the signed-in primary account the owner account and allow that owner to create additional account seats.

## Monthly content removal

The repo already had the backend route and button for deleting a monthly campaign package:

```text
src/app/api/content-calendar/monthly-campaigns/delete-month/route.ts
src/components/content-calendar/DeleteMonthlyCampaignButton.tsx
```

This patch surfaces that control on:

```text
src/app/(app)/content-calendar/page.tsx
src/app/(app)/content-calendar/monthly/page.tsx
src/app/(app)/content-calendar/monthly-review/page.tsx
```

The control removes the full monthly campaign package for the selected month, including related campaigns, generated assets, calendar items, quality reviews, quality gate decisions, publishing runs, and related activity logs. It still blocks completed/sent publishing runs unless you explicitly include executed records.

## Owner account and seats

This patch treats the primary signed-in user as the owner account.

It adds:

```text
src/app/(app)/account/page.tsx
src/app/api/account/seats/route.ts
src/app/api/account/seats/[seatId]/route.ts
src/components/account/AddSeatForm.tsx
src/components/account/RemoveSeatButton.tsx
```

It also updates navigation/settings to show Account.

## Database migration

Run this migration in Supabase:

```text
db/migrations/20260603_phase3_owner_accounts_and_seats.sql
```

It adds owner-account fields to `profiles`:

```text
account_owner_id
account_role
account_status
```

It also creates/updates:

```text
account_seats
```

## Owner behavior

The current signed-in owner can create seats with these roles:

```text
admin
editor
reviewer
viewer
```

If `SUPABASE_SERVICE_ROLE_KEY` is set, VIP attempts a Supabase invite when a seat is created. If not, VIP still records the seat as pending.

## Apply instructions

Copy the patch files into your VIP repo, run the migration, commit, and push.

Suggested commit message:

```text
Add owner accounts and monthly content removal controls
```
