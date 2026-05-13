# Rudys VIP Password Login Fix

This patch changes `/login` so Sprint 1 can continue without relying on Supabase magic-link emails.

## Files included

- `src/app/login/page.tsx`

## What changed

- Password login is now the default.
- Magic link is still available as a secondary option.
- Magic link uses `shouldCreateUser: false` to avoid accidental new-user signups.
- The page no longer depends on receiving auth emails for Sprint 1 testing.

## Required Supabase setup

1. Go to Supabase → VIP Project → Authentication → Users.
2. Add or edit Rudy's user.
3. Set an email and password.
4. Make sure the user is confirmed / auto-confirmed.
5. Log in at `/login` using email + password.

## Why this is needed

Supabase's built-in email provider has strict project-wide limits. Password login avoids the email sender during development.
