# H1.4D3A Build Fix — Publishing Ready Asset Type

Vercel strict TypeScript inferred the enriched Publishing Ready asset object as only the two added publishing settings properties. This build fix explicitly casts the base asset row as `Record<string, any>` before enriching it, so fields such as `title`, `status`, `content`, and `asset_type` remain visible to TypeScript.

No SQL is required.
No publishing execution logic is changed.
No provider payload behavior is changed.
