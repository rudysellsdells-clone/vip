# H1.1 Publishing Stabilization Closeout

## Status

H1.1 is complete and validated.

This phase stabilized VIP's core outbound publishing paths after the audit showed multiple overlapping publishing routes, legacy tool-run paths, and inconsistent result handling.

## Channels verified

| Channel | Current status | Notes |
|---|---:|---|
| LinkedIn Company Page | Verified working | Publishes through ZapierMCP, uses real LinkedIn organization ID, and marks VIP asset completed. |
| Gmail Draft | Verified working | Email assets now use the canonical ZapierMCP path and create Gmail drafts with structured params. |
| Facebook Page | Verified working | Facebook publish path is visible and executing through ZapierMCP. |

## What broke before H1.1

The publishing system had several overlapping execution paths:

- `/api/publishing/assets/[assetId]/execute-zapier-mcp`
- `/api/publishing/assets/[assetId]/send-to-zapier`
- `/api/publishing/assets/[assetId]/execute`
- `/api/tool-runs/[toolRunId]/execute`
- `/api/zapier/facebook-post/execute`
- `/api/zapier/gmail-draft/execute`

This caused several real problems:

1. LinkedIn could show completed locally without a trustworthy provider result.
2. LinkedIn could publish to the wrong company page because VIP sent a page name as `company_id`.
3. Gmail assets could be approved but never reach ZapierMCP.
4. Facebook could publish but VIP could show confusing state messages.
5. ZapierMCP success responses could be misread as failures because public post text contained phrases like "is missing."
6. Legacy routes and UI labels made it unclear which path was canonical.

## What H1.1 changed

### H1.1 — Legacy social webhook cleanup

- Moved visible publishing UI away from `/send-to-zapier`.
- Kept the legacy route in place, but blocked legacy social posting for LinkedIn/Facebook.
- Established `/execute-zapier-mcp` as the canonical social publishing path.

### H1.1B — Social publishing UI surface fix

- Exposed canonical publish actions for both LinkedIn and Facebook assets.
- Updated stale UI wording from "Send to Zapier" to "Publish via ZapierMCP."

### H1.1C — Publishing visibility and audit trail

- Clarified that `/publishing-schedule` is the approved-asset work queue.
- Clarified that `/actions` and `/zapier` should show execution/audit history.
- Added canonical publishing execution visibility.

### H1.1D — LinkedIn destination lock

- Stopped treating a LinkedIn page name as a company ID.
- Required a real LinkedIn organization/company ID before publishing.
- Prevented VIP from accidentally routing posts to the wrong connected/default LinkedIn page.

### H1.1E — Account publishing settings resolution

- Fixed legacy/unscoped approved assets not finding account-level publishing settings.
- Added fallback resolution through asset account, campaign account, last active account, default account, owned accounts, and active memberships.

### H1.1F — MCP result guard fix

- Fixed false failures when post content contained normal language that looked like error text.
- Treated real provider success evidence as success.

### H1.1G — Gmail canonical publishing path

- Added Gmail/email assets to the canonical ZapierMCP publishing surface.
- Built structured Gmail params.
- Ensured email creates a draft only and does not send automatically.

## Current canonical behavior

```text
Approved asset
→ visible publish action
→ /api/publishing/assets/[assetId]/execute-zapier-mcp
→ structured params
→ ZapierMCP execution
→ provider success response
→ VIP marks execution completed
→ VIP updates asset status
→ audit visibility in /actions and /zapier
```

## Confirmed working loop

The following loop is now confirmed for LinkedIn, Gmail, and Facebook:

```text
Approved asset
→ canonical ZapierMCP path
→ provider execution
→ success result
→ VIP completed status
```

## Remaining risks

H1.1 stabilized the visible publishing paths, but it did not fully refactor the publishing system.

Remaining risks:

1. Several legacy publishing routes still exist.
2. Route logic is still heavier than ideal.
3. Publishing logic still lives in multiple locations.
4. Some legacy tool-run behavior remains for compatibility.
5. The app still contains broad `untypedSupabase` usage.
6. Multi-account RLS/account authorization hardening remains a separate upcoming phase.

## Recommendation

Move next to H1.2: Publishing Execution Service Foundation.

H1.2 should consolidate the working behavior into a canonical service instead of continuing to patch individual routes.

## H1.1 final verdict

H1.1 successfully stabilized core outbound publishing.

Do not add more provider-specific patches until H1.2 establishes the shared service boundary.
