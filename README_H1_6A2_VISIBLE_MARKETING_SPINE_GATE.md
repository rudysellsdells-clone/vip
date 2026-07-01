# H1.6A2 — Visible Marketing Spine Review Gate

This patch makes Marketing Spine feel like a real workflow feature instead of invisible metadata.

## What this fixes

After H1.6A, the spine existed mostly as prompt/metadata plumbing. H1.6A2 makes the spine visible as the bridge between strategy and execution.

The monthly campaign generator now has an explicit flow:

1. Fill or select campaign inputs.
2. Review the Marketing Spine.
3. Click **Build / Lock Marketing Spine**.
4. Click **Generate From Reviewed Spine**.

If inputs change after the spine is locked, VIP requires the user to rebuild the spine before generation.

## Key changes

### Monthly campaign generator

- Adds a visible **Step 2 — Marketing Spine** review gate.
- Adds a **Build / Lock Marketing Spine** button.
- Disables generation until the spine is reviewed and locked.
- Shows when the spine is:
  - Review gate open
  - Spine reviewed + locked
  - Inputs changed — rebuild spine
- Changes final button to **Generate From Reviewed Spine**.
- Keeps the workflow lightweight: no new SQL and no extra OpenAI/API call.

### Monthly Review

Adds a **Marketing Spine** section to the review board so you can see which spine informed the generated assets.

### Asset Detail

Adds a **Marketing Spine / Asset Brief** section to each asset page showing:

- audience
- offer
- originality angle
- proof point
- objection
- CTA
- asset brief
- channel role
- inheritance path

This makes it much easier to tell whether an asset actually followed the strategy or drifted into generic output.

### API metadata

The monthly generation API now records whether the visible review gate was confirmed:

- `marketingSpineReviewGate: confirmed`
- or `server_rebuilt_unconfirmed`

## SQL required

None.

## API call impact

No extra OpenAI/API call is added. The spine is still built deterministically from existing campaign, Brand Voice, and account strategy inputs.

## Apply order

Apply this after H1.6A.

## Test checklist

1. Go to `/content-calendar`.
2. Fill/select monthly campaign inputs.
3. Confirm Step 2 Marketing Spine appears.
4. Confirm the final generate button is disabled before locking.
5. Click **Build / Lock Marketing Spine**.
6. Confirm the button changes to locked and final generate button activates.
7. Change one campaign input.
8. Confirm VIP says inputs changed and requires rebuild.
9. Rebuild the spine.
10. Generate monthly content.
11. Open Monthly Review and confirm the Marketing Spine section appears.
12. Open one asset and confirm Marketing Spine / Asset Brief appears.

## Validation

Targeted TypeScript check passed for the modified files.

Full repo typecheck is still blocked by the existing Supabase auth type drift in the uploaded repo dependency setup, unrelated to this patch.
