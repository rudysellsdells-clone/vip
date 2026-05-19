# VIP Luma 20-Second YouTube Video Lane

## Goal

Split campaign media into two lanes:

```text
GalaxyAI → fast social media assets for Facebook/LinkedIn
Luma → 20-second campaign video for YouTube
```

This patch focuses on creating and reviewing the Luma output. YouTube upload through Zapier MCP comes next after the Luma output is verified.

## Why Luma

Luma's API supports:

- Bearer token authentication
- Ray 2 / Ray 2 Flash models
- Text-to-video
- Image/keyframe-to-video
- 5-second generation duration
- 16:9 aspect ratio
- Extending a completed generation into a longer video
- Video URL output when completed

Official docs show:

```text
POST https://api.lumalabs.ai/dream-machine/v1/generations
Authorization: Bearer <luma_api_key>
```

and Extend Video using:

```json
{
  "keyframes": {
    "frame0": {
      "type": "generation",
      "id": "previous_generation_id"
    }
  }
}
```

## How VIP Builds 20 Seconds

VIP creates a four-scene plan:

```text
Scene 1: Hook, 0–5 seconds
Scene 2: Problem, 5–10 seconds
Scene 3: Solution, 10–15 seconds
Scene 4: CTA, 15–20 seconds
```

The first scene starts as text-to-video.

Scenes 2–4 extend the previous completed Luma generation.

The final scene's video URL becomes:

```text
final_video_url
```

That is the video we will later send to YouTube.

## Files Added

```text
db/migrations/20260518_luma_youtube_video_runs.sql
src/lib/luma/client.ts
src/lib/luma/youtube-video-plan.ts
src/app/api/campaigns/[campaignId]/luma-youtube-video/start/route.ts
src/app/api/luma/video-runs/[runId]/sync/route.ts
src/components/campaigns/StartLumaYoutubeVideoButton.tsx
src/components/campaigns/SyncLumaVideoRunButton.tsx
```

## File Updated

```text
src/app/(app)/campaigns/[campaignId]/page.tsx
.env.example
```

## Environment Variables

Add these in Vercel:

```bash
LUMA_API_KEY=
LUMA_MODEL=ray-2
LUMA_RESOLUTION=720p
LUMA_ASPECT_RATIO=16:9
```

## Database Migration

Run this in Supabase SQL Editor:

```text
db/migrations/20260518_luma_youtube_video_runs.sql
```

It creates:

```text
luma_video_runs
```

## User Flow

1. Open a campaign detail page.
2. Click:

```text
Start Luma 20s YouTube Video
```

3. Wait for Luma scene 1 to finish.
4. Click:

```text
Sync Luma Run
```

5. When scene 1 completes, VIP starts scene 2.
6. Repeat sync after each scene completes.
7. After scene 4 completes, VIP stores:

```text
final_video_url
```

8. Open the final Luma video and review the output.

## Why Manual Sync First

This is the safest first test because Luma video generation is asynchronous.

Once we verify output quality, we can add a webhook or scheduled polling so the run advances automatically.

## What This Does Not Do Yet

This does not upload to YouTube yet.

Next patch after testing output:

```text
Approved Luma final_video_url
→ Prepare YouTube upload action through Zapier MCP
→ Approve execution
→ Upload to YouTube
→ Store YouTube video ID/URL
→ Mark video asset as published
```

## Apply

1. Add/replace included files.
2. Run Supabase migration.
3. Add Luma env vars in Vercel.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Add Luma 20s YouTube video lane
```

## Test

1. Open a campaign page.
2. Start a Luma YouTube run.
3. Confirm a row appears in `luma_video_runs`.
4. Wait until Luma completes scene 1.
5. Click Sync Luma Run.
6. Confirm scene 2 starts.
7. Repeat for scenes 3 and 4.
8. Confirm final video URL appears.
9. Open final video and review quality.
