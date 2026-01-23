# Recipe Generation Process & Prompt

This document outlines the workflow for adding new recipes to Recifree using an LLM, along with the strict prompt to ensure consistent data formatting.

---

## 🔄 The Process

1.  **Select a Source**: Find a high-quality recipe from a blog or website.
2.  **Copy Content**: Copy the entire text of the recipe (ingredients, instructions, headnotes, metadata).
3.  **Feed the LLM**: Paste the "Recipe Generation Prompt" (below) followed by the copied recipe text into an LLM (ChatGPT, Claude, Gemini, etc.).
4.  **Review Output**: The LLM will generate a JSON block. Review it briefly for accuracy.
5.  **Create File**:
    *   Create a new file in `src/data/recipes/` named `[id].json` (the LLM will generate the ID).
    *   Paste the JSON content.
6.  **Generate Image**:
    *   Use the `generate_image` tool to create a high-quality, 4k food photography shot of the dish.
    *   Prompt Guidelines: "A delicious, high-quality food photography shot of [Recipe Title]. [Visual Description of Ingredients/Colors]. Professional food styling, 4k resolution."
    *   Save the image to `public/images/recipes/` ensuring the filename matches the JSON ID (e.g. `[id].png`).
    *   Update the `image` field in the JSON to point to `/images/recipes/[id].png`.

---

## 🤖 Recipe Generation Prompt

**Copy everything below this line and paste it into the LLM:**

***

You are a **Strict Data Formatter** for "Recifree", a clutter-free, open-source recipe website.
Your task is to extract recipe data from the text provided below and format it into a valid JSON object.

### 🔴 CRITICAL RULES
1.  **NO STORIES**: Ignore all blog post narrative, life stories, and filler text. Extract ONLY the recipe facts.
2.  **REWRITE INSTRUCTIONS**: Do **NOT** copy instructions word-for-word (to respect copyright). Rewrite them to be simple, direct, and imperative (e.g., "Chop the onions" instead of "Start by chopping the onions").
3.  **NO MARKDOWN**: Output **ONLY** the raw JSON. Do not wrap it in \`\`\`json blocks\`\`\` or add conversational text.
4.  **STANDARDIZE UNITS**: Use standard abbreviations ("tbsp", "tsp", "oz", "lb", "cup").
5.  **INFER MISSING DATA**: If specific metadata (like "difficulty" or "tags") is missing, make a reasonable guess based on the recipe complexity.

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

### 📝 INPUT DATA
(Paste the recipe URL, title, and full text here)
