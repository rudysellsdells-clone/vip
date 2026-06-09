# Publishing Republish Lifecycle Note

## Observation

A published asset can currently be republished indirectly through the revision workflow:

```text
published asset
→ request revision
→ approve revision
→ publish revised active version
```

## Current decision

Do not fix this inside H1.2B.

This is not an execution-route bug. It is an asset lifecycle/versioning policy question.

## Why it is not being fixed immediately

The current revision flow may be legitimate in some cases. For example, a user may want to publish a materially revised version of an older post or create a new draft based on a published item.

Blocking this too early could damage the content revision workflow.

## Risk

A user can accidentally republish similar or duplicate content if they do not realize the revised asset is treated as a new active publishable asset.

## Future policy options

Possible future fixes:

1. Add a `published_lineage_id` or `original_published_asset_id` field.
2. Warn when approving a revision whose parent or ancestor was already published.
3. Require explicit confirmation before publishing a revised descendant of a published asset.
4. Add a `republish_allowed` flag controlled by an owner/admin.
5. Add duplicate-content comparison before provider execution.

## Recommended future behavior

The safest future behavior is likely a warning, not a hard block:

```text
This asset is a revision of already-published content. Publishing it may create a duplicate post. Continue?
```

This keeps editorial flexibility while preventing accidental duplicate posts.
