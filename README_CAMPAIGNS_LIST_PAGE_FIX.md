# Campaigns List Page Fix

## Issue

The `/campaigns` page only showed the campaign creation form.

That made it look like existing campaigns were missing, even though the data was saved and individual campaign pages worked.

## Fix

This patch replaces:

```text
src/app/(app)/campaigns/page.tsx
```

The updated page now shows:

1. Campaign Library heading
2. Existing campaigns list
3. Campaign count
4. Links to each campaign detail page
5. Status badge
6. Created date
7. Campaign creation form below the list

## Apply

1. Replace `src/app/(app)/campaigns/page.tsx` with the patched file.
2. Commit.
3. Push to GitHub.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add campaign list to campaigns page
```

## Test

1. Log into the app.
2. Go to `/campaigns`.
3. Existing campaigns should appear above the form.
4. Click a campaign.
5. Confirm the campaign detail page opens.
