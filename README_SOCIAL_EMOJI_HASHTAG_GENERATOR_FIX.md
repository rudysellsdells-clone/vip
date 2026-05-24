# VIP Social Emoji + Hashtag Generator Fix

## Goal

Add relevant emojis and hashtags to generated social posts.

Rudy requested:

```text
On social posts, add hashtags and emoji related to the text.
```

## What This Updates

Replaces:

```text
src/lib/content-calendar/monthly-campaign-planner.ts
```

## Behavior

Generated social posts now include:

```text
topic-related emoji
channel-appropriate emoji
strategy-based hashtags
topic-based hashtags
offer/differentiator hashtags
brand hashtag
channel hashtag
```

## Applies To

```text
linkedin_post
facebook_post
```

## Example Output Shape

LinkedIn/Facebook posts will now start with something like:

```text
🔎 📈 🤝 June 2026 Week 1: Authority Growth — AI search visibility
```

And end with hashtags like:

```text
#AiSearchVisibility #VisibilityReview #LocalSEO #WebSearchPros #DigitalMarketing #BusinessGrowth
```

## Hashtag Sources

The generator uses:

```text
Key Topics / Weekly Angles
Primary Offer
Differentiator
Default brand/channel tags
```

## No SQL Required

This only changes the monthly campaign planner output.

## Apply

1. Replace the file.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Add emoji and hashtags to generated social posts
```

## Test

1. Clear/recreate June if desired.
2. Fill in strategy fields, especially:
   - Key Topics / Weekly Angles
   - Primary Offer
   - Differentiator
3. Generate campaigns.
4. Open LinkedIn/Facebook generated assets.
5. Confirm social posts include relevant emoji and hashtags.
