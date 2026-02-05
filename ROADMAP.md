# Recifree Feature Roadmap
This roadmap outlines planned enhancements to elevate the Recifree user experience, expanding on our "no clutter" philosophy to build a truly robust yet minimalist cooking platform.

## Phase 1: Experience Polish & Usability
*Enhancing the core functionality to be smoother and more powerful.*

1. **Advanced Search & Filtering**
   - **Problem:** Finding specific types of recipes (e.g., "Quick Dinner" or "High Protein") is limited to basic text search.
   - **Solution:** Add granular filters.
   - **Implementation:** Filter by "Total Time" (< 30m), "Difficulty", and specific "Main Ingredient".
   - **UX:** Sidebar or expandable filter menu on Home.

2. **Shopping List 2.0**
   - **Problem:** The shopping list is a flat list of items, making it hard to use in a real store.
   - **Solution:** Smart categorization and easy management.
   - **Implementation:** Group items by aisle/category (Produce, Dairy, Pantry). Add "Clear All" and "Copy to Clipboard" buttons.
   - **UX:** Sectioned list view with bulk actions.

3. **Print-Friendly View**
   - **Problem:** Printing a web page often includes navbars and hero images, wasting ink.
   - **Solution:** Dedicated print style.
   - **Implementation:** CSS `@media print` styles to hide everything except the recipe title, ingredients, and instructions.
   - **UX:** "Print Recipe" button on the recipe detail page.

## Phase 2: Core Cooking Utilities
*Features that make the actual act of cooking easier.*

4. **Dynamic Portion Scaling**
   - **Problem:** Users often cook for different group sizes.
   - **Solution:** +/- control for "Servings".
   - **Implementation:** Automatically recalculate ingredient quantities based on the selected serving size.
   - **UX:** Simple stepper control near the ingredients list.

5. **Interactive "Cook Mode"**
   - **Problem:** Screens dim while cooking; small text is hard to read from a distance.
   - **Solution:** A focused, step-by-step view.
   - **Implementation:** Full-screen overlay with large text, wake-lock API to prevent screen dimming, and big navigation buttons.
   - **UX:** Prominent "Start Cooking" button on recipe page.

## Phase 3: Personalization & Engagement
*Making the site feel personal without login walls.*

6. **Local Favorites**
   - **Problem:** "I cooked this last week and loved it, but can't find it now."
   - **Solution:** "Heart" recipes to save them locally.
   - **Implementation:** Persist recipe IDs in `localStorage`.
   - **UX:** Heart icon on cards; new "My Favorites" filter tab.

7. **"Surprise Me"**
   - **Problem:** Decision paralysis on what to cook.
   - **Solution:** Random recipe picker.
   - **UX:** "Shuffle" or "Surprise Me" button in the navbar.

8. **Social Sharing**
   - **Problem:** Sharing a recipe currently requires copying the URL manually.
   - **Solution:** Native share integration.
   - **Implementation:** `navigator.share()` API for mobile, copy-link fallback for desktop.

## Phase 4: Long-Term Growth
*Bigger features for the future.*

9. **Recipe Health Score**
   - **Problem:** Users want quick health context.
   - **Solution:** Computed health rating.
   - **Implementation:** Analyze ingredients/nutrition to generate a A-F or 1-100 score.

10. **Fun Recipe Wording (Optional Setting)**
    - **Concept:** Allow users to adjust the "personality" of the recipe text (0 = Neutral, 1 = Sassy, 2 = Chaotic).
    - **Implementation:**  Dynamic text replacement or AI-generated variations.

11. **PWA Support (Offline Mode)**
    - **Concept:** Allow the app to work without internet.
    - **Implementation:** Service workers to cache recipes.