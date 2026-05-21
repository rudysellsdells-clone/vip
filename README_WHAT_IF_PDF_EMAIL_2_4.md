# VIP Sprint 2.4 — What-If Story PDF + Email Prep

## Goal

Turn What-If Success Stories into branded, visually polished PDF deliverables and prepare Gmail draft content with the PDF attachment URL.

## What This Adds

### Database migration

```text
db/migrations/20260521_what_if_story_exports.sql
```

Creates:

```text
asset_exports
```

and a public Supabase Storage bucket:

```text
what-if-pdfs
```

### PDF generator

```text
src/lib/pdf/simple-pdf.ts
src/lib/what-if-stories/pdf-template.ts
```

This creates a branded PDF using:

- Web Search Pros heading
- styled top banner
- page footer
- clear scenario disclaimer
- readable page layout

### API routes

```text
src/app/api/assets/[assetId]/what-if-pdf/generate/route.ts
src/app/api/assets/[assetId]/what-if-pdf/gmail-draft/route.ts
```

### UI component

```text
src/components/what-if-stories/WhatIfPdfActions.tsx
```

Adds buttons:

```text
Generate Branded PDF
Prepare Gmail Draft + PDF
Open PDF
```

### Updated page

```text
src/app/(app)/what-if-stories/page.tsx
```

## Workflow

```text
Generate What-If Story
→ Review story
→ Generate Branded PDF
→ Open/review PDF
→ Prepare Gmail Draft + PDF
```

The Gmail draft prep route creates a saved `asset_exports` row with:

```text
subject
body
attachment PDF URL
```

## Important Current Limitation

This patch prepares the Gmail draft content and PDF attachment URL.

It does **not** directly execute the Gmail/Zapier draft creation yet, because the existing Gmail/Zapier execution route should be wired carefully to the app's current MCP client.

Recommended next small patch:

```text
asset_exports.gmail_draft_with_pdf
→ existing Gmail/Zapier draft execution route
→ create Gmail draft with PDF URL attachment
```

## SQL Required

Run the SQL migration in Supabase:

```text
db/migrations/20260521_what_if_story_exports.sql
```

It creates:

```text
asset_exports
what-if-pdfs storage bucket
```

## Apply

1. Add/replace included files.
2. Run the SQL migration in Supabase.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add branded What-If Story PDF exports
```

## Test

1. Open `/what-if-stories`.
2. Generate or use an existing What-If Story.
3. Click **Generate Branded PDF**.
4. Click **Open PDF**.
5. Click **Prepare Gmail Draft + PDF**.
6. Check `asset_exports` for:
   - `what_if_pdf`
   - `gmail_draft_with_pdf`
7. Confirm activity log entries are created.

## Notes

The generated PDF URL is public so Zapier can access it as an attachment source.
