# Keep GalaxyAI Default + Hide Luma Lane

## Goal

Keep GalaxyAI as the active/default media provider and park Luma until Rudy intentionally enables it.

## What This Does

Adds:

```text
src/lib/config/media-providers.ts
```

and gates the Luma API routes behind:

```bash
ENABLE_LUMA_YOUTUBE_LANE=true
```

Default behavior:

```bash
DEFAULT_MEDIA_PROVIDER=galaxyai
YOUTUBE_VIDEO_PROVIDER=galaxyai
ENABLE_LUMA_YOUTUBE_LANE=false
```

## Behavior

When `ENABLE_LUMA_YOUTUBE_LANE=false`, VIP will block direct Luma start/sync API calls.

The existing Luma database table can remain in Supabase. It does not affect the active GalaxyAI workflow.

## Files Included

```text
src/lib/config/media-providers.ts
src/app/api/campaigns/[campaignId]/luma-youtube-video/start/route.ts
src/app/api/luma/video-runs/[runId]/sync/route.ts
README_KEEP_GALAXY_DEFAULT_HIDE_LUMA.md
```

## Optional follow-up

If your campaign detail page currently shows Luma buttons, hide them by wrapping the Luma controls with:

```ts
import { isLumaYoutubeLaneEnabled } from "@/lib/config/media-providers";

const lumaEnabled = isLumaYoutubeLaneEnabled();
```

and only render the Luma section when:

```tsx
{lumaEnabled ? <LumaSection /> : null}
```

## Apply

1. Add/replace included files.
2. In Vercel, set:

```bash
DEFAULT_MEDIA_PROVIDER=galaxyai
YOUTUBE_VIDEO_PROVIDER=galaxyai
ENABLE_LUMA_YOUTUBE_LANE=false
```

3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Keep GalaxyAI default and gate Luma lane
```
