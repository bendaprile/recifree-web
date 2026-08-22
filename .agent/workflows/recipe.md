---
description: Add a recipe by hand when a site blocks automated extraction. Use for "/recipe <url>", "add this recipe manually", or after /add returns "does not allow automated imports".
---

# Adding a recipe by hand

Use this when extraction cannot work. `extractRecipe` returns a 422 with `canRetryManually` because the publisher refuses server-side fetches. Cloudflare bot management on the Dotdash Meredith sites — eatingwell.com, allrecipes.com, seriouseats.com, simplyrecipes.com, foodandwine.com — is the common case, and it answers with a challenge page holding no recipe.

There are two ways in. Pick by who does the typing.

**The user types it.** `/add` → "Write Recipe Manually" saves to their shelf, and they publish it with their own photo. Nothing below applies, and this is the right answer whenever the user wants to add it themselves.

**You type it, below.** Writes a JSON file, upserts it into Firestore, and bypasses the publish gate. Admin-only. This is the path when the user asks *you* to add the recipe.

---

## 🔄 The Process

1.  **Get the recipe text.** The user pastes it, or you read the page with the browser tools — a real browser gets pages a server-side fetch cannot. Never take the page's photo; see step 5.
2.  **Write the JSON.** Follow the prompt and schema below. Save it to `src/data/recipes/[id].json`, where `[id]` is the kebab-case slug from the schema.
3.  **Load it into Firestore.** Run `npm run migrate -- --id=[id]`. The catalog reads Firestore; `src/data/recipes/` is only the offline fallback. Skip this and the recipe renders nowhere, which is the most common way this workflow silently does nothing. Note that it writes to **production**.
4.  **Confirm it has a deduplication key.** `npm run migrate` computes `sourceUrlHash` from the recipe's source URL, so this is usually already done. Run `npm run backfill:source-hash` to check; without a key, pasting the source URL later extracts a duplicate instead of routing to this recipe.
5.  **Add an image.** Two legal sources only, per `AGENTS.md` rule 6: a photo the user took, or an AI-generated one. Never the source site's photo, and never a hotlink.
    *   Prompt guidelines: "A delicious, high-quality food photography shot of [Recipe Title]. [Visual description of ingredients and colors]. Professional food styling, 4k resolution."
    *   Save to `public/images/recipes/[id].[ext]`, matching the generated file's real format (`.jpg` for JPEG/JFIF, `.png` for PNG).
    *   Point the JSON `image` field at `/images/recipes/[id].[ext]`.
6.  **Verify against the source.** Check every measurement, quantity, and metadata field against the original text. Confirm the instructions are reworded rather than copied — rule 2 of the spec below is a copyright requirement, not a style preference.
7.  **Check it renders.** Open `/recipe/[id]` and confirm the ingredients, the steps, and the hover mapping are right.

---

## 🤖 The Formatting Spec

The rules and schema the JSON has to satisfy. Follow them directly when you are the one writing the file. Everything below the line is also a self-contained prompt, so a human driving this by hand can paste it into a separate chat along with the recipe text.

***

You are a **Strict Data Formatter** for "Recifree", a clutter-free, open-source recipe website.
Your task is to extract recipe data from the text provided below and format it into a valid JSON object.

### 🔴 CRITICAL RULES
1.  **NO STORIES**: Ignore all blog post narrative, life stories, and filler text. Extract ONLY the recipe facts.
2.  **REWRITE INSTRUCTIONS**: Do **NOT** copy instructions word-for-word (to respect copyright). Rewrite them to be simple, direct, and imperative (e.g., "Chop the onions" instead of "Start by chopping the onions").
3.  **NO MARKDOWN**: Output **ONLY** the raw JSON. Do not wrap it in \`\`\`json blocks\`\`\` or add conversational text.
4.  **STANDARDIZE UNITS**: Use standard abbreviations ("tbsp", "tsp", "oz", "lb", "cup").
5.  **INFER MISSING DATA**: If specific metadata (like "difficulty" or "tags") is missing, make a reasonable guess based on the recipe complexity.
6.  **CARDS OVER NARRATIVE**: Prioritize the formal "Recipe Card" measurements over any amounts mentioned in the blog post body. Narrative text often mentions "what to buy" vs "what to use" (e.g., buying a 1lb sweet potato but only using 12oz).
7.  **QUANTITY VS CONTAINER**: Do not confuse can/container sizes with ingredient amounts. If a recipe says "1/2 cup chicken broth (from a 15oz can)", the ingredient amount is "1/2 cup".

### 📄 JSON SCHEMA
Follow this structure EXACTLY.

```json
{
  "id": "kebab-case-slug-of-recipe-title",
  "title": "Recipe Title",
  "description": "A short, 1-2 sentence description of the dish. Make it appetizing but factual.",
  "image": "/images/recipes/[id].jpg",
  "prepTime": "X mins",
  "cookTime": "X mins",
  "totalTime": "X mins",
  "servings": Number (integer),
  "difficulty": "Easy" | "Medium" | "Hard",
  "tags": [
    "Cuisine (e.g. Italian)",
    "Meal Type (e.g. Dinner)",
    "Dietary (e.g. Vegetarian)",
    "Main Ingredient"
  ],
  "ingredients": [
    // Option 1: Simple List
    {
      "amount": "String",
      "unit": "String",
      "item": "String"
    }
    // Option 2: Sections (use this if the recipe has distinct components like 'Sauce', 'Dressing', etc.)
    /*
    {
      "title": "Section Name (e.g. 'Sauce')",
      "items": [
        { "amount": "String", "unit": "String", "item": "String" }
      ]
    }
    */
  ],
  "instructions": [
    "Step 1...",
    "Step 2...",
    "Step 3..."
  ],
  "stepIngredients": [
    [0, 1, 2],    // Ingredient indices for Step 1
    [3, 4],       // Ingredient indices for Step 2
    [5, 6, 7, 8]  // Ingredient indices for Step 3
  ],
  "source": {
    "name": "Name of Original Website/Author",
    "url": "URL to the original recipe"
  },
  "nutrition": {
    "calories": Number (integer),
    "protein": "String (e.g. '20g')",
    "carbs": "String (e.g. '45g')",
    "fat": "String (e.g. '12g')"
  }
}
```

---

## 🔗 Step Ingredients Mapping

The `stepIngredients` array enables the "Ingredient Popup on Hover" feature, showing relevant ingredients when hovering over each instruction step.

### How It Works

1.  **Flat Index System**: Ingredients are indexed starting from 0. For sectioned recipes, count ingredients sequentially across all sections.
    *   Example: If Section A has 5 items (indices 0-4) and Section B has 3 items (indices 5-7), the 1st item in Section B is index 5.

2.  **Mapping Structure**: Each entry in `stepIngredients` corresponds to an instruction step (0-indexed array).
    *   `stepIngredients[0]` → ingredients for instruction step 1
    *   `stepIngredients[1]` → ingredients for instruction step 2
    *   And so on...

3.  **Empty Arrays**: If a step doesn't use specific ingredients (e.g., "Let rest for 5 minutes"), use an empty array `[]`.

### Example

For a recipe with these ingredients:
```
0: olive oil
1: onion
2: garlic
3: chicken broth
4: pasta
5: parmesan
```

And these instructions:
```
Step 1: Heat olive oil in a pan. Add onion and garlic, sauté until soft.
Step 2: Pour in chicken broth and bring to a boil.
Step 3: Add pasta and cook until al dente.
Step 4: Serve topped with parmesan.
```

The `stepIngredients` would be:
```json
"stepIngredients": [
  [0, 1, 2],  // Step 1: oil, onion, garlic
  [3],        // Step 2: broth
  [4],        // Step 3: pasta
  [5]         // Step 4: parmesan
]
```

### Advanced: Partial Amounts & Overrides

Sometimes a step uses only part of an ingredient (e.g., "Add half the cheese"). Use an object instead of a number:

```json
{
  "id": 6,          // The ingredient index
  "amount": "1/2",  // Override amount
  "unit": "cup"     // Override unit (optional)
}
```

Example usage in `stepIngredients`:
```json
"stepIngredients": [
  [0, 1],
  [2, { "id": 6, "amount": "1/2", "unit": "cup" }], // Step uses rice (2) and half the cheese (6)
  [{ "id": 6, "amount": "1/2", "unit": "cup" }]     // Later step uses remaining cheese
]
```

### 📝 INPUT DATA
(The recipe URL, title, and full text go here.)