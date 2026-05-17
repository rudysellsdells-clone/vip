# Sprint 6.1 Frontend Experience and App Shell Upgrade

## Goal

Make VIP visually attractive, intuitive, and easier to navigate.

## Why This Sprint

The backend workflow is now strong:

```text
Campaigns
Approvals
Revisions
GalaxyAI
Zapier MCP
Gmail Drafts
Facebook Publishing
Audit Trail
Dashboard
Digital Clone Memory
Prospects
Opportunities
```

Sprint 6.1 adds the experience layer so VIP feels like a polished command center.

## What This Adds

### 1. Persistent App Shell

Adds:

```text
src/app/(app)/layout.tsx
src/components/layout/AppShell.tsx
src/components/layout/SidebarNav.tsx
```

The app shell includes:

- Persistent desktop sidebar
- Mobile menu
- Grouped navigation
- Signed-in user display
- Clean workspace background

### 2. Reusable UI Components

Adds:

```text
src/components/ui/PageHeader.tsx
src/components/ui/StatCard.tsx
src/components/ui/StatusBadge.tsx
src/components/ui/EmptyState.tsx
```

These make future pages visually consistent.

## No Database Migration Needed

This is a frontend-only sprint.

## Apply

1. Copy files into repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add frontend app shell and UI components
```

## Test

1. Log in.
2. Confirm the sidebar appears on desktop.
3. Confirm the mobile menu works.
4. Visit:
   - `/dashboard`
   - `/campaigns`
   - `/approvals`
   - `/assets/[assetId]`
   - `/actions`
   - `/galaxyai`
   - `/zapier`
   - `/prospects`
   - `/opportunities`
   - `/brand-voice`
   - `/knowledge`
5. Confirm pages render inside the app shell.
6. Confirm navigation highlights the current section.

## Success Criteria

Sprint 6.1 is complete when VIP feels easier to navigate and the whole authenticated app is wrapped in a cleaner command-center experience.
