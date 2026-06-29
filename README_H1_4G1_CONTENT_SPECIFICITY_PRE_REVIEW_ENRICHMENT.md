# H1.4G1 — Content Specificity + Pre-Review Enrichment

This patch improves first-draft content quality before assets reach human review.

## What changed

- Adds a shared `content-specificity` contract used by generation and review workflows.
- Strengthens campaign asset pack prompts for email, LinkedIn, Facebook, YouTube metadata, video scripts, and GalaxyAI prompts.
- Adds a safe pre-review enrichment pass for campaign asset packs.
- Strengthens fallback content so non-OpenAI fallback drafts are less generic.
- Strengthens Strategic Content Calendar item generation prompts.
- Strengthens Authority Content generation prompts.
- Strengthens Content Repurposing generation prompts.
- Makes automated quality review and fast quality review penalize generic language harder.
- Makes quality review and resubmission guidance call out specificity, examples, buyer pain, workflow steps, and CTA clarity.
- Tags generated campaign assets with `contentSpecificityContract: "h1_4g1"` and `preReviewEnrichment: true` in metadata.

## Pre-review enrichment behavior

Campaign asset pack generation now makes the normal first OpenAI pass, then attempts a second enrichment pass that improves specificity before saving assets.

If the enrichment pass fails for any reason, VIP safely keeps the original generated asset pack instead of failing the whole generation.

To disable the second pass, add this environment variable:

```bash
VIP_DISABLE_PRE_REVIEW_ENRICHMENT=1
```

## What this does not change

- No SQL changes.
- No account-scope changes.
- No approval workflow changes.
- No publishing workflow changes.
- No ZapierMCP, Facebook, LinkedIn, WordPress, Gmail, GalaxyAI, or Luma execution changes.

## Recommended test

1. Generate one new campaign asset pack.
2. Compare the email, LinkedIn post, Facebook post, video script, and GalaxyAI prompt against older content.
3. Confirm the drafts include more concrete buyer pain, examples/scenarios, detail, and CTAs.
4. Run quality review and confirm generic language is called out more aggressively.
5. Generate one content calendar item and check for the same improvement.
