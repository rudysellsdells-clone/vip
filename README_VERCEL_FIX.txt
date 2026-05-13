Rudys VIP Vercel Fix

Add vercel.json to the ROOT of the GitHub repo, next to package.json.

This forces Vercel to treat the project as a Next.js app and clears any incorrect Output Directory override.

After committing this file:
1. Push to GitHub.
2. In Vercel, redeploy without cache.
3. Confirm Build & Development Settings:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: npm run build
   - Install Command: npm install
   - Output Directory: blank/no override
