# ☁️ Cloud Functions `functions/`

## Purpose
This directory contains Firebase Cloud Functions designated for server-side logic that cannot be shipped to the client natively. 

Currently, our primary use-cases are:
1. **Dynamic SEO Metadata Injection (Pre-rendering)** for recipe pages via the `ssrRecipe` function.
2. **Hybrid Recipe Extraction Engine** via the `extractRecipe` function, which fetches external recipe URLs, runs our layered parsers (LD+JSON ➔ Microdata ➔ CSS Heuristics ➔ Gemini LLM fallback), normalizes ingredients into quantities and units, maps steps, and returns valid Recifree schemas.
3. **Global Extraction Cache** via the `extractionCache` module (`functions/cache/extractionCache.js`), which normalizes URLs (lowercase hostname, no trailing slash/hash/anchor, no marketing parameters, sorted query arguments), computes a SHA-256 hex hash document ID, and saves/checks the cache against Firestore `extraction_cache` collection.
4. **Dynamic Admin Allowlist Gatekeeping** via the `adminGate` module (`functions/security/adminGate.js`), which queries `/app_config/admin_users` to dynamically manage authorized emails.
5. **Extraction Rate Limiting** via the `rateLimiter` module (`functions/security/rateLimiter.js`), which enforces a rolling sliding-window limit of 10 extractions per hour per user using the Firestore `rate_limits` collection.
6. **Prompt Injection Defense** via instruction isolation (sandwich defense) in the Gemini parser (`functions/parsers/llmParser.js`), ensuring third-party recipe markup cannot hijack LLM formatting rules.

## Core Directives for Agents

1. **Lightweight & Fast**: Cloud Functions must be incredibly performant. Avoid massive library imports. Keep cold starts fast using slim parsers (e.g. `node-html-parser`) and avoid heavy headless browsers.
2. **SEO Over DOM**: When serving SEO content, do **not** attempt full DOM element React-style rendering on the server unless explicitly requested. Our current approach injects schema and meta tags into the static `dist/index.html` payload and relies on client-side React hydration to build the UI for actual users.
3. **Data Integrity**: Directly query Firestore using `firebase-admin` for dynamic records securely.
4. **Local Testing**: Always test changes locally via `npm run serve` (which triggers Firebase Emulators for functions). Ensure modifications do not break `npm run dev` in the root repository.
5. **Strict Billing Failsafe**: The `.runWith({ maxInstances })` parameter on the server exports MUST NEVER be removed or increased beyond approved guidelines (maxInstances: 3) without explicit permission from the user. It is mathematically designed to prevent unexpected overages from bot spam on the Google Cloud free tier.
