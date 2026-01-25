# Recifree Feature Roadmap
This roadmap outlines planned enhancements to elevate the Recifree user experience while maintaining our "no clutter" philosophy.


## Phase 1: Core Utility Enhancements
Features that make cooking easier immediately.

1. Dynamic Portion Scaling
Problem: Users often need to cook for more or fewer people than the recipe specifies. Solution: Add a +/- control for "Servings" on the recipe page.

Implementation: Automatically recalculate ingredient quantities based on the selected serving size.
UX: Simple stepper control near the ingredients list.

2. Interactive "Cook Mode"
Problem: Screens dim while cooking; small text is hard to read from a distance. Solution: A dedicated "Cook Mode" view.

Implementation: Full-screen overlay with large text, wake-lock API to prevent screen dimming, and step-by-step navigation (one step per screen).
UX: prominent "Start Cooking" button.

3. Smart Shopping List
Problem: Users need to track what to buy. Solution: A "Add to Shopping List" feature.

Implementation: Store selected ingredients in localStorage.
UX: Checkboxes next to ingredients; a localized "Shopping List" page or modal showing aggregated items.
Improvement Future: Multiple types of the same ingredients in the shopping list will combine into one ingredient and add the amount to each other. (Example: Two recipes use 2 chicken breasts will just display as 4 chicken breasts on the shopping list)

4. Recipe Health Score
Problem: Users would like to know how healthy a recipe is at a glance before making.

Implementation: Calculate health score based on ingredients and nutrition information during recipe generation.
UX: Display health score on recipe cards and detail pages.

## Phase 2: Personalization (No Login Required)
Features that make the site feel personal without compromising privacy.

4. Local Favorites
Problem: Users lose track of recipes they liked. Solution: "Heart" recipes to save them.

Implementation: Persist recipe IDs in localStorage.
UX: Heart icon on recipe cards and detail pages; a new "My Favorites" filter or page.

5. Dark Mode Support
Problem: Bright screens can be harsh, especially in evening settings. Solution: System-aware and toggleable Dark Mode.

Implementation: Use CSS variables/custom properties to switch color themes.
UX: Sun/Moon toggle in the navbar.

6. Dietary Preferences filter
Problem: Finding recipes for specific needs (Vegan, GF, Keto) relies on generic search. Solution: Dedicated dietary preference filters.

Implementation: Parse recipe ingredients/tags to auto-categorize (or add explicit metadata).
UX: Multi-select toggle buttons on the Home page (e.g., "Show only Vegan").


## Phase 3: Social & Discovery
Features to help users find and share content.

7. "Surprise Me" Button
Problem: "What should I cook vs what can I cook?" Analysis paralysis. Solution: Random recipe generator.

Implementation: Simple client-side randomizer from the recipe array.
UX: Fun button in the hero section or navbar.

8. Native Sharing
Problem: Copying URLs is manual. Solution: Integration with Web Share API.

Implementation: Use navigator.share() on mobile devices to share directly to messages/social apps.
UX: Share icon that triggers native sheet on mobile, copies link to clipboard on desktop.

9. Print-Friendly View
Problem: Printing web pages often includes UI clutter (navbars, footers). Solution: optimized @media print CSS.

Implementation: Hide nav, footer, and buttons; format text for legibility on A4/Letter paper; include QR code link back to site.
Future Considerations
PWA (Progressive Web App): Allow "installing" the site to the home screen for offline access.
Nutrition Visualizer: Charts/graphs for macros instead of just text.