---
name: blast-radius
description: Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it is safe because of by running real code. Use for "blast radius of X", "what could this break", or before touching firestore.rules, firebase.json, the Cloud Functions, or recipeService.
---

# Blast radius

Find what a change breaks somewhere else, before it ships.

Listing the callers is not the job. Anyone can grep those in a second. The job is the breakage grep will not show you.

## Don't trust your own writeup

A blast-radius writeup that sounds right is worthless. It reads as convincing whether or not it is true, and that is the trap. So don't hand back the writeup. Find the one or two facts the whole thing depends on, and prove them by running code. Words are where you start, not what you ship.

### How sure are you

For each fact the change's safety depends on, get it as far down this list as is cheap, and say where it stopped.

1. You said so. Worthless on its own.
2. You pointed at the line. A real `file:line`, or the library's own source.
3. You showed the bad case can't happen. You walked the failure step by step and it does not reach.
4. You ran it. A test or script that calls the real code and fails loud if you are wrong.
5. You reproduced it in the running app, against the emulator.

Any safety fact you cannot get to step 4, say so out loud. Do not write it up as settled. Step 4 here is usually one `.test.js` file or one `node scripts/...` run.

## Steps

1. **Read the change.** The diff, the symbols it adds, changes, and deletes, and what it now does differently, including the part the diff does not spell out.
2. **Find the one fact it is safe because of.** Most changes that look scary are safe because of a single fact. Find that fact. If it holds, most of the scary cases die at once. Spend your time here, not on a long list of maybes.
3. **Look where grep stops.** See the map below.
4. **Be honest about each risk.** Give it a real chance of happening and a real cost if it does. Keep the risks you confirmed. List what you checked and cleared separately. Cite a real `file:line`. A search that finds nothing is still an answer. Never invent a caller or an API.
5. **Prove the one fact.** Write the test or script, run it, paste what happened. If you cannot prove it cheaply, mark it unproven. Do not round up.
6. **Run the suite.** `npm run test` is the floor, not the proof. A green suite that never exercised the changed path proves nothing, so say which tests actually touched it.

## Where grep stops in this repo

These are the seams where a symbol search will tell you everything is fine and be wrong.

- **`src/data/recipes/*.json` and Firestore.** The same recipe shape lives in local JSON and in Firestore. `scripts/migrate-to-firestore.js` copies between them, and `recipeService.js` falls back from one to the other. A field renamed in one place is silently absent in the other. Check both readers.
- **`firestore.rules`.** Rules are not JavaScript and nothing imports them. A rule change breaks reads at runtime with a permission error, not at build time. Prove it against the emulator, not by reading the rule.
- **`firebase.json`.** Hosting rewrites, headers, and the function routing all live here. A rewrite change can send every route to the SEO function or to the SPA shell. Nothing in `src/` references this file.
- **`functions/` and SEO injection.** `npm run build` copies `dist/index.html` into `functions/`. The function then rewrites tags in that HTML by string matching. A change to `index.html` structure, or to the build output, breaks injection with no test failure. The build and the function are coupled through a file, not an import.
- **The service worker.** `vite-plugin-pwa` generates a precache manifest at build time. Renaming or moving an asset under `public/` can leave a stale entry cached for existing users. Nothing in the diff will show this.
- **React context providers.** `AuthContext`, `SavedRecipesContext`, `ShoppingListContext`, and `ThemeContext` wrap the whole tree in `src/App.jsx`. Changing a provider's value shape breaks consumers that never import the provider file, only the hook.
- **`ProtectedRoute`.** Four routes depend on it (`/saved`, `/shopping-list`, `/settings`, `/add`). A change to its redirect behavior changes all four.
- **`localStorage` keys.** Theme, onboarding state, and shopping list persistence read keys written by earlier versions. Renaming a key resets state for every existing user and no test will notice.
- **Print styles.** Print-friendliness is a product promise. A CSS change that looks fine on screen can break the print layout, and nothing in `vitest` covers `@media print`.

## What to hand back

- **What it does.** What changed, including the part that is not obvious from the diff.
- **The one fact it is safe because of.** State it, say which step you got it to, show the proof. If you could not prove it, write "unproven".
- **Risks.** Only the real ones. Each names how it breaks, the `file:line`, how likely, how bad, and how to check.
- **Cleared.** What you checked and why it is fine.
- **Before you merge.** The cheapest test or repro that catches the real bug, including the script you wrote.

Write it through **unslop**. Cite real code.
