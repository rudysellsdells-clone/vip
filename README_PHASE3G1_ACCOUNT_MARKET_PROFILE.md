# VIP Phase 3G.1 Account Market Profile Patch

## Purpose

Adds the first required Phase 3G foundation: account-level service lines, audiences, and offers.

This prevents a service-business account from generating campaigns around Web Search Professionals or marketing products by default. Each account can now define what it sells, who it sells to, and which offers VIP should promote.

## Files included

```text
src/app/(app)/accounts/[accountId]/page.tsx
src/components/accounts/AccountMarketProfileManager.tsx
src/app/api/accounts/[accountId]/service-lines/route.ts
src/app/api/accounts/[accountId]/audiences/route.ts
src/app/api/accounts/[accountId]/offers/route.ts
db/migrations/20260603_phase3g1_account_market_profile.sql
README_PHASE3G1_ACCOUNT_MARKET_PROFILE.md
```

## What changes in the UI

The account detail page gets a new Strategy section:

```text
Overview
Brand Profile
Strategy
Publishing
Team
Danger Zone
```

The Strategy section includes:

```text
Service Lines
Audiences
Offers
```

Each item can be added and removed from the account workspace. Remove is a soft archive using `active = false`.

## Data model

This patch reuses existing tables:

```text
service_lines
buyer_segments
offers
```

Records are scoped to the account using:

```text
account_id
```

This avoids adding duplicate new tables and fits the Phase 3B multi-account foundation.

## Supabase migration

Run this migration:

```text
db/migrations/20260603_phase3g1_account_market_profile.sql
```

It adds indexes and RLS policies so account members can view account-scoped strategy records, and account managers can create/update them.

## What this does not do yet

This patch does not yet refactor the campaign generator to require selecting an account service line, offer, and audience. That should be the next controlled Phase 3G.2 step.

Recommended next step:

```text
Use selected account service lines, offers, and audiences in campaign/monthly asset generation.
```

## Suggested commit message

```text
Add account-level service lines offers and audiences
```
