# Link Builder Missing Listing Profile Fix

## Problem

Vercel failed with:

```text
Module not found: Can't resolve '@/lib/link-builder/listing-profile'
```

The API routes import:

```ts
import { splitTextareaList } from "@/lib/link-builder/listing-profile";
```

and:

```ts
import {
  buildSubmissionDescription,
  chooseAnchorText,
} from "@/lib/link-builder/listing-profile";
```

but the helper file was missing from the deployed project.

## Fix

This patch adds:

```text
src/lib/link-builder/listing-profile.ts
```

It also adds a compatibility re-export:

```text
src/lib/link-builder/profile.ts
```

so either helper name works.

## Apply

1. Add the included files.
2. Commit.
3. Push.
4. Let Vercel rebuild.

Suggested commit message:

```text
Add missing Link Builder listing profile helper
```
