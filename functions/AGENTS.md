# ☁️ Cloud Functions `functions/`

## Purpose
This directory contains Firebase Cloud Functions designated for server-side logic that cannot be shipped to the client natively. 

Currently, our primary use-case is **Dynamic SEO Metadata Injection (Pre-rendering)** for recipe pages.

## Core Directives for Agents

1. **Lightweight & Fast**: Cloud Functions (acting as rewriting middleware for Firebase Hosting) must be incredibly performant. Avoid massive library imports.
2. **SEO Over DOM**: When serving SEO content, do **not** attempt full DOM element React-style rendering on the server unless explicitly requested. Our current approach injects schema and meta tags into the static `dist/index.html` payload and relies on client-side React hydration to build the UI for actual users.
3. **Data Integrity**: Directly query Firestore using `firebase-admin` for dynamic records securely.
4. **Local Testing**: Always test changes locally via `npm run serve` (which triggers Firebase Emulators for functions). Ensure modifications do not break `npm run dev` in the root repository.
5. **Strict Billing Failsafe**: The `.runWith({ maxInstances: 1 })` parameter on the server export MUST NEVER be removed or increased without explicit permission from the user. It is mathematically designed to prevent unexpected overages from bot spam on the Google Cloud free tier.
