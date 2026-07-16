# Marketing VIP H1.8A — Campaign Intelligence and Relevant Memory Selection

H1.8A adds a private intelligence layer before one-off Marketing Asset Pack generation.

It does **not** add campaign form fields, database tables, migrations, user steps, or additional OpenAI calls.

## Purpose

The existing generator receives a large amount of saved account memory and asks one model call to develop strategy and every asset. H1.8A improves the material supplied to that existing model call by:

1. Recovering the original one-off strategy when a campaign is regenerated.
2. Prioritizing the service line and offer already selected in the campaign builder.
3. Selecting only campaign-relevant buyer segments, approved examples, and knowledge sources.
4. Building a structured private persuasion brief from existing campaign and account data.
5. Recording readiness and memory-selection diagnostics in campaign and asset metadata.

## No new user form fields

Users continue creating one-off campaigns exactly as they do now.

H1.8A uses existing information, including:

- Campaign name and idea
- Audience and buyer segment
- Goal and CTA
- Notes
- Selected service line and offer
- Differentiator
- Proof points
- Originality angle
- Objections
- Saved brand profile and brand rules
- Buyer-segment pain points and desired outcomes
- Approved content examples
- Uploaded knowledge sources

Missing information is not treated as permission to invent facts. The brief labels unsupported gaps privately and tells the writer to use honest general scenario language.

## Private Campaign Intelligence Brief

The internal brief organizes the available context into:

- Audience
- Decision moment
- Visible problem
- Underlying problem
- Business consequence
- Current alternatives
- Unique point of view
- Offer mechanism
- Offer deliverables
- Approved proof
- Primary objection
- Objection response
- Desired conclusion
- Call to action

These labels and confidence notes are private prompt material and must not appear in public assets.

## Relevant-memory behavior

H1.8A always retains account-level identity and guardrails:

- Digital Clone profile
- Account brand profile
- Active brand rules

It then narrows variable memory:

- Selected service line: exact campaign selection wins
- Selected offer: exact campaign selection wins
- Buyer segments: campaign relevance
- Approved content examples: stronger keyword relevance threshold
- Knowledge sources: stronger keyword relevance threshold

A single generic word such as `service`, `website`, or `owner` is not enough to select unrelated knowledge.

## Regeneration fix

Before H1.8A, generated strategy metadata wrapped the original one-off strategy. A later regeneration could stop seeing the original differentiator, proof points, originality angle, objections, and selected offer/service IDs.

H1.8A unwraps and reuses the original strategy automatically. No user re-entry is required.

## Scope

This patch intentionally changes only the **one-off campaign Marketing Asset Pack** workflow.

Monthly campaign generation is not changed in H1.8A. This limits risk and lets the new intelligence layer be validated where content quality problems have been most visible before it is applied to other generators.

## Files

- `.env.example`
- `src/lib/content-generation/campaign-intelligence.ts`
- `src/lib/ai/prompts.ts`
- `src/app/api/campaigns/[campaignId]/generate/route.ts`

## Database changes

None.

Do not run a Supabase migration for H1.8A.

## Environment variables

No new environment variable is required.

H1.8A is enabled by default.

Emergency rollback only:

```env
VIP_DISABLE_CAMPAIGN_INTELLIGENCE=1
```

When this is set to `1`, the one-off generator omits the H1.8A brief and restores the legacy full-memory prompt path.

## Installation

1. Back up or commit the current repository state.
2. Unzip this patch directly into the repository root.
3. Choose **Replace** when prompted.
4. Do not create an additional nested folder.
5. Commit and push through GitHub Desktop.
6. Confirm the Vercel deployment succeeds.

Suggested commit message:

```text
H1.8A campaign intelligence and relevant memory selection
```

## Validation test

Create a one-off campaign exactly as usual. Do not add extra information solely for H1.8A.

Use an account that contains more than one service, audience, offer, or knowledge topic. Generate the asset pack and check that:

1. The copy is clearly about the selected campaign audience.
2. The selected offer is explained rather than replaced by another account offer.
3. Unrelated industries or services do not appear.
4. The differentiator, proof points, and objections remain present on regeneration.
5. Public content does not expose private labels such as `Decision moment`, `Approved proof`, or `readiness score`.

Generated asset metadata now includes:

- `campaignIntelligenceVersion`
- `campaignIntelligenceEnabled`
- `campaignIntelligenceReadinessScore`
- `campaignIntelligenceMissingElements`
- `campaignIntelligenceSelection`

The campaign strategy record also retains the private H1.8A brief and selection summary for diagnosis.

## Validation completed

- Repository-wide TypeScript check passed.
- Focused Next.js compile passed for the changed campaign-generation route.
- Enabled/disabled prompt compatibility test passed.
- Synthetic relevance test passed.
- Exact selected-offer and selected-service priority passed.
- Irrelevant knowledge exclusion passed.
- Original one-off strategy regeneration recovery was added and type-checked.

The repository's complete local Next.js build compiled and passed TypeScript but stalled during its broader page-data collection stage. The focused changed-route production compile completed successfully. Vercel remains the definitive full-deployment build test.
