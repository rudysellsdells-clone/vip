# VIP Phase 3E Account UX + Command Menu Cleanup

## Purpose

This patch is a UX cleanup only. It does not touch Zapier, GalaxyAI, publishing execution, schema, or account permissions.

## What changed

### Account detail page

Reworked:

```text
/accounts/[accountId]
```

The account detail screen now reads more like a workspace control panel:

```text
Overview
Brand Profile
Publishing
Team
Danger Zone
```

Changes include:

- Quick account menu in a left-side card on desktop.
- Cleaner section cards with more padding.
- Brand profile and publishing settings separated into their own polished cards.
- Team/seat management grouped into a dedicated Team section.
- Account archive action moved into a visually separated Danger Zone.
- Remove-seat button remains in the Team table.

### Command menu / top nav

The large Command dropdown has been broken into clearer groups:

```text
Home
Plan
Review
Publish
Create
Grow
Workspace
```

This keeps dropdowns shorter and makes the navigation feel less like one giant sitemap.

### Menu styling

The dropdowns are slightly more compact and include a max-height with scrolling as a safety measure.

## Files included

```text
src/app/(app)/accounts/[accountId]/page.tsx
src/components/layout/SidebarNav.tsx
src/components/layout/SidebarNav.module.css
```

## Suggested commit message

```text
Clean up account workspace UX and command menu
```
