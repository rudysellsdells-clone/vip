# Marketing VIP H1.9 — Strategy Engine V2

H1.9 replaces the accumulated H1.8B field-specific strategy patches with one resolved strategy subsystem.

**Install H1.9 instead of H1.8B5.** H1.8B5's campaign-offer authority is included in this build.

## What H1.9 changes

The one-off campaign workflow remains:

1. Complete the campaign brief.
2. Generate the Marketing Spine.
3. Review or edit the thirteen fields.
4. Approve the spine and create the campaign.
5. Generate assets from the approved spine.

H1.9 changes the logic underneath that workflow:

```text
Campaign form
    → canonical campaign brief resolver
    → source-authority and conflict validation
    → thirteen-field strategy generator
    → whole-spine validator
    → one focused repair pass when needed
    → deterministic safety layer
    → human approval
    → asset generation from the same resolved facts
```

## One new authoritative form field

The one-off campaign form now requires:

**Campaign Offer / Desired Conversion**

Examples:

- Marketing VIP Demo
- Website Audit
- Dental AI Readiness Consultation
- Download the Contractor Marketing Guide
- Informational campaign with no direct offer

This field answers what the campaign is actually promoting. It prevents Goal, CTA, Brand Voice, and an older account offer from competing to define the offer.

## Source authority

The promoted offer is resolved in this order:

1. Campaign Offer / Desired Conversion
2. Explicitly selected compatible Account Strategy offer
3. Campaign CTA
4. Campaign goal
5. Campaign topic
6. Informational fallback

Account offers and service lines are no longer semantically selected because they seem related. They are evidence only when explicitly selected.

When a selected account offer conflicts with the campaign offer, the campaign offer wins and the conflicting offer is excluded. When Campaign Offer and CTA conflict, strategy generation stops and asks the user to align the fields.

## Canonical campaign brief

The AI no longer receives the full raw Brand Voice, Account Strategy, knowledge, service, and offer memory dump. It receives one resolved brief containing:

- One primary audience
- Customer pain signals and desired outcomes
- One promoted offer
- One primary CTA
- Compatible verified offer facts
- Explicit deliverables only
- Approved proof only
- Internal guidance clearly separated from customer facts
- Excluded offers and conflicts

## Formal contracts for all thirteen fields

Every strategy field now has a defined purpose, allowed sources, forbidden sources, requirements, and length range:

- Campaign Objective
- Target Audience
- Buyer Situation
- Core Problem
- Business Consequence
- Campaign Point of View
- Offer Explanation
- Offer Deliverables
- Proof and Support
- Objections and Response
- Message Progression
- Primary CTA
- Channel Direction

## Whole-spine validation

The validator checks the strategy as one connected argument:

```text
Audience
→ Buyer Situation
→ Core Problem
→ Business Consequence
→ Point of View
→ Promoted Offer
→ Proof
→ Objection
→ CTA
```

It rejects or repairs:

- Vendor-centered customer problems
- Malformed or stitched sentences
- Raw source copying
- Audience list dumps
- Generic point-of-view language
- Ignored offers returning in any field
- Offer/CTA drift
- Invented deliverables
- Unsupported proof
- Cross-field repetition
- Missing selected channels

## Source-resolution panel

After strategy generation, the campaign form displays:

- Resolved promoted offer
- Authority source
- Selected account offer
- Excluded conflicting offers
- Source conflicts
- Repair/safeguard status

This makes future source-selection problems visible instead of hidden inside the prompt.

## Asset-generation protection

Asset generation re-resolves the same canonical brief and supplies only those resolved facts alongside the approved Marketing Spine. A rejected Website Audit cannot return later through account memory or the verified-facts block when the approved campaign promotes a Marketing VIP Demo.

## Backward compatibility

- No database migration is required.
- Existing H1.8B approved strategy gates remain readable.
- Legacy signatures are preserved for existing approved campaigns.
- Existing approved strategies are not rewritten.
- New previews use the H1.9 engine and must include the new Campaign Offer field.

## Installation

1. Unzip the patch directly into the local repository root.
2. Choose **Replace** when prompted.
3. Do not run anything in Supabase.
4. From the repository root, run:

```bash
npm install
npm run test:strategy
npm run typecheck
npm run build
```

5. Commit and push through GitHub Desktop.

Suggested commit message:

```text
H1.9 replace one-off strategy engine with canonical source authority
```

## Acceptance test

Create a fresh one-off campaign with:

```text
Campaign Offer / Desired Conversion: Marketing VIP Demo
Goal: Generate qualified Marketing VIP demo requests
CTA: Schedule a Marketing VIP Demo
Selected Account Strategy Offer: Website Audit
```

Expected resolution:

```text
Promoted offer: Marketing VIP Demo
Offer source: campaign offer
Excluded conflicting account offer: Website Audit
```

The Marketing Spine and generated assets must not mention a website audit, assessment, diagnostic, findings report, or audit recommendations.
