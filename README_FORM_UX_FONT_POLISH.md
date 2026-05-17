# VIP Form UX and Font Polish

## Goal

Improve the usability and readability of forms, and apply the requested font pairing:

- **Lato** for headings
- **Montserrat** for body text and form controls

## What This Patch Adds

### 1. Global font setup

Updates:

```text
src/app/globals.css
```

Adds:

```css
Lato for h1-h6
Montserrat for body, buttons, inputs, textareas, and selects
```

This uses Google Fonts via CSS import.

### 2. Shared form design system

Adds:

```text
src/components/forms/VipForm.module.css
```

This creates consistent form styling:

- Larger labels
- Larger input text
- Taller inputs
- More spacing between rows
- Clear focus states
- Better buttons
- More readable textarea sizing
- Cleaner success/error messages

### 3. Updated forms

Updates:

```text
src/components/campaigns/CampaignWebsiteForm.tsx
src/components/prospects/ProspectForm.tsx
src/components/opportunities/OpportunityForm.tsx
src/components/clone/DigitalCloneProfileForm.tsx
src/components/clone/BrandRuleForm.tsx
src/components/knowledge/KnowledgeSourceForm.tsx
src/components/knowledge/ContentExampleForm.tsx
src/components/assets/RequestRevisionButton.tsx
```

## No Database or Workflow Changes

This patch only changes visual presentation and usability.

It does not change:

- Supabase schema
- API routes
- OpenAI
- GalaxyAI
- Zapier
- Approval logic
- Execution logic

## Apply

1. Replace the included files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Improve form UX and apply brand fonts
```

## Test

Visit pages with forms:

```text
/campaigns
/prospects
/opportunities
/brand-voice
/knowledge
/approvals
/assets/[assetId]
```

Confirm:

- Headers use Lato.
- Body text uses Montserrat.
- Inputs are taller and easier to read.
- Labels are larger and clearer.
- Forms have more breathing room.
- Buttons are easier to find and click.
