# Recifree Feature Roadmap

This roadmap tracks Recifree's path from a single-author recipe collection to a community-driven, trust-first recipe platform: no ads, no fake reviews, every recipe cooked by the person who published it, and clear credit to the original creator. AI extraction and sustainable monetization serve that goal; they are not the goal.

**Current authorized phase: 4a — The Contribution Loop.** Phases 1 through 3 are complete. Per `AGENTS.md`, do not build a feature from any other phase without explicit permission from the user.

## Phase 1: Architecture & Data Foundation
*Setting the necessary technical groundwork before scaling logic and features.*

### 1a. User Authentication Finalization ✅ Complete
- ✅ **Email Verification Guard:** Require users to verify their email addresses via Firebase's authentication flow before gaining access to core features or DB writing privileges.
- ✅ **Protected Routes Infrastructure:** Implement conditional `<ProtectedRoute>` wrappers in React Router to redirect unauthenticated users away from private features (e.g., `/saved`).
- ✅ **Modal & Form Polish:** Implement keyboard trapping, `Escape` key close support, and auto-focusing on the first input out-of-the-box for `LoginModal`.
- ✅ **Silent Auth Error Handling:** Intercept and silently dismiss `auth/popup-closed-by-user` errors so users don't see harsh red UI if they cancel a Google OAuth flow.

### 1b. Database & Routing Pipeline ✅ Complete
- ✅ **Database Migration for Recipes:** Migrate the static JSON recipe data layer to a cloud database (e.g., Firestore) to handle dynamic user-generated content.
- ✅ **Dynamic Routing Architecture:** Reconfigure the router to handle dynamic database lookups (e.g., `/recipe/:slug`) instead of static local files.
- ✅ **SSR / Pre-rendering Implementation:** Upgrade deployment (e.g., Server-Side Rendering or Static Site Generation) to ensure SEO crawlers receive fully rendered HTML instead of an empty loading state.
- ✅ **User Saved Recipes:** Implement a system for users to save recipes to their profile and create different lists for different types of recipes.
- ✅ **Custom Domain & Email Deliverability:** Register a production domain and configure custom DNS records (SPF/DKIM/DMARC) in Firebase Authentication to ensure verification emails reliably land in users' primary inboxes instead of spam.
- ✅ **Production Rollout:** Remove the active closed-beta feature flag (`VITE_ENABLE_SIGNUPS`) and roll out the final registration engine to live servers.

## Phase 2: The Extraction Engine (MVP) ✅ Complete
*Building the legal and functional core for ad-free recipe aggregation.*
- ✅ **User-Initiated URL Extraction:** An input field for users to paste a recipe URL, initiating extraction on a per-user basis to minimize web-scraping liability.
- ✅ **Prompt Security & Injection Defense:** Security protocols to ensure malicious URLs or hidden text cannot hijack the LLM prompt or leak backend system instructions (SSRF prevention, HTML sanitization, strict JSON mapping, and input character limits implemented in backend).
- ✅ **Hybrid Recipe Parsing Pipeline:** A layered approach: Layer 1 extracts hidden `ld+json` and `microdata` structures. Layer 2 applies HTML heuristic selectors. Layer 3 falls back to Google Gemini LLM text extraction.
- ✅ **AI Image Generation Engine:** Automatically generate a unique visual representation for each extracted recipe to completely avoid scraping copyrighted photography (Google Gemini Imagen 3 REST API and Firebase Storage upload integrated).
- ✅ **Manual Entry Fallback Form:** A clean manual input form to gracefully handle extraction failures or heavily bot-protected websites.
- ✅ **The "Tried & True" Sign-Off:** A mandatory UX step during URL extraction or manual entry where the uploading user must click a checkbox formally verifying: "I have actually cooked this, and it is delicious."
- ✅ **Global Extraction Cache:** Store parsed text and AI images in the database so subsequent visits to the same recipe URL require zero AI API consumption.
- ✅ **Source Attribution Component:** UI elements that prominently link and credit the original publisher.

## Phase 3: SEO Dominance & Core Performance ✅ Complete
*Maximizing organic acquisition by satisfying algorithmic requirements.*
- ✅ **Dynamic JSON-LD Recipe Schema:** Auto-formatting parsed database data into perfect technical schema for Google Rich Snippets.
- ✅ **Core Web Vitals Optimization:** Implement aggressive asset caching and edge delivery for instant, sub-second loading speeds.

## Phase 4a: The Contribution Loop ⬅️ **CURRENT PHASE**
*The loop that turns Recifree from one person's recipe collection into a community catalog. Nothing else in Phase 4 starts until this ships.*

**Context, not instructions.** A signed-in user extracts recipes into a private shelf only they can see. They cook one. To publish it to the public catalog they upload their own photo of the dish and confirm they cooked it. Private extraction is why a user comes back; the publish gate is both the quality bar and the image source. A consequence worth stating: this removes AI image generation from the critical path, because a published recipe carries a real photo taken by the person who cooked it. See `docs/market_research_verdict.md` §4 for the legal rationale.

### MVP scope
Everything in this list ships before anything in Phase 4b.

- **Private Extraction Shelf:** A per-user view of recipes the user extracted but has not published. Visible only to that user. Fully usable — readable, printable, addable to the shopping list — without ever being published.
  - ✅ *Storage and state:* `src/services/shelfService.js` (Firestore at `users/{uid}/shelf`) and `src/context/ShelfContext.jsx` (localStorage when signed out, drains into Firestore on sign-in and clears the local copy). Owner-only access enforced by the `shelf` rule in `firestore.rules`. 26 tests across `shelfService.test.js` and `ShelfContext.test.jsx`.
  - ✅ *Published recipes stay on the shelf as references.* Publishing converts the draft into a `{ slug, status: 'published' }` pointer rather than keeping a second copy — two copies drift and the public one has to win. The shelf resolves references against the catalog for display, and drops any whose recipe has been removed. Filter tabs separate Private from Published once both exist.
  - ✅ *Users delete their own drafts; published recipes cannot be pulled back.* No unpublish: recipes disappearing from the catalog at will is worse for readers than the occasional regret, and other users' saved lists resolve through `getRecipeBySlug` and would silently lose the entry.
  - ✅ *Shelf view:* `src/pages/Shelf/Shelf.jsx` at `/shelf`, plus `/shelf/:id` which renders the existing Recipe page with `fromShelf`. Deliberately not behind `ProtectedRoute` — a signed-out user must be able to reach their own localStorage shelf. A "Shelf" nav link appears once the user is signed in or holds any shelved recipe.
  - ✅ *The at-risk warning:* a banner on `/shelf` while the shelf is device-only, with a route to sign up. Not a tooltip.
  - ⚠️ *Save is suppressed on shelf recipes.* `SavedRecipes` stores only a recipe id and resolves it later through `getRecipeBySlug`, which cannot see unpublished recipes — a save would silently vanish from the saved list. Print and Add to Shopping List both work, because they read the recipe inline. Revisit when the Publish Gate exists.
  - ✅ *Open to everyone, including signed-out visitors.* `/add` is no longer behind `ProtectedRoute`. `functions/security/callerTier.js` sorts callers into two tiers: `admin` (on the `app_config/admin_users` allowlist) and `restricted` (everyone else, signed in or not).
- **Spend Containment ⛔ LOAD-BEARING:** Restricted callers reach the free parser layers only. The Gemini LLM fallback and Imagen photo generation both check the tier first, so an anonymous visitor cannot spend API budget. When the parsers find nothing, the response is a 422 with `canRetryManually`, and the UI offers the Phase 2 manual entry form rather than a dead end. Rate limiting keys on a SHA-256 of the client IP for anonymous callers — a hash, never the address, because Recifree does not keep a log of who read what.
  - ⚠️ *Cache interaction, undecided.* A restricted extraction writes to the shared `extraction_cache` with no image. If an admin later pastes the same URL they get that cached entry and no photo is generated. Acceptable while images move to user uploads, but it is a silent behavior change worth revisiting if AI images matter again.
  - ⚠️ *Only admins can publish.* `firestore.rules` restricts writes to the public `recipes` collection to `request.auth.token.admin == true`, and `AddRecipe` routes everyone else to their shelf. This is the Publish Gate's placeholder, not the Publish Gate.
- ✅ **Publish Gate:** `src/components/PublishPanel/` on `/shelf/:id` promotes a shelf recipe to the public catalog. A photo of the finished dish is mandatory and the "Tried & True" sign-off from Phase 2 must be set; the server rejects the publish otherwise. On success the shelf copy is removed so the public one cannot drift.
  - Publishing runs server-side in `functions/publishRecipe.js`. The client never writes to `recipes`, and the photo is uploaded with the Admin SDK, so no client needs Storage write access and no `storage.rules` file is required.
  - ⛔ **Still admin-only, held by the Opening the doors checklist below.** `identifyCaller` must return the admin tier or the function returns 403 and the recipe stays on the shelf. When the safe harbor items are done, that single tier check is what changes.
  - ⚠️ **Three disagreeing definitions of "admin" existed.** `app_config/admin_users` (Cloud Functions), `request.auth.token.admin` (`firestore.rules`), and `userProfile.role` (frontend). No account has ever carried the custom claim, so `firestore.rules` denied every write to `recipes` regardless of the other two. Publishing now uses the allowlist alone. `firestore.rules` stays locked as defence in depth; do not loosen it to "fix" publishing.
- ✅ **User Image Upload:** `src/services/publishService.js` downscales to 1600px and re-encodes as JPEG before upload, keeping phone photos inside the request limit and off the critical rendering path. Never fetch, hotlink, or persist an image from the source URL; `functions/extractRecipe.js` blanks any non-Firebase-Storage image URL before saving, and that must stay.
  - ⚠️ **Firebase Storage did not exist on this project until August 2026.** `admin.storage().bucket()` resolved to `<project>.appspot.com`, which was never provisioned, so every AI-generated image was produced and then lost on upload — all 38 pre-existing recipes reference hand-committed local paths instead. The real bucket is `recifree-web-4731f.firebasestorage.app`. `getStorageBucket()` in `functions/imageGen/imagenService.js` now resolves it explicitly and returns null rather than silently discarding an image.
- **Dual Attribution:** Every published recipe credits two parties, both visibly: the Recifree user who published it, and the original recipe creator. The Phase 2 Source Attribution Component already covers the original creator and must keep sending them real referral clicks. Uploader attribution is new.
- **Ratings & Reviews (display only):** Stars and text on the recipe page, restricted to authenticated, email-verified users. At MVP a review changes **nothing** about visibility — no ranking, no homepage shelf, no trusted-poster badge. This is deliberate: with no visibility payoff, sockpuppet accounts buy nothing and reviews ship without a moderation system. Do not add ranking to this phase.
- **Paste Deduplication:** When a user pastes a URL that already maps to a **published** recipe, do not create a second recipe. Route the user to the existing one and add it to their saved list. Key on the normalized URL hash from `functions/cache/extractionCache.js`.
- ✅ **Scope the Extraction Cache to Prevent Leaks:** `functions/cache/extractionCache.js` keys purely on a SHA-256 of the normalized URL with no user scoping, and returns the cached document to any caller. It used to carry `_extractionMeta.extractedBy` — the extracting user's email — which would have been served to the next user pasting the same URL. `extractRecipe.js` no longer records it, and `stripExtractorIdentity()` removes it on both read and write so the documents written before the guard existed are scrubbed too. Covered by four tests in `functions/cache/extractionCache.test.js`, all of which fail if the guard is removed.
  - The cached parse itself is derived from a public web page and is not private to the extracting user, so sharing it across accounts is the cache working as intended. Identity was the only thing leaking.
  - ⚠️ **Constraint for the shelf work:** `extraction_cache` is written only by the Cloud Function, before any user edits. When the shelf lets a user edit a recipe, those edits go to that user's own storage. Never write user-edited content back into `extraction_cache`, or one user's changes will surface in another user's extraction.
  - ⏳ One production document written before the fix still stores an email at rest. It is no longer served, but it should be scrubbed.
- **Anonymous Rate Limiting:** `functions/security/rateLimiter.js` keys its 10-per-hour limit on user email or UID. Signed-out extraction needs a limiter that does not depend on an account.
- **Extraction Reliability Fixes**
  - ✅ **Malformed JSON-LD was the main cause of failed parses.** `parseLdJson` called `JSON.parse` directly on each block, and much of the recipe web does not emit strictly valid JSON. Two shapes accounted for the failures: CDATA and JavaScript comment wrappers from the WordPress recipe plugins, and raw control characters inside string values. `parseJsonLdBlock` now repairs both before parsing. Verified live and anonymously against inspiredtaste.net and eatwell101.com, both of which had returned 422 while containing a complete schema.org Recipe. This is the likely source of the assumed ~50% failure rate, and of the Gemini fallback firing more than it should have.
  - ✅ **Every extraction failure now returns `canRetryManually`**, so the frontend routes to the Phase 2 Manual Entry Fallback Form instead of dead-ending.
  - ⚠️ **Some publishers block server-side fetches outright.** eatingwell.com returns HTTP 402 before there is anything to parse. Manual entry is the answer; defeating bot protection is not on the table.
  - ⏳ Database access errors during extraction, reported earlier, remain undiagnosed and have not recurred.
- ✅ **Extraction Method Instrumentation:** `scripts/extraction-stats.js` (`npm run stats:extraction`) reports the parse-layer distribution and the missing-image rate from the `extraction_cache` collection. Read-only; runs against production or, with `FIRESTORE_EMULATOR_HOST` set, the emulator.
  - ⚠️ **First run, August 2026: production `extraction_cache` held exactly 1 document.** It parsed at Layer 1 (`ld+json`, free) and has no image. The emulator exports in `firebase-export-*/` are empty. There is no historical extraction corpus anywhere, so the previously assumed ~50% failure rate is recollection, not data.
  - ⏳ *Blocked on data:* run a representative batch of real recipe URLs through the deployed pipeline, then re-run the report. Until then, treat every Gemini cost and failure-rate figure as unmeasured.

### Opening the doors ⛔ BLOCKING
*One checklist, not two. Every item here becomes load-bearing at the same instant: the first time someone who is not the repository owner can publish. Until then the Publish Gate returns 403 and the exposure is zero. Do not open publishing partially — a half-finished checklist provides no protection at all.*

**Copyright: DMCA safe harbor.** Rationale in `docs/market_research_verdict.md` §4.
- Register a designated agent with the U.S. Copyright Office ($6, expires after three years).
- Publish the agent's name, physical address, phone, and email on a public page of the site. Use a business address; the directory is public.
- Write and enforce a repeat-infringer termination policy (17 U.S.C. §512(i) — a threshold condition; failing it voids all four safe harbors).
- Set a calendar reminder for the three-year re-designation. A lapsed registration voids protection retroactively.

**Removal.** Required for a takedown to be possible at all, so it precedes opening publishing rather than following it.
- ✅ Admin deletion of any catalog recipe, via `functions/adminRecipes.js`. Deletes the Firestore document and every stored image for the slug. Admin-only against the `app_config/admin_users` allowlist, enforced server-side; `firestore.rules` keeps `allow delete: if false` so no client can do it directly.
- ✅ The client learns whether it may show destructive controls from the `capabilities` endpoint, because `firestore.rules` denies reading `app_config` and no account carries an admin custom claim. It fails closed.
- ⏳ A documented takedown procedure: who receives the notice, how fast it is actioned, and where it is recorded.

**Image moderation.** Accepting photos from strangers is what creates this; it does not apply while publishing is admin-only.
- Screen every upload with Cloud Vision SafeSearch **before** the bytes reach Storage, and reject on high-confidence adult, violence, or racy results. $1.50 per 1,000 images, first 1,000 each month free.
- Tune the thresholds against real food photography before launch. A rare steak, a butchery shot, or a dark red sauce trips violence and gore detectors. Rejecting someone's genuine dinner photo with no recourse is a worse first experience than a slow review.
- Give a rejected upload a way back: a human-reviewable appeal, not a dead end.
- **Decide the CSAM position explicitly, in writing, before opening uploads.** Under 18 U.S.C. §2258A a provider with actual knowledge of apparent CSAM must report it to NCMEC. There is no small-platform exemption, and a knowing failure to report carries fines up to $150,000 for a first offence. A classifier reduces how often you encounter it; it does not discharge the duty. Consider a hash-matching service (PhotoDNA, Cloudflare's CSAM Scanning Tool) rather than relying on SafeSearch alone.
- If that obligation is not one a solo operator wants, the honest alternative is **not** switching to AI-generated images — those leave the text moderation surface untouched and cost the Tried & True promise its meaning. The alternative is keeping contributions to people who have been approved.

**Text moderation.** Titles, descriptions, and instruction steps are user-generated too, and remain a moderation surface whatever happens with images.

### Fast-follows, after MVP ships
Each of these adds a visibility payoff or a moderation surface. None is required for the loop to work.

- **Comments on recipes.**
- **Trusted Poster Badge and rating-based ranking.** The moment ratings affect what other people see, sockpuppet rings become profitable. Do not ship this without the moderation mechanism below already running.
- **AI moderation agents** watching for suspicious rating and account patterns. Hiring human moderators is out of budget and is not a fallback. Note that anomaly detection needs a baseline, so this is a scale answer, not a launch answer.
- **Contribution incentive (karma or points).** Cut from MVP and may never ship. Recifree has no social feed for a score to be visible in, and points are what make gaming pay.

### Open decisions in Phase 4a
- **First-visit acquisition.** The loop explains why a user returns. Nothing yet explains why anyone arrives. `docs/market_research_verdict.md` names Pinterest and TikTok and warns that Google penalizes minimalist pages as thin content. Unresolved, and acknowledged as the hardest problem on the board.

## Phase 4b: Culinary UX & Functional Polish
*Deferred behind Phase 4a. These make Recifree a better kitchen tool, but none of them are required for the contribution loop to work.*

- ✅ **Print-Friendly View:** Dedicated CSS to hide everything except the recipe title, ingredients, and instructions when users print physically.
- ✅ **Shopping List 2.0 (Ingredient Consolidation):** Unified, ingredient-merged view with unit-aware quantity consolidation (tsp↔tbsp↔cup, oz↔lb, g↔kg, ml↔L), bulk check/uncheck actions, expandable source recipe attribution, checked-items-at-bottom sorting, and a toggle back to per-recipe view. Includes print-optimized styling.
  - ⏳ *Fast-follow: Shopping List Cloud Sync* — Persist shopping lists to Firestore so they sync across devices (currently localStorage only).
  - ⏳ *Fast-follow: Grocery Category Grouping* — Group consolidated ingredients by category (Produce, Dairy, Pantry, etc.) for grocery-aisle navigation.
- **Interactive "Cook Mode":** Full-screen overlay with large text, wake-lock API to prevent screen dimming, and prominent navigation buttons.
- **Dynamic Portion Scaling & Computation:** AI-powered serving size recalculation and automatic metric/imperial unit conversions.
- **PWA Support (Offline Mode):** Service workers to cache recipes so the app works from the user's mobile home screen.

## Phase 4c: Scale-Dependent UX Features
*These become valuable once the recipe catalog reaches critical mass (~100+ recipes). Building them prematurely would feel empty.*

- **Advanced Search & Filtering:** Granular filters for aspects like "Total Time", "Difficulty", and "Main Ingredient" querying the new database.
- **Infinite Scrolling & Pagination:** Asynchronous batch rendering (e.g., loading 15 recipes at a time via `IntersectionObserver`) to keep the front end fast as the recipe count scales. Integrated with the search overhaul.
- ~~**Verified Recipe Ratings & Reviews**~~ — moved to Phase 4a as display-only. Rating-based ranking and the trusted-poster badge are Phase 4a fast-follows. Nothing about reviews remains in this phase.

## Phase 5: Contextual Commerce (Monetization V1)
*Non-intrusive revenue generation based on high-intent grocery actions.*
- **"Send to Grocery Cart" Integration:** Connect to major retail network APIs (e.g., Instacart Connect or Chicory) to fulfill ingredient lists natively for a commission.
- **Native AI Image Sponsorships:** Dynamically integrate brand sponsors natively into the AI image generation prompt (e.g., generating a KitchenAid mixer in the background with a subtle sponsor watermark) as a premium advertising tier. ⚠️ Once recipe images are user-uploaded, revenue attached directly to a user-supplied image risks the "direct financial benefit" test that voids DMCA safe harbor. Read `docs/market_research_verdict.md` §4 before building this.
- **Specialized Ingredient Affiliate Links:** Automated hyperlinking of niche or expensive ingredients to specialty vendors or Amazon for affiliate kickbacks.
- **Affiliate Disclosure & Legal Compliance UI:** Ensure FTC compliance and trust by rendering non-intrusive disclosures whenever commerce links are utilized.

## Phase 6: Acquisition & Virality
*Features designed specifically to encourage sharing and external discovery.*
- **Social Sharing Mechanics:** Easily exportable, beautifully branded, ad-free image "Recipe Cards" optimized for sharing on Pinterest, Instagram, and TikTok.

## Phase 7: Freemium SaaS (Monetization V2)
*Locking in "power users" with premium utility formats and recurring subscriptions.*
- **Stripe / Payment Gateway Integration:** Secure infrastructure to handle subscription tiers and recurring billing.
- **Digital Cookbooks & Custom Categorization:** Allow premium users to create unlimited permanent saves and highly customized folder organization.

## Phase 8: Long-Term "Fun" Features
*Optional enhancements that add novel value but aren't strictly necessary for the core loop.*
- **Personalized Recipe Algorithm:** Tailor recommendations to each user based on what they save, cook, and rate. Explicitly a distant goal — it needs both a large catalog and real engagement history before it can produce anything but noise.
- **"Surprise Me" (Randomizer):** A feature to combat decision paralysis with a randomized recipe suggestion.
- **Recipe Health Score:** Analyze ingredients/nutrition to generate a quick A-F or 1-100 health contextual score.
- **Fun Recipe Wording:** Settings allowing users to adjust the "personality" of the recipe instructional text (e.g., Sassy, Chaotic) via LLM prompting.