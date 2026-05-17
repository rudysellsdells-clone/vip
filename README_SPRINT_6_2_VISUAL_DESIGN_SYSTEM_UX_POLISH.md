# Sprint 6.2 Visual Design System and UX Polish

## Goal

Make VIP feel visibly attractive, intentional, and intuitive.

## Why This Sprint

Sprint 6.1 added the navigation shell. Sprint 6.2 adds the visual experience layer:

- Color
- Spacing
- Card hierarchy
- Status styling
- Workflow guidance
- Better dashboard composition
- More polished app shell

## What This Adds

### 1. VIP Status Styling

Adds:

```text
src/lib/ui/vip-status.ts
src/components/ui/vip/VipStatusBadge.tsx
```

Statuses now map to visual tones:

```text
approved/completed/won → green
needs_review/waiting_approval → amber
failed/rejected/lost → red
published/sent/active → blue
running/queued → purple
default → slate
```

### 2. VIP UI Components

Adds:

```text
src/components/ui/vip/VipPageHeader.tsx
src/components/ui/vip/VipMetricCard.tsx
src/components/ui/vip/VipSection.tsx
src/components/ui/vip/VipActionCard.tsx
src/components/ui/vip/VipWorkflowSteps.tsx
src/components/ui/vip/VipEmptyState.tsx
```

These create the design system for future page upgrades.

### 3. Polished App Shell

Updates:

```text
src/components/layout/AppShell.tsx
src/components/layout/SidebarNav.tsx
```

Adds:

- Gradient workspace background
- More polished sidebar
- Better active nav indicator
- Stronger brand block
- Better signed-in user card
- Improved mobile menu styling

### 4. Polished Dashboard

Updates:

```text
src/app/(app)/dashboard/page.tsx
```

Adds:

- Premium page hero
- Workflow steps
- Color-coded metric cards
- Dark recommended next-actions panel
- Cleaner recent lists
- Better empty state

## No Database Migration Needed

This sprint is frontend-only.

## Apply

1. Copy files into repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add visual design system and dashboard polish
```

## Test

1. Log in.
2. Open `/dashboard`.
3. Confirm the visual layout looks polished.
4. Confirm sidebar navigation still works.
5. Confirm mobile menu still works.
6. Confirm dashboard cards link to the right places.
7. Confirm no workflow behavior changed.

## Success Criteria

Sprint 6.2 is complete when VIP feels visually stronger, easier to scan, and more like a premium marketing command center.
