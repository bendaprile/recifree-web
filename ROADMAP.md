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

3. Recipe Health Score
Problem: Users would like to know how healthy a recipe is at a glance before making.

Implementation: Calculate health score based on ingredients and nutrition information during recipe generation.
UX: Display health score on recipe cards and detail pages.

## Phase 2: Personalization (No Login Required)
Features that make the site feel personal without compromising privacy.

4. Local Favorites
Problem: Users lose track of recipes they liked. Solution: "Heart" recipes to save them.

Implementation: Persist recipe IDs in localStorage.
UX: Heart icon on recipe cards and detail pages; a new "My Favorites" filter or page.


## Phase 3: Social & Discovery
Features to help users find and share content.

5. "Surprise Me" Button
Problem: "What should I cook vs what can I cook?" Analysis paralysis. Solution: Random recipe generator.

Implementation: Simple client-side randomizer from the recipe array.
UX: Fun button in the hero section or navbar.

6. Fun Recipe Wording
There is a setting that allows users to change the level of vulgarity and humor in the recipe wording. There are 3 levels: 0 (no vulgarity or humor), 1 (some vulgarity or humor), and 2 (lots of vulgarity and humor). When the recipe is generated, these three levels will be generated and add some humor to the recipe.