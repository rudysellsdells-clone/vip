# H1.10C1 — GalaxyAI Provisioning TypeScript Fix

This corrective patch fixes the Vercel build failure in `src/lib/galaxyai/provisioning.ts`:

```text
Object literal may only specify known properties, and 'referenceImage' does not exist...
```

## Cause

TypeScript inferred the workflow node array from the image node's narrower `inputs` shape. When the video node was appended, its image-to-video fields were incorrectly checked against the image-node input shape.

## Fix

The workflow `nodes` and `edges` collections are now explicitly typed as heterogeneous workflow payload records. This allows image-generation and image-to-video nodes to carry their different input schemas without unsafe casts or removing fields.

## Validation

A targeted strict TypeScript check covering the GalaxyAI client, provisioning, workflow metadata, types, and database JSON types passed after the correction.

## Install

Unzip directly into the repository root and choose **Replace**.

Suggested commit message:

```text
H1.10C1 fix GalaxyAI provisioning node typing
```
