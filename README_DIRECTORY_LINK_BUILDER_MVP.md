# VIP Directory Link Builder MVP

## Goal

Add the first Directory Link Builder module to Rudys VIP.

This MVP helps Rudy build legitimate directory backlinks without Ahrefs and without creating a risky auto-submit spam tool.

## What This Adds

### Database migration

```text
db/migrations/20260518_directory_link_builder.sql
```

Adds:

```text
directory_profiles
directory_opportunities
directory_submissions
acquired_backlinks
```

### API routes

```text
src/app/api/link-builder/profile/route.ts
src/app/api/link-builder/opportunities/route.ts
src/app/api/link-builder/opportunities/[opportunityId]/score/route.ts
src/app/api/link-builder/opportunities/[opportunityId]/approve/route.ts
src/app/api/link-builder/backlinks/verify/route.ts
```

### UI

```text
src/app/(app)/link-builder/page.tsx
src/components/link-builder/DirectoryProfileForm.tsx
src/components/link-builder/DirectoryOpportunityForm.tsx
src/components/link-builder/DirectoryOpportunityActions.tsx
src/components/link-builder/BacklinkVerifyForm.tsx
```

### Helpers

```text
src/lib/link-builder/directory-scoring.ts
src/lib/link-builder/profile.ts
src/lib/link-builder/backlink-verifier.ts
```

## MVP Workflow

```text
Save directory profile
→ Add directory opportunity manually
→ VIP scores it
→ Approve opportunity
→ VIP prepares submission draft
→ Submit manually
→ Verify or record backlink
→ Track live links
```

## What This Does Not Do Yet

This MVP does not yet:

- auto-discover opportunities from search APIs
- mass-submit forms
- bypass captchas
- create accounts on directories
- buy listings
- send outreach emails
- use Hunter/DataForSEO

Those can be added after the core workflow is working.

## Apply

1. Add/replace the included files.
2. Run the SQL migration in Supabase.
3. Add the navigation item from `docs/NAV_LINK_BUILDER_PATCH.md`.
4. Commit.
5. Push.
6. Redeploy Vercel.

Suggested commit message:

```text
Add Directory Link Builder MVP
```

## Test Plan

1. Visit `/link-builder`.
2. Save the directory profile.
3. Add a test directory opportunity.
4. Confirm it appears in the queue.
5. Click **Score**.
6. Click **Approve + Prepare**.
7. Confirm a prepared submission appears.
8. Use the verifier with a source URL and target URL.
9. Confirm an acquired backlink record is created.

## Notes

Backlink verification is intentionally simple in v1. Some websites block automated fetching, so records may show `needs_review` even when a link exists.
