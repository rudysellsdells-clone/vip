# Marketing VIP Final Launch QA Checklist

Use this checklist after each launch-hardening patch. Test with at least one normal account and the master account when possible.

## 1. Brand and shell

- Public landing page shows the Marketing VIP logo in the header and footer.
- Login and setup-required states show the Marketing VIP logo.
- Authenticated navigation shows the full Marketing VIP logo without cropping.
- Browser tab title and icon display Marketing VIP.
- Mobile navigation opens, closes, and preserves account context.
- No Web Search Professionals logo or Web Search Pros OS sub-label appears inside the product.

## 2. Authentication and accounts

- Password login succeeds.
- Magic-link request succeeds or returns a clear provider error.
- Logout succeeds.
- Account switching changes workspace-scoped data.
- Account creation remains master/admin-only.
- Invites, seat management, archive/remove controls, and role guards remain correct.
- Brand Profile logo, colors, CTA, tone, offers, and audience fields save and reload.

## 3. Brand Voice and knowledge

- Brand Voice values save and reload.
- Saved Brand Voice offers and CTAs appear in campaign shortcuts.
- “Free Consultation” can populate Campaign Offer and a usable CTA.
- Knowledge text and document uploads remain account-scoped.
- Campaign generation uses selected knowledge without copying raw internal instructions into public assets.

## 4. One-off campaigns

- Campaign form loads account audiences, services, offers, Brand Voice, and knowledge choices.
- Strategy preview creates no campaign row before approval.
- Strategy failure diagnostics appear when generation fails.
- Successful strategy-generation details remain available in the collapsed control.
- Editing the brief marks the preview stale.
- Approval creates the campaign and locks the approved strategy.
- Asset generation uses the approved offer, audience, CTA, deliverables, and proof rules.
- Marketing VIP Demo does not become Website Audit.
- Free Consultation remains a consultation throughout strategy and assets.

## 5. Monthly content

- Monthly campaign generation completes.
- Calendar day/week/month views work.
- Monthly Review displays the correct workspace assets and Marketing Spine.
- Quality review, approval, removal, and regeneration controls work.
- Content workspace links open each intended page.
- Content health warnings reflect actual records.

## 6. Assets and approvals

- Asset detail, edit, revision, archive, and view pages load.
- Quality scoring and resubmission work.
- Approval queue shows only active latest-version assets for the workspace.
- Bulk approval honors quality and status rules.
- Visual prompt generation and GalaxyAI retrieval remain functional.
- Account brand logos remain reference-only where image prompts prohibit rendered logos.

## 7. Publishing

- Publish Center lists approved assets and unscheduled approved assets.
- Asset-specific preflight shows the correct workspace, destination, and payload.
- Gmail, LinkedIn, Facebook, WordPress, and configured ZapierMCP actions remain guarded.
- Legacy publishing actions remain visible for compatibility and audit.
- Published/sent assets cannot be accidentally posted twice without reset or duplication.
- Action History records success and failure evidence.

## 8. Analytics

- Analytics page loads for the active workspace.
- Setup-required state is clear when schema fields are absent.
- Native source setup and rollup work.
- GA4 authorization, property selection, sync, and replacement are account-scoped.
- Goals save and evaluate.
- Tracked campaign and asset links preserve identifiers.
- Campaign and asset detail reporting pages load.
- Sync failures appear in operations history.

## 9. Regression discipline for new bugs

Before writing another patch:

1. Reproduce the bug in the latest full repository.
2. Trace the current route, component, API handler, shared library, database contract, and account-scope guard.
3. Search for an existing helper or prior fix before creating a new implementation.
4. Identify whether the issue is source selection, UI state, validation, persistence, generation, or publishing.
5. Change the smallest coherent subsystem, not a single output phrase.
6. Add or update a regression test for logic changes.
7. Run `npm run test:strategy`, `npm run typecheck`, and `npm run build`.
8. Confirm that existing handlers, forms, API calls, and account guards remain present.
