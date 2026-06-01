# VIP Workflow Stabilization: Version + Publishing Fix

## Problem

Current issues:

```text
V1 still appears after V2 is created
One review created two V2 posts
Open from publishing schedule sends user to request revision screen
Send to Zapier does nothing
Add date sends user to asset detail screen with no date editor
```

## Product Rules Restored

### Versioning

```text
Only one active version per asset family.
Creating V2 archives V1.
Duplicate V2 creation is blocked by review-id idempotency.
Publishing/review/calendar screens should only show the active latest version.
```

### Publishing Schedule

```text
Open = read-only asset view
Send to Zapier = button that calls an API route and shows success/error
Add/Edit Date = inline date editor, not a dead link
```

## Files Included

```text
sql/workflow_stabilization_cleanup_june.sql
src/lib/assets/asset-lifecycle.ts
src/app/api/quality-reviews/[reviewId]/resubmit/route.ts
src/app/api/publishing/assets/[assetId]/schedule/route.ts
src/app/api/publishing/assets/[assetId]/send-to-zapier/route.ts
src/components/publishing/PublishingScheduleActions.tsx
src/app/(app)/assets/[assetId]/view/page.tsx
README_WORKFLOW_STABILIZATION_VERSION_PUBLISHING_FIX.md
```

## Apply

1. Run `sql/workflow_stabilization_cleanup_june.sql`.
2. Add/replace the included files.
3. Update `/publishing-schedule/page.tsx` cards to render:

```tsx
<PublishingScheduleActions
  assetId={String(asset.id)}
  initialDate={asset.scheduled_publish_at ?? asset.planned_publish_date}
/>
```

instead of the old Open / Send to Zapier / Add date links.

4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Stabilize asset versions and publishing actions
```

## Zapier Configuration

The new `send-to-zapier` route uses webhook URLs.

Add at least one of these to Vercel:

```text
ZAPIER_GENERIC_WEBHOOK_URL
```

Or asset-specific URLs:

```text
ZAPIER_LINKEDIN_POST_WEBHOOK_URL
ZAPIER_FACEBOOK_POST_WEBHOOK_URL
ZAPIER_BLOG_POST_WEBHOOK_URL
ZAPIER_EMAIL_WEBHOOK_URL
ZAPIER_VIDEO_SCRIPT_WEBHOOK_URL
```

If no URL is configured, the button will show a clear error instead of doing nothing.

## Test

### Versioning

1. Pick one asset.
2. Run quality review.
3. Request revision.
4. Confirm only one V2 is created.
5. Confirm V1 disappears from calendar/review/publishing screens.

### Publishing Schedule

1. Approve the V2 asset.
2. Open `/publishing-schedule?view=month&date=2026-06-01`.
3. Confirm only V2 appears.
4. Click Open.
5. Confirm it opens read-only view.
6. Click Add/Edit Date.
7. Confirm inline date field appears and saves.
8. Click Send to Zapier.
9. Confirm clear success or clear configuration error.
