# Marketing VIP H1.8B1 — Campaign Status Constraint Fix

## Problem fixed

H1.8B stored the one-off Marketing Spine approval lifecycle in two places:

1. `campaigns.strategy.oneOffStrategyGate.status` — valid and intended.
2. `campaigns.status` using `strategy_awaiting_approval` or `strategy_approved` — invalid for the existing database check constraint.

The existing `campaigns_status_check` permits the established campaign lifecycle values:

- `draft`
- `asset_pack_generated`
- `in_review`
- `approved`
- `active`
- `archived`

As a result, generating, saving, reopening, or approving a one-off Marketing Spine could fail with:

```text
new row for relation "campaigns" violates check constraint "campaigns_status_check"
```

## Resolution

H1.8B1 keeps the legacy `campaigns.status` value unchanged during strategy generation and approval.

The Marketing Spine lifecycle remains persisted in:

```text
campaigns.strategy.oneOffStrategyGate.status
```

That metadata already powers the strategy panel and server-side approval gate, so no functionality is lost.

After assets are generated, the existing valid campaign status continues to become:

```text
asset_pack_generated
```

## Installation

1. Unzip this patch directly into the repository root.
2. Choose **Replace** when prompted.
3. Do not run a Supabase migration.
4. Commit and push through GitHub Desktop.

Suggested commit:

```text
H1.8B1 fix campaign strategy status constraint
```

## Retest

1. Open the affected one-off campaign.
2. Click **Generate Campaign Strategy** again.
3. Review or edit the Marketing Spine.
4. Click **Approve and Lock Strategy**.
5. Generate the campaign assets.

The failed request did not require database cleanup. The campaign can be reused.

## Files changed

```text
src/app/api/campaigns/[campaignId]/strategy/route.ts
```
