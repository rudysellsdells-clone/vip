# H1.4G2 — Quality Review Visibility + Reviewer Guidance

## Purpose

H1.4G1 improved the first-draft content generation layer. H1.4G2 improves the reviewer experience so VIP does not simply show a score — it explains what the reviewer should look for before approval.

## What changed

This patch adds a shared reviewer-guidance helper and surfaces that guidance in the quality review UI.

It now highlights:

- Approval readiness label
- Overall score summary
- Detail-density signal
- Generic-language warnings
- Missing specificity signals
- Reviewer next steps
- Asset-type detail checklist
- Questions to ask before approval

## Files changed

- `src/lib/content-quality/reviewer-guidance.ts`
- `src/components/content-quality/QualityScorePanel.tsx`
- `src/components/approvals/ApprovalQualityWidget.tsx`
- `src/components/approvals/ApprovalQualityPanel.tsx`

## What this does not change

- No SQL
- No Supabase auth changes
- No account-scope changes
- No publishing/provider/ZapierMCP changes
- No calendar generation workflow changes
- No approval workflow changes

## Testing

After deploy:

1. Open `/content-quality`.
2. Review several assets with and without saved quality reviews.
3. Confirm the quality cards show reviewer guidance, missing detail signals, and next steps.
4. Open an individual asset from approvals.
5. Confirm the approval quality box shows reviewer focus and next steps.
6. Run a quality review on a new asset and confirm the guidance updates after the review completes.
