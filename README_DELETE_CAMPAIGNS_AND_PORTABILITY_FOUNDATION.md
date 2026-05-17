# Delete Campaigns + Portability Foundation

## What This Patch Handles

This patch handles two things:

1. Campaign deletion
2. First portability foundation for eventually selling or white-labeling VIP

## 1. Campaign Delete

Adds:

```text
src/app/api/campaigns/[campaignId]/delete/route.ts
src/components/campaigns/DeleteCampaignButton.tsx
```

Updates:

```text
src/app/(app)/campaigns/[campaignId]/page.tsx
```

### How deletion works

The campaign detail page now has a delete control.

To delete, the user must type:

```text
DELETE
```

Then VIP calls:

```text
POST /api/campaigns/[campaignId]/delete
```

The route:

- Confirms the logged-in user
- Confirms the campaign belongs to that user
- Counts generated assets
- Deletes the campaign
- Logs the activity as `campaign_deleted`
- Returns the user to `/campaigns`

### Important behavior

Because the schema has:

```sql
generated_assets.campaign_id references campaigns(id) on delete cascade
approvals.asset_id references generated_assets(id) on delete cascade
```

Deleting a campaign also deletes its generated assets and their approval records.

External actions are not undone.

That means:

- Facebook posts already published stay published
- Gmail drafts already created stay in Gmail
- External GalaxyAI/Zapier history stays external

## 2. Product Portability Foundation

Adds:

```text
src/lib/config/product.ts
.env.example
docs/PRODUCT_PORTABILITY_READINESS.md
```

Updates:

```text
src/components/layout/SidebarNav.tsx
```

The navigation now reads app and brand labels from environment config instead of hard-coding them.

### New public product env vars

```bash
NEXT_PUBLIC_PRODUCT_APP_NAME="Rudy's VIP"
NEXT_PUBLIC_PRODUCT_BRAND_NAME="Web Search Pros OS"
NEXT_PUBLIC_PRODUCT_COMPANY_NAME="Web Search Pros"
NEXT_PUBLIC_PRODUCT_OWNER_NAME="Rudy"
NEXT_PUBLIC_PRODUCT_SUPPORT_EMAIL="support@example.com"
NEXT_PUBLIC_PRODUCT_PRIMARY_SERVICE_CATEGORY="marketing"
```

## Apply

1. Replace/add included files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Add campaign deletion and portability foundation
```

## Test campaign deletion

1. Go to `/campaigns`.
2. Open a campaign.
3. Find **Delete Campaign** in the Campaign Controls section.
4. Click it.
5. Type `DELETE`.
6. Confirm the campaign disappears.
7. Confirm you return to `/campaigns`.
8. Confirm `activity_log` includes `campaign_deleted`.

## Test portability config

1. Add the new env vars in Vercel.
2. Change `NEXT_PUBLIC_PRODUCT_APP_NAME`.
3. Redeploy.
4. Confirm the top navigation brand label changes.

## Important

This is the first portability step, not the full SaaS resale conversion.

The best near-term selling model is **single-tenant deployments**:

- one Vercel project per customer
- one Supabase project per customer
- one integration setup per customer
- customer-specific seed data
