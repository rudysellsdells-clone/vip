# Marketing VIP H1.8B4 — Customer-Centered Strategy Quality Pass

## Purpose

H1.8B4 tightens every field in the one-off Marketing Spine. It prevents Brand Voice, Account Strategy, service descriptions, offer descriptions, campaign-form wording, and creator notes from being reorganized into strategy boxes as though they were finished strategic conclusions.

The strategy generator now separates four source categories before writing:

1. Customer facts — buyer description, pain signals, desired outcomes, and objections.
2. Campaign intent — topic, business objective, CTA, tone, and planned channels.
3. Verified offer facts — offer name, process, outcome, type, price note, and confirmed outputs.
4. Internal guidance — differentiator, originality angle, and creator notes.

Internal guidance may influence reasoning, but it is never treated as customer language or copied into the Marketing Spine.

## Workflow

The user workflow is unchanged:

1. Complete the existing one-off campaign form.
2. Generate the Marketing Spine.
3. Review and edit the strategy boxes.
4. Approve the strategy.
5. Create the campaign.
6. Generate assets from the approved strategy.

No new campaign fields are added.

## Field logic corrected

### Campaign Objective
Defines the belief, decision, or commercial action the campaign should make more likely. Generic goals such as “increase visibility” are not accepted by themselves.

### Target Audience
Selects one primary decision-maker and relevant business context. Complete industry and trade lists are suppressed.

### Buyer Situation
Describes a logical customer moment with:

- A trigger
- The current behavior or workaround
- What is no longer working
- Why the issue matters now

It cannot describe Marketing VIP’s internal problem, the campaign creator’s issue, or a form-field concern.

### Core Problem
Explains the customer-side causal obstacle behind the visible symptom. It is not the campaign goal, service description, offer description, or vendor problem.

### Business Consequence
Explains the operational, financial, competitive, or opportunity effect when the customer’s problem continues. Desired outcomes are no longer presented as consequences.

### Campaign Point of View
Creates a specific contrast between the familiar approach and a better approach. Generic “build trust and grow” positioning is rejected.

### Offer Explanation
Explains the offer’s mechanism: what it examines, connects, organizes, changes, or prioritizes. It does not paste the saved offer or service paragraph.

### Offer Deliverables
States only verified outputs. When the saved offer does not define concrete deliverables, the strategy says they need confirmation instead of inventing a report, plan, meeting, or implementation step.

### Proof and Support
Uses only approved proof. Knowledge summaries, desired outcomes, and service descriptions are not converted into evidence.

### Objections and Response
Pairs one believable customer concern with a direct, honest response.

### Message Progression
Creates a coherent persuasion sequence from customer moment through CTA.

### Primary CTA
Uses one approved action and removes competing actions.

### Content Direction
Assigns different strategic jobs to the blog, email, LinkedIn, Facebook, and video/YouTube content.

## Comprehensive quality pass

H1.8B4 runs a final field-by-field strategy editor after the first strategy draft. The editor reviews all thirteen fields, even when the first-pass diagnostic does not flag a particular box.

The final pass checks:

- Customer versus vendor perspective
- Logical sentence construction
- Causal problem definition
- Downstream consequence definition
- Source-field regurgitation
- Generic marketing language
- Verified offer mechanism and deliverables
- Approved proof boundaries
- Cross-section repetition
- CTA consistency
- Channel differentiation

If the quality-editor request fails, deterministic customer-centered safeguards repair the major fields before the strategy is displayed.

## OpenAI usage

This patch normally makes two strategy requests:

1. Initial Marketing Spine generation
2. Final comprehensive quality pass

The final pass defaults to `gpt-4.1`, while the initial strategy continues to default to `gpt-4.1-mini`.

Optional environment controls:

```env
# OPENAI_STRATEGY_MODEL=gpt-4.1-mini
# OPENAI_STRATEGY_QUALITY_MODEL=gpt-4.1
# VIP_STRATEGY_OPENAI_TIMEOUT_MS=30000
VIP_DISABLE_STRATEGY_QUALITY_PASS=0
```

No new environment variable is required. Set `VIP_DISABLE_STRATEGY_QUALITY_PASS=1` only as an emergency rollback; deterministic safeguards remain active.

## Installation

1. Back up the repository or confirm GitHub Desktop has a clean working tree.
2. Unzip the patch directly into the Marketing VIP repository root.
3. Choose **Replace** when prompted.
4. Do not run anything in Supabase.
5. Commit and push through GitHub Desktop.

Suggested commit:

```text
H1.8B4 customer-centered strategy quality pass
```

## Testing

Use a new one-off campaign or regenerate the strategy preview before approval.

Confirm:

1. Target Audience identifies one decision-maker and does not print the full Brand Voice audience list.
2. Buyer Situation describes a real customer moment in complete sentences.
3. Core Problem explains the customer’s underlying cause and does not mention the vendor’s internal issue.
4. Business Consequence explains what the customer loses, risks, delays, or cannot achieve.
5. Campaign Point of View states a distinctive belief instead of generic marketing language.
6. Offer Explanation explains how the offer works without repeating the saved description.
7. Offer Deliverables include only verified outputs.
8. Proof and Support does not turn aspirations or knowledge summaries into evidence.
9. Objections and Response feels specific to the customer.
10. Message Progression forms a logical argument.
11. Primary CTA contains one action.
12. Channel Direction gives each channel a distinct role.
13. No internal labels, Brand Voice sentences, Account Strategy sentences, or creator instructions appear in the strategy boxes.

Existing approved strategies and generated assets are not rewritten automatically. Generate a fresh strategy preview to test H1.8B4.

## Database impact

None.

- No migration
- No new table
- No new column
- No Supabase action
- No additional form fields
