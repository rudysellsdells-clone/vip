# Nested Top Navigation + Link Builder

## Problem

The top navigation is getting too wide as more VIP modules are added.

## Fix

This patch keeps the top navigation but nests links under four clean groups:

```text
Command
Growth
Automation
Memory
```

The new **Link Builder** link is placed under:

```text
Growth → Link Builder
```

## Why This Approach

This avoids returning to the old left nav problem where the sidebar blocked or crowded the screen.

The new nav:

- Keeps the website-like top header
- Reduces horizontal width
- Groups pages by purpose
- Adds dropdowns on desktop
- Keeps a mobile menu on smaller screens
- Avoids layout overlap because it is sticky, not fixed

## Files Updated

```text
src/components/layout/SidebarNav.tsx
src/components/layout/SidebarNav.module.css
```

## Navigation Groups

### Command

```text
Dashboard
Campaigns
Approvals
Actions
```

### Growth

```text
Prospects
Opportunities
Link Builder
```

### Automation

```text
Zapier
GalaxyAI
```

### Memory

```text
Brand Voice
Knowledge
Settings
```

## Apply

1. Replace the two included files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Nest top navigation and add Link Builder
```

## Test

1. Open the dashboard on desktop.
2. Hover over **Growth**.
3. Confirm **Link Builder** appears.
4. Click **Link Builder**.
5. Confirm it opens `/link-builder`.
6. Check mobile width and confirm the Menu button opens all grouped links.
