# AGENTS.md

## Data & Recipe Service Layer

### Architecture Overview
Recifree uses a **Firestore-first data strategy** with a static JSON fallback.

- **Production**: Recipes are stored in Firestore (collection: `recipes`). Each document has an auto-generated Firestore ID. The human-readable slug lives in the `slug` field and is what appears in URLs.
- **Local Dev**: When running `npm run dev`, the **Firestore and Auth emulators** run concurrently. 
  - Emulators start empty. To populate local Firestore with existing static JSONs to test the UI, run `npm run migrate:local` in a separate terminal.
- **Tests / Fallback**: If Firestore is unavailable, `recipeService.js` falls back to the local static JSON files in `src/data/recipes/`.

### ⚠️ Never import recipe data directly

All pages and components **must** use `src/services/recipeService.js` for data access — never import from `src/data/recipes` or `src/data/recipes/*.json` directly:

```js
// ✅ Correct
import { getAllRecipes, getRecipeBySlug } from '../../services/recipeService';

// ❌ Incorrect - bypasses Firestore
import recipes from '../../data/recipes';
```

### Adding a New Recipe
When a new recipe JSON is added to `src/data/recipes/`, it must also be pushed to the Firestore database:

```bash
# Push a single new recipe to Production Firestore
npm run migrate -- --id=<recipe-slug>

# Push a single new recipe to Local Emulator (for testing UI before prod)
npm run migrate:local -- --id=<recipe-slug>

# Re-sync all recipes to Production (idempotent, safe to run any time)
npm run migrate
```

The migration script is an upsert — it will update existing docs without creating duplicates. Wait until the Dev Server is fully running before executing `migrate:local`.

### Schema Rules
- All recipe JSON must match the schema in `RECIPE_GENERATION.md`
- The `id` field in JSON **must equal** the filename slug (e.g., `hot-honey-feta-chicken.json` → `"id": "hot-honey-feta-chicken"`)
- Firestore adds a `slug` field (copy of `id`) and `createdAt`/`updatedAt` timestamps automatically during migration
- **Never** use the Firestore document ID in app code — always reference by `slug`

### Testing Constraints
- Tests must mock `../../services/recipeService` (not `../../data/recipes`) to isolate from Firestore
- Use small inline mock objects in tests; never rely on production JSON shape

