---
name: verify-in-app
description: Drive the running Recifree app the way a user does, to prove a change works where Vitest cannot reach: layout, print styles, themes, auth flow, offline, and the SEO function. Use before claiming a UI, styling, routing, or auth change works.
---

# Verify in app

Vitest covers logic. It does not cover whether the page looks right, prints right, or survives a refresh. This skill covers the rest, by driving the real app.

Use it with **prove-it-works**: that skill says you must observe the outcome, this one says how to observe it here.

## Start it

```bash
npm run dev
```

That runs Vite on port 5173 and the Firebase emulators together. If the emulator has no data:

```bash
npm run migrate:local
```

If a port is stuck, `predev` already runs `scripts/cleanup-ports.js`. If it still fails, that is the first thing to check.

## Feature map

Each row is a surface a change can break. Check the rows your change touches, and the row below it if you are not sure.

| Surface | Route | Prove it by |
|---|---|---|
| Recipe browsing | `/` | Cards render, images resolve, click through to a recipe. |
| Recipe page | `/recipe/:id` | Ingredients, instructions, and step-to-ingredient mapping all render. Scale the recipe up and down and check the quantities. |
| Print | `/recipe/:id` | Open print preview. Ingredients and steps present, navigation and buttons gone, no clipped text. This is a product promise, so check it on any CSS change. |
| Extraction | `/add` | Paste a recipe URL. The loader appears, extraction completes, the parsed result is editable. |
| Saved recipes | `/saved` | Save from a recipe page, confirm it appears here, unsave it, refresh, confirm it stuck. |
| Shopping list | `/shopping-list` | Add ingredients from two recipes and confirm duplicates consolidate rather than repeat. |
| Settings | `/settings` | Changes persist across a hard refresh. |
| Auth | any protected route | Signed out, `/saved` `/shopping-list` `/settings` `/add` redirect. Sign in, they load. Hard-refresh while signed in and confirm no flash of the redirect. |
| Theme | anywhere | Toggle light and dark. Check the surface you changed in both. Reload and confirm the choice persisted. |
| Mobile | anywhere | Resize to 375px wide. Recifree is mobile-first, so this is the primary case, not an afterthought. |
| Static pages | `/about` `/privacy` `/dmca` | These are defined inline in `src/App.jsx`, not under `src/pages/`. A change to that file can break them without touching a page directory. |
| Not found | any bad URL | The `*` route renders, and the shell (navbar, footer) still renders around it. |
| Offline | anywhere | Load a page, go offline, reload. The shell should still come up. |
| SEO injection | n/a | `npm run build`, then invoke the function against `functions/index.html` and read the output tags. This never runs in dev. |

## What to check on any visual change

1. Mobile width first, desktop second.
2. Both themes.
3. Print preview if the change touched a recipe page.
4. The browser console. A change that works but logs a React warning is not done.
5. The network tab if the change touched a service. Confirm the request went where you think.

## Reporting

Name the route, the action you took, and what you saw. A screenshot is good evidence. "Looks fine" is not evidence.

State what you did not check. If you changed a shared component and only verified it on one page, say which page.

## Keeping this honest

When a route, page, or major component is added or removed, update the feature map in the same change. A verification skill that describes an app that no longer exists is worse than none, because it produces confident checks of nothing.
