# AGENTS.md

Welcome to the **Recifree** repository! This document provides an onboarding guide for AI coding agents to understand the specific architecture, goals, and coding conventions of this project.

## 🎯 Goal & Philosophy
**Recifree** is an open-source, clutter-free, and ad-free recipe platform focusing only on the ingredients and instructions. It is designed to be lightning-fast, mobile-first, and print-friendly without overcomplicated functionality.

## 🏗️ Architecture & Stack
- **Framework**: React 19 + Vite (Vanilla JS, no TypeScript)
- **Data Layer**: Firestore Database, accessed exclusively via `src/services/recipeService.js` (with a local emulator and JSON fallback).
- **Styling**: Vanilla CSS for flexibility and control.
- **Deployment**: Firebase Hosting (Static SPA) + Firebase Cloud Functions (Dynamic SEO Metadata Injection) configured via GitHub Actions.

## 📂 Repository Structure
```text
recifree/
├── .agent/              # Agent workflows & skills (harness-neutral)
│   ├── workflows/       # Procedures a human triggers
│   │   ├── recipe.md    # Workflow: adding new recipes
│   │   └── security.md  # Workflow: scheduled security audit agent
│   └── skills/          # Techniques an agent reaches for on its own
│       └── README.md    # Index of all skills and when to use them
├── .claude/             # Claude Code config: skill + command symlinks, git guardrail hooks
├── .github/             # GitHub configuration & workflows
├── docs/                # Planning and branding documentation
│   ├── BRANDING.md      # Brand identity & UI/UX philosophy
│   ├── SECURITY_REGISTRY.md # Living security vulnerability registry (machine-updated)
│   └── market_research_verdict.md # Market feasibility and legal strategy
├── functions/           # Cloud Functions (serverless logic & SEO generation)
├── public/              # Static assets and images
├── src/
│   ├── components/      # Reusable UI elements (has its own AGENTS.md)
│   ├── context/         # React Context providers (has its own AGENTS.md)
│   ├── data/            # Local Recipe DB as JSON (has its own AGENTS.md)
│   ├── pages/           # Page view components (has its own AGENTS.md)
│   ├── services/        # External services / DB logic (has its own AGENTS.md)
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

4. **Maintain Documentation Integrity**
   - Before completing any task that alters architecture, features, or deployment behavior, you **MUST** ensure the `README.md`, `ROADMAP.md`, and any relevant `AGENTS.md` files are fully updated to reflect those changes. Never leave the documentation in a stale state.
   - Follow the `technical-writing` and `unslop` skills when you write. Follow `writing-for-agents` when the file you are editing is read by an agent.

5. **Secret Management & Security**
   - **NEVER** hardcode secrets, API keys, or service account details in the source code.
   - **Frontend Config**: Use `.env` files and `import.meta.env` for Firebase/Vite configuration. Reference `.env.example` for the required keys.
   - **Backend Secrets**: For Cloud Functions or extraction logic, use **Firebase Secret Manager** (`firebase functions:secrets:set KEY=VALUE`).
   - **Local Scripts & GitHub Actions**: Scripts requiring elevated privileges (like migration scripts) look for keys in the `FIREBASE_SERVICE_ACCOUNT` environment variable first, and fall back to the `.secret/` directory (globally git-ignored) for local development.

6. **Image Provenance**
   - **NEVER** fetch, hotlink, download, or persist an image from a third-party recipe URL. This is the one legal constraint the whole architecture is built around.
   - A recipe image has exactly two legal sources: a photo uploaded by the user who is publishing the recipe, or the AI generator in `functions/imageGen/imagenService.js`.
   - `functions/extractRecipe.js` blanks any image URL not hosted on `firebasestorage.googleapis.com` before saving. Never remove or weaken that check.
   - If an extraction returns a source image and keeping it looks useful, stop and ask the user. Do not decide this one on your own.
   - Rationale and the DMCA obligations that attach to user uploads: `docs/market_research_verdict.md` §4.

## 🧰 Agent Skills
Recifree keeps a shared skill library at `.agent/skills/`. Each skill is a plain markdown file with no tool-specific syntax, so any agent can read it. Claude Code discovers them automatically through symlinks in `.claude/skills/`. Antigravity and any other agent should read them from `.agent/skills/` directly.

Workflows in `.agent/workflows/` are invoked rather than recognized, so they are exposed as Claude Code slash commands through symlinks in `.claude/commands/`. `.agent/workflows/recipe.md` is `/recipe`. Add a workflow to that menu with `ln -s ../../.agent/workflows/<name>.md .claude/commands/<name>.md`; edit the workflow itself in `.agent/workflows/` only.

Read `.agent/skills/README.md` for the full index. Reach for these without being asked:

| Skill | Use it when |
|---|---|
| `unslop` | Always. Any text you write, including chat replies and commit messages. |
| `technical-writing` | Writing or editing any `.md` file, a PR body, or a commit message. |
| `writing-for-agents` | Editing an `AGENTS.md`, a workflow, or a skill. |
| `simplicity` | Refactoring, reviewing your own diff, or about to add a layer. Operationalizes non-negotiable #2. |
| `codebase-design` | Designing a component or service interface, or deciding where a seam goes. |
| `blast-radius` | Before touching `firestore.rules`, `firebase.json`, `functions/`, or a shared context. |
| `fix-root-causes` | Something is broken, throwing, or slow. |
| `prove-it-works` | Before saying "done". Every time. Operationalizes non-negotiable #1. |
| `verify-in-app` | Before claiming a UI, routing, styling, or auth change works. |
| `grill-me` | Stress-testing a plan or a new roadmap phase before writing code. |
| `handoff` | Ending a session with the work unfinished. |

To invoke one explicitly, name it: "use the blast-radius skill on this diff."

Edit a skill in `.agent/skills/` only. The `.claude/skills/` entries are symlinks, not copies.

## 🛑 Destructive Git Commands
Claude Code sessions run a `PreToolUse` hook (`.claude/hooks/git-guardrails.py`, wired up in `.claude/settings.json`) that blocks force pushes, `reset --hard`, `clean -f`, bulk `checkout .`, `rebase`, history rewrites, and `--no-verify`. `git checkout -- <file>` stays allowed, because the security workflow depends on it as an escape hatch.

The hook is Claude Code specific. Other agents do not get this protection, so apply the same restraint by hand: never rewrite history, never discard uncommitted work, never bypass the Husky pre-commit gate.

## 🧑‍🍳 Adding a New Recipe
Follow `.agent/workflows/recipe.md` when a user asks you to add a recipe. Users may refer to it conversationally as `recipes.md`, or invoke it in Claude Code as `/recipe`. It is the only description of that process; `RECIPE_GENERATION.md` is a pointer to it and holds no instructions of its own.

Reach for it when extraction cannot: `extractRecipe` returns a 422 with `canRetryManually` for publishers that block server-side fetches.

## 🔐 Security Audit Agent
Recifree uses a scheduled security audit agent to continuously find and fix vulnerabilities.

- **Workflow**: `.agent/workflows/security.md` — the canonical instructions the security agent follows each run.
- **Registry**: `docs/SECURITY_REGISTRY.md` — the living vulnerability document. Updated by the agent each run; never manually edit vulnerability status unless dismissing a false positive.
- **Schedule**: Run using Antigravity's `/schedule` command. See the bottom of `security.md` for the recommended cron expressions.
- **PR Safety Rule**: The agent **never opens a PR unless `npm run test` passes.** Security fixes are always minimal and targeted.
- **Escalation**: Critical-severity vulnerabilities open a GitHub Issue immediately without waiting for the next fix cycle.

## 📚 Core Strategic Documentation
If you are asked to design a new UI element, plan a new architecture feature, or understand the overall goal of the platform, you **MUST** consult these files before executing:
1. **`ROADMAP.md`**: Contains the strict, logical 8-phase feature pipeline. The currently authorized phase is named in bold at the top of the file. Do not build a feature from any other phase without user permission.
2. **`docs/BRANDING.md`**: Contains the core persona, copywriting voice, and visual identity (Minimalist Editorial) guidelines.
3. **`docs/market_research_verdict.md`**: Contains the deep legal and commercial rationale behind the platform's architecture (e.g., why we use client-side extraction, why we avoid scraping images).
4. **`docs/SECURITY_REGISTRY.md`**: The current state of all known security vulnerabilities. Consult this before making any changes to `firestore.rules`, `firebase.json` headers, or npm dependencies to avoid reopening fixed issues.
