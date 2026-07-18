# H1.10 UI Audit Decision Record

This audit separates presentation-only scaffolding from functional product surfaces. The rule for H1.10 is: do not delete anything that owns state, submits data, calls an API, controls access, performs navigation that is not preserved elsewhere, or displays a meaningful operational state.

## Removed

### Login: protected-workflow reminder

Reason: static explanatory copy with no state or action. Authentication and role-based access remain unchanged.

### Analytics: future implementation roadmap

Reason: the H1.7C2 / C2 roadmap described a future implementation rather than current product behavior. The Campaigns navigation link was retained in the campaign-attribution empty state.

### Content command center: large workflow map

Reason: the six cards duplicated the main navigation, the page’s primary actions, and the existing status/action cards. All six links remain available in a compact collapsed “Content workspace links” control.

### One-off campaign: repeated step badges

Reason: Step 1, Step 2, Strategy Preview Only, Review Before Creation, and No Campaign Created Yet repeated information already communicated by headings, button states, and creation behavior.

## Collapsed rather than removed

### Advanced campaign context

The saved strategy/source context remains available in a closed details control. It is not the primary work surface but is still useful for QA.

### Successful strategy-generation details

Offer authority, source readiness, semantic planning, repairs, conflicts, and editorial status remain available in a closed details control. Failure diagnostics remain fully visible.

### Content workspace links

All former workflow-map links remain accessible without occupying a full section of the page.

## Retained because functional

- Account and workspace identity panels
- Active role and master-user indicators
- Legacy unassigned-item rescue counts
- Legacy ZapierMCP and publishing-action records
- Content health warnings
- Strategy failure diagnostics
- Analytics schema/setup warnings
- Preflight payload and destination details
- Quality status, approval status, and publishing status
- Every form, input, handler, button, route, and API call

## Brand decision

Marketing VIP is the product identity throughout the application. Web Search Professionals remains only as the parent/provider name in intentional public sales copy and a Facebook Page safety instruction. Both `/marketing-vip-logo.png` and the legacy `/wsp-logo.png` path now serve the supplied Marketing VIP artwork.
