# AGENTS.md

Welcome to the **Recifree** repository! This document provides an onboarding guide for AI coding agents to understand the specific architecture, goals, and coding conventions of this project.

## 🎯 Goal & Philosophy
**Recifree** is an open-source, clutter-free, and ad-free recipe platform focusing only on the ingredients and instructions. It is designed to be lightning-fast, mobile-first, and print-friendly without overcomplicated functionality.

## 🏗️ Architecture & Stack
- **Framework**: React 19 + Vite (Vanilla JS, no TypeScript)
- **Data Layer**: Static JSON (`src/data/recipes.json` or `src/data/recipes/[id].json`).
- **Styling**: Vanilla CSS for flexibility and control.
- **Deployment**: Firebase Hosting configured via GitHub Actions.

## 📂 Repository Structure
```text
recifree/
├── .agent/              # Agent workflows (such as new recipes)
├── .github/             # GitHub configuration & workflows
├── docs/                # Planning and branding documentation
│   ├── BRANDING.md      # Brand identity & UI/UX philosophy
│   └── market_research_verdict.md # Market feasibility and legal strategy
├── public/              # Static assets and images
├── src/
│   ├── components/      # Reusable UI elements (has its own AGENTS.md)
│   ├── context/         # React Context providers (has its own AGENTS.md)
│   ├── data/            # Local Recipe DB as JSON (has its own AGENTS.md)
│   ├── pages/           # Page view components (has its own AGENTS.md)
│   ├── styles/          # Global styles
│   └── App.jsx          # Main application component
├── AGENTS.md            # This file
├── RECIPE_GENERATION.md # Fallback instructions for manual recipe extraction
├── ROADMAP.md           # Future feature tracking
└── package.json         # Dependencies & scripts
```

## 📜 Core Non-Negotiables for Coding in Recifree
When editing code in this repository, you **MUST** follow these rules:

1. **Test-Driven Development is Mandatory**
   - **ALWAYS** add comprehensive tests (`.test.jsx`) for any new feature or component you create.
   - **ALWAYS** run tests after you make changes using `npm run test` (which triggers Vitest) to verify that everything still passes and you haven't caused regressions.

2. **Simplicity over Spaghetti Code**
   - Do NOT over-architect solutions. If a file is getting big, stop and think.
   - Constantly look for ways to refactor, componentize, and simplify overblown spaghetti-type code.
   - **Review Before Finishing**: Look at your own code after implementation for open opportunities for refactoring. If it can be cleaner, make it cleaner.

3. **Shared Component Frontend Architecture**
   - Use our shared component frontend architecture. If you notice repeatable UI elements being copy-pasted, refactor them into a reusable element inside `src/components/`.

## 🧑‍🍳 Adding a New Recipe
If a user asks you to add a new recipe, you should utilize the recipe generation workflow located at `.agent/workflows/recipe.md` (which users may refer to conversationally as `recipes.md`). Also reference `RECIPE_GENERATION.md` for specific formatting instructions and expectations.

## 📚 Core Strategic Documentation
If you are asked to design a new UI element, plan a new architecture feature, or understand the overall goal of the platform, you **MUST** consult these files before executing:
1. **`ROADMAP.md`**: Contains the strict, logical 8-phase feature pipeline. Do not build features outside of the current authorized phase without user permission.
2. **`docs/BRANDING.md`**: Contains the core persona, copywriting voice, and visual identity (Minimalist Editorial) guidelines.
3. **`docs/market_research_verdict.md`**: Contains the deep legal and commercial rationale behind the platform's architecture (e.g., why we use client-side extraction, why we avoid scraping images).
