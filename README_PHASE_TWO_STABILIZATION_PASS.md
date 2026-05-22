# VIP Phase Two Stabilization Pass

## Goal

Make the Phase Two tools feel organized, connected, and easier to navigate.

This is not a new feature sprint. It is a stabilization pass for the Phase Two work already completed.

## What This Adds

### Phase Two Hub

```text
/phase-two
```

The hub shows:

- Phase Two metrics
- the intended workflow
- links to the major Phase Two modules
- recent Phase Two assets
- parked review items

### Navigation Cleanup

Updates:

```text
src/components/layout/SidebarNav.tsx
```

Adds a cleaner structure:

```text
Command
- Dashboard
- Phase Two
- Content Calendar
- Publishing Ready
- Campaigns
- Approvals
- Actions

Content
- Authority Content
- Repurposing
- What-If Stories

Growth
- Prospects
- Opportunities
- Link Builder

Automation
- Zapier
- GalaxyAI

Memory
- Brand Voice
- Knowledge
- Settings
```

## Files Included

```text
src/app/(app)/phase-two/page.tsx
src/components/layout/SidebarNav.tsx
README_PHASE_TWO_STABILIZATION_PASS.md
```

## No SQL Required

This uses existing tables:

```text
content_calendar_plans
generated_assets
publishing_execution_runs
```

## Apply

1. Add/replace included files.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Stabilize Phase Two navigation and hub
```

## Test

1. Open:

```text
/phase-two
```

2. Confirm metrics load.
3. Confirm the module links work.
4. Confirm nav dropdowns show:
   - Phase Two
   - Authority Content
   - Repurposing
   - Publishing Ready
   - What-If Stories
5. Confirm mobile menu still opens and links work.

## Known Parked Items

The hub intentionally lists:

- What-If Gmail draft visibility inside older Recent Zapier Actions
- Prospect-specific What-If wiring/button
- LinkedIn and Facebook exact Zapier action key confirmation
- GalaxyAI direct execution from Publishing Ready

These are parked, not forgotten.
