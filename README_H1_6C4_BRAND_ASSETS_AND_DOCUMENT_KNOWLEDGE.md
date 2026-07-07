# H1.6C4 — Brand Assets + Document Knowledge Uploads

## What this patch adds

This patch adds two platform additions before the next content retest:

1. **Brand profile assets**
   - Upload a brand logo from the account brand profile area.
   - Save unlimited brand colors as a textarea list.
   - Store logo metadata on `account_brand_profiles`.
   - Store logo files in a new public Supabase Storage bucket: `brand-assets`.
   - Feed brand colors/logo availability into visual prompt context.

2. **Brand learning document upload**
   - Adds an upload form to `/knowledge`.
   - Supports PDF, DOCX, and TXT files.
   - Extracts text server-side.
   - Saves extracted text into `knowledge_sources` as `uploaded_document`.
   - Stores original files in a new private Supabase Storage bucket: `brand-knowledge`.
   - Adds document metadata columns to `knowledge_sources`.

## Files included

```text
README_H1_6C4_BRAND_ASSETS_AND_DOCUMENT_KNOWLEDGE.md
package.json
db/migrations/20260707_h1_6c4_brand_assets_and_document_knowledge.sql
src/app/(app)/accounts/[accountId]/page.tsx
src/app/(app)/knowledge/page.tsx
src/app/api/accounts/[accountId]/brand-profile/route.ts
src/app/api/knowledge-sources/upload/route.ts
src/components/accounts/AccountBrandProfileForm.tsx
src/components/knowledge/KnowledgeDocumentUploadForm.tsx
src/lib/accounts/brand-voice-monthly-options.ts
src/lib/brand-assets/brand-profile-assets.ts
src/lib/clone/context.ts
src/lib/clone/defaults.ts
src/lib/knowledge/document-parser.ts
src/lib/knowledge/document-storage.ts
src/lib/visual-assets/prompt-builder.ts
src/types/content-extractors.d.ts
```

## Required SQL

This patch includes a required migration:

```text
db/migrations/20260707_h1_6c4_brand_assets_and_document_knowledge.sql
```

Run it in Supabase before testing logo or document uploads.

It adds:

- brand logo fields to `account_brand_profiles`
- `brand_colors text[]` to `account_brand_profiles`
- uploaded document metadata fields to `knowledge_sources`
- `uploaded_document` as an allowed knowledge source type
- `brand-assets` storage bucket
- `brand-knowledge` storage bucket

## Dependency note

This patch adds two server-side parsing dependencies:

```json
"pdf-parse": "^1.1.1",
"mammoth": "^1.8.0"
```

Vercel should install these automatically on the next deployment.

## Testing checklist

1. Run the included SQL migration in Supabase.
2. Open an account workspace.
3. Go to the account brand profile section.
4. Upload a logo and enter several brand colors.
5. Save the brand profile.
6. Confirm the logo preview and brand colors appear.
7. Go to `/knowledge`.
8. Upload a PDF or DOCX.
9. Confirm it appears under Knowledge Sources as `uploaded_document`.
10. Regenerate content after adding brand learning documents.

## Known limitation

PDF text extraction works best with PDFs that contain selectable text. Scanned PDFs may need OCR before uploading.
