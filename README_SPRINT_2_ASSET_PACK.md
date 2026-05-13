# Rudys VIP — Sprint 2 Asset Pack Generator Patch

This patch adds the first real AI-generated workflow:

**Campaign → Marketing Asset Pack → Saved Assets**

## Files included

- `src/app/api/campaigns/[campaignId]/generate/route.ts`
- `src/app/(app)/campaigns/[campaignId]/page.tsx`
- `src/components/campaigns/GenerateAssetPackButton.tsx`
- `src/lib/ai/openai.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/ai/types.ts`
- `.env.example`

## Required Vercel environment variable

Add this in Vercel:

```bash
OPENAI_API_KEY=your_openai_api_key
```

Optional:

```bash
OPENAI_MODEL=gpt-4o-mini
```

After adding the variable, redeploy without build cache.

## Test steps

1. Log into the app.
2. Open an existing campaign.
3. Click **Generate Marketing Asset Pack**.
4. Wait for the AI generation to complete.
5. Confirm assets appear on the campaign detail page.
6. Confirm rows exist in Supabase table `generated_assets`.
7. Confirm the campaign status changed to `asset_pack_generated`.

## Notes

The route requires a saved campaign and a logged-in Supabase session.
The generated assets are saved with status `needs_review`.
No external publishing, sending, or credit-spending actions are triggered in Sprint 2.
