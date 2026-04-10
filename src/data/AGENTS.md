# AGENTS.md

## Local Recipe Data Guidelines

The `src/data/` directory acts as our static database for Recifree. 

### 1. Recipe Schema Validation
- All updates to recipe JSON files must perfectly match our prescribed data schema. 
- Be incredibly careful updating keys or removing fields.
- Always use the standard 0-indexed flat index system for items like `stepIngredients` mappings. (Refer to `RECIPE_GENERATION.md` for generation details).

### 2. Testing Constraints
When working with features that touch UI processing, do not write tests that rely strictly on our production JSON outputs. Use smaller mock JSON datasets in tests, and leave `src/data/` dedicated strictly to clean application payload data.
