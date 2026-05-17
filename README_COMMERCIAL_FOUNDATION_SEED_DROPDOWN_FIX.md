# VIP Commercial Foundation Seed + Dropdown Fix

## Issue

Buyer segments and offers are dropdowns, but there is nothing to select.

## Cause

Those dropdowns depend on user-owned records in Supabase:

```text
buyer_segments
offers
service_lines
```

If those tables have not been seeded for the logged-in user, the dropdowns will be empty.

## What This Patch Adds

### 1. Commercial foundation seed data

Adds:

```text
src/lib/setup/commercial-foundation-seed.ts
```

This includes:

- 8 service lines
- 5 buyer segments
- 8 relevant offers

### 2. Seed API route

Adds:

```text
src/app/api/setup/commercial-foundation/route.ts
```

This route:

- Requires the logged-in user
- Creates/updates the profile row
- Inserts missing service lines
- Inserts missing buyer segments
- Inserts missing offers
- Avoids duplicates by checking existing names
- Logs an activity record

### 3. Settings page

Adds:

```text
src/app/(app)/settings/page.tsx
src/components/setup/SeedCommercialFoundationButton.tsx
```

Go to:

```text
/settings
```

Then click:

```text
Populate Buyer Segments and Offers
```

### 4. Campaign form update

Updates:

```text
src/components/campaigns/CampaignWebsiteForm.tsx
src/app/(app)/campaigns/page.tsx
```

The Campaign Builder now:

- Loads buyer segments from `buyer_segments`
- Shows buyer segment as a dropdown
- Loads offers from `offers`
- Shows helper text when data is missing
- Links the user to Settings when dropdown data is missing

### 5. Navigation update

Updates:

```text
src/components/layout/SidebarNav.tsx
```

Adds Settings to the top navigation/mobile navigation.

### 6. Optional SQL seed template

Adds:

```text
db/seed-commercial-foundation-template.sql
```

This is optional. The in-app Settings button is preferred.

## Apply

1. Replace/add included files.
2. Commit.
3. Push.
4. Redeploy Vercel.
5. Log in.
6. Go to `/settings`.
7. Click **Populate Buyer Segments and Offers**.
8. Go to `/campaigns`.
9. Confirm buyer segments and offers are populated.

Suggested commit message:

```text
Seed commercial foundation dropdown data
```

## Seeded Buyer Segments

```text
Contractors
Mid-sized manufacturers
Machine shops
Dental practices
Legal firms
```

## Seeded Offers

```text
AI Visibility Audit
Local Visibility Booster
Website Health and Speed Pack
Lead Gen Accelerator
Authority Content Engine
SEO Growth Retainer
Website Conversion Sprint
Marketing Automation Starter
```

## No Workflow Changes

This does not change:

- OpenAI generation
- GalaxyAI
- Zapier
- Approval logic
- Asset execution logic
