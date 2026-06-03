# VIP Phase 3A: Account Seats + Remove Assets Foundation

## Purpose

This patch starts Phase 3 with two practical product improvements:

1. Add soft-remove controls for generated assets across the main review and working screens.
2. Add an Account page with a first-pass seat ledger for collaborators.

The patch does not change the working Zapier MCP, LinkedIn, Facebook, or GalaxyAI execution baseline.

## Files included

```text
src/components/assets/RemoveAssetButton.tsx
src/components/account/AddSeatForm.tsx
src/components/account/RemoveSeatButton.tsx
src/app/(app)/account/page.tsx
src/app/api/account/seats/route.ts
src/app/api/account/seats/[seatId]/route.ts
db/migrations/20260603_phase3_account_seats.sql
src/components/calendar/WorkingAssetCard.tsx
src/components/ready-for-publishing/ReadyAssetActions.tsx
src/app/(app)/ready-for-publishing/page.tsx
src/app/(app)/assets/[assetId]/page.tsx
src/app/(app)/assets/[assetId]/view/page.tsx
src/app/(app)/campaigns/[campaignId]/page.tsx
src/components/layout/SidebarNav.tsx
src/app/(app)/settings/page.tsx
```

## Asset removal behavior

This uses the existing archive endpoint:

```text
POST /api/assets/[assetId]/archive
```

So assets are removed from active workflows without destroying history.

Remove buttons now appear in:

```text
Asset detail page
Read-only asset view
Campaign detail generated assets
Working asset cards used by approvals/calendar-style screens
Ready-for-publishing actions
```

## Account / seats behavior

Adds:

```text
/account
```

The Account page shows:

```text
Current signed-in user
Profile details
Current seats
Pending seats
Active seats
Add seat form
Remove seat action
```

The new table is:

```text
public.account_seats
```

Run this migration before using the Account seats page:

```text
db/migrations/20260603_phase3_account_seats.sql
```

## Optional invite behavior

When `SUPABASE_SERVICE_ROLE_KEY` is available, the Add Seat API attempts a Supabase Auth invite using:

```text
admin.auth.admin.inviteUserByEmail(email)
```

If the service role key is not configured, VIP still records the seat as pending.

## Suggested commit message

```text
Add Phase 3 account seats and asset remove controls
```
