# H1.6A4 — Campaign Detail Legacy Brief Cleanup

## What this fixes

The campaign detail page had a block labeled:

- Brief
- Campaign strategy inputs
- The business context VIP uses to generate campaign assets.

That block was legacy from the older one-off campaign builder. It was confusing because it looked like a strategy gate, but it was not the new Marketing Spine workflow.

It also exposed the old **Generate Asset Pack** action, which bypassed the Marketing Spine review/lock step.

## What this patch changes

On `/campaigns/[campaignId]`:

- Removes the legacy **Brief / Campaign strategy inputs** block.
- Removes the old **Generate Asset Pack** button from that page.
- Adds a clearer **Marketing Spine** section.
- Shows a simple read-only campaign snapshot:
  - Buyer segment
  - Audience
  - Goal
  - CTA
- Adds a button to open the real Marketing Spine workflow at `/content-calendar`.
- Keeps campaign status, Luma video, and delete controls.

## Why this matters

Marketing Spine should be the visible bridge between strategy and execution.

The old campaign detail brief looked like a strategic step, but it did not participate in the spine system. Removing it reduces confusion and prevents users from generating assets through a path that does not use the reviewed spine.

## SQL required

None.

## Apply order

Apply after the H1.6A spine patches.

## Test checklist

1. Open `/campaigns`.
2. Open an existing campaign.
3. Confirm the old **Brief / Campaign strategy inputs** block is gone.
4. Confirm the page now shows **Marketing Spine / Use the spine workflow for strategy-led generation**.
5. Click **Open Marketing Spine Workflow** and confirm it goes to `/content-calendar`.
6. Confirm Luma and Delete controls still appear.

## Commit message

`H1.6A4 Campaign detail legacy brief cleanup`
