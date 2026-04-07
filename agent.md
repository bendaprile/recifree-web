# AGENTS.md

Welcome to the **Recifree** repository! This document provides an onboarding guide for AI coding agents to understand the specific architecture, goals, and conventions of this project.

## 🎯 Goal & Philosophy
**Recifree** is an open-source, clutter-free, and ad-free recipe platform. It cuts out the entire "life story" attached to recipes, focusing only on the ingredients and instructions. It is designed to be lightning-fast, mobile-first, and print-friendly.

## 🏗️ Architecture & Stack
- **Framework**: React 19 + Vite (Vanilla JS, no TypeScript)
- **Data Layer**: Static JSON. Recipes are stored locally in `src/data/recipes.json` or `src/data/recipes/[id].json`.
- **Deployment**: Firebase Hosting natively set up with GitHub Actions CI/CD (`.github/workflows/deploy.yml`).

### Directory Structure
```
recifree/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── data/            # Local Recipe DB as JSON files
│   └── styles/          # Global styles
├── public/              # Static assets and images
└── .github/workflows/   # CI/CD configuration
```

## 🧪 Testing Norms
- **Tools**: Vitest + React Testing Library.
- **Convention**: Keep tests alongside the components or utilities they verify. Run `test` or `test:watch` via package scripts.
- **Data Mocking**: If writing tests around recipes, use mock JSON schemas rather than directly importing production data heavily.
- **New Features**: Tests must be explicitly added and updated whenever new features or components are implemented.

## 🍽️ Adding a New Recipe
If asked to add a new recipe, you **MUST** follow these specific conventions:
1. Extract data using the prompt in [`RECIPE_GENERATION.md`](./RECIPE_GENERATION.md) for the exact schema required. 
2. Ensure you appropriately map the `stepIngredients` array using the 0-indexed flat index system so the UI "Ingredient Popup on Hover" feature works correctly.
3. Save the recipe data in the `src/data/recipes/` folder.
4. Every recipe must have a generated 4K image saved to `public/images/recipes/[id].jpg` (or `.png`), with the `image` field in the JSON pointing to it.

## 🗺️ Roadmap Reference
For feature planning, refer to [`ROADMAP.md`](./ROADMAP.md). Ensure new feature proposals fit the phased approach (e.g., adding personalized "Surprise Me" filters vs Core Cooking Utilities).
