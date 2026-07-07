# H1.6C3 — Social Post Quality & Hashtag Guardrails

## Purpose

This patch fixes the poor social post output where monthly campaign social posts were reading like stitched-together strategy fields instead of publishable posts.

Example of the issue this patch addresses:

```text
For Contractors, the issue is not just awareness. It is whether the message connects Contractors needs a clearer way...

A practical proof or context point to build around: The preferred business outcome is...

#YouLlReceiveTraffic #HowToSolveThey
```

## What changed

### 1. Monthly campaign social templates are rewritten

File:

```text
src/lib/content-calendar/monthly-campaign-planner.ts
```

Changes:

- Replaces the stiff LinkedIn/Facebook deterministic templates.
- Removes phrasing like "A practical proof or context point to build around".
- Stops dumping raw proof/context/planning language into posts.
- Creates more natural LinkedIn and Facebook copy.
- Normalizes CTA casing such as `SCHEDULE A Marketing Audit` into cleaner public copy.
- Adds guardrails to prevent internal planning language from becoming public copy.

### 2. Hashtag generation is tightened

Files:

```text
src/lib/content-calendar/monthly-campaign-planner.ts
src/lib/content/public-content-cleaner.ts
```

Changes:

- Stops creating hashtags from full sentences.
- Stops broken tags like `#YouLlReceiveTraffic` and `#HowToSolveThey`.
- Infers safer tags from topic, offer, channel, and audience.
- Uses controlled tags like:
  - `#WebSearchPros`
  - `#DigitalMarketing`
  - `#LocalSEO`
  - `#AIOptimization`
  - `#ContractorMarketing`
  - `#MarketingAudit`
  - `#BusinessGrowth`
  - `#LocalBusiness`

### 3. AI prompt doctrine is strengthened for social posts

File:

```text
src/lib/ai/prompt-doctrine.ts
```

Changes:

- Adds explicit instructions not to publish planning fragments.
- Adds social-specific hashtag guidance.
- Tells the generator not to turn sentences or broken phrases into hashtags.

### 4. Single calendar item generation receives the same social rules

File:

```text
src/lib/content-calendar/asset-generation.ts
```

Changes:

- Facebook and LinkedIn generation instructions now reject raw strategy fields.
- Hashtag instructions are safer and more specific.

## SQL required

No SQL is required.

## Install instructions

Unzip this patch directly into the local repo root and choose **Replace** when prompted.

Then commit and push through GitHub Desktop.

## Validation note

A targeted TypeScript syntax check was run against the modified files. The sandbox repo does not include full installed Next/React/Node type dependencies, so the full app typecheck cannot complete here, but the modified files parsed successfully apart from the repo's missing `process` Node type declarations in the existing OpenAI generation file.
