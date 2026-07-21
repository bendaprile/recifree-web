# Recifree Feature Roadmap

This roadmap outlines planned enhancements to elevate the Recifree user experience, transitioning from a static MVP to a fully viable aggregator equipped with AI-extraction and sustainable monetization.

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

## Phase 4a: Culinary UX & Functional Polish (Immediate Priorities)
*Transforming the site from a simple reader into a powerful kitchen utility. These are the highest-impact features that make Recifree genuinely useful in a real kitchen.*

- ✅ **Print-Friendly View:** Dedicated CSS to hide everything except the recipe title, ingredients, and instructions when users print physically. *(Quick win — the print button already exists, just needs proper `@media print` styling.)*
- ✅ **Shopping List 2.0 (Ingredient Consolidation):** Overhauled the shopping list from per-recipe grouping into a **unified, ingredient-merged view** with unit-aware quantity consolidation (tsp↔tbsp↔cup, oz↔lb, g↔kg, ml↔L), bulk check/uncheck actions, expandable source recipe attribution, checked-items-at-bottom sorting, and a toggle to switch back to per-recipe view. Includes print-optimized styling.
  - ⏳ *Fast-follow: Shopping List Cloud Sync* — Persist shopping lists to Firestore so they sync across devices (currently localStorage only).
  - ⏳ *Fast-follow: Grocery Category Grouping* — Group consolidated ingredients by category (Produce, Dairy, Pantry, etc.) for grocery-aisle navigation.
- **Interactive "Cook Mode":** Full-screen overlay with large text, wake-lock API to prevent screen dimming, and prominent navigation buttons. This is the flagship differentiator — turning Recifree from a recipe viewer into a hands-free kitchen tool.
- **Dynamic Portion Scaling & Computation:** AI-powered serving size recalculation and automatic metric/imperial unit conversions.
- **PWA Support (Offline Mode):** *(Pulled forward from Phase 6.)* Service workers to cache recipes so the app works seamlessly from the user's mobile home screen. Offline support is essential for Cook Mode in kitchens with spotty WiFi, making these two features natural companions.

## Phase 4b: Scale-Dependent UX Features
*These features become valuable once the recipe catalog reaches critical mass (~100+ recipes). Building them prematurely would feel empty.*

- **Advanced Search & Filtering:** Granular filters for aspects like "Total Time", "Difficulty", and "Main Ingredient" querying the new database.
- **Infinite Scrolling & Pagination:** Implement asynchronous batch rendering (e.g., loading 15 recipes at a time via `IntersectionObserver`) to ensure ultra-fast front-end performance as the recipe count scales. This will be integrated directly with the overarching search overhaul.
- **Verified Recipe Ratings & Reviews:** Implement a community-driven rating (1–5 stars) and commenting system. To combat the "fake review" epidemic common on other food blogs, restrict submissions to authenticated, email-verified users, and display aggregate scores and review histories transparently. *(Requires user traction to avoid "0 reviews" on every recipe.)*

## Phase 5: Contextual Commerce (Monetization V1)
*Non-intrusive revenue generation based on high-intent grocery actions.*
- **"Send to Grocery Cart" Integration:** Connect to major retail network APIs (e.g., Instacart Connect or Chicory) to fulfill ingredient lists natively for a commission.
- **Native AI Image Sponsorships:** Dynamically integrate brand sponsors natively into the AI image generation prompt (e.g., generating a KitchenAid mixer in the background with a subtle sponsor watermark) as a premium advertising tier.
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
- **"Surprise Me" (Randomizer):** A feature to combat decision paralysis with a randomized recipe suggestion.
- **Recipe Health Score:** Analyze ingredients/nutrition to generate a quick A-F or 1-100 health contextual score.
- **Fun Recipe Wording:** Settings allowing users to adjust the "personality" of the recipe instructional text (e.g., Sassy, Chaotic) via LLM prompting.