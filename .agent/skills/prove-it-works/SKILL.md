---
name: prove-it-works
description: Verify against the real artifact before declaring a task done. Apply after completing any task, and before saying "done", "fixed", "passing", or "should work".
---

# Prove it works

Apply after completing a task, before declaring it done.

Verify against the real artifact. Not a proxy, not a self-report, not "it compiles."

AGENTS.md non-negotiable #1 requires running `npm run test` after changes. This is the rest of that rule: what counts as evidence, and what you are allowed to say.

## The rule

**You may not report an outcome you did not observe.**

If you did not run it, you do not know. If the test suite ran but did not exercise the code you changed, you still do not know. If the build succeeded, you know the build succeeded and nothing else.

## Proxies that do not count

- "It compiles" / "the build passed". Proves syntax, nothing about behavior.
- "The tests pass" when no test touches the changed path. Name the test that covers it, or admit there is none.
- "This should work" / "this will now correctly...". Future tense is a confession that you did not check.
- Reading the code you just wrote and agreeing with it.
- A green suite you did not actually run in this session.

## What counts, by change type

| You changed | Prove it by |
|---|---|
| A component or hook | A `.test.jsx` that renders it and asserts the new behavior. Run it. Paste the result. |
| A service in `src/services/` | A `.test.js` against the real function. Mock Firestore, not the function under test. |
| `firestore.rules` | Run the emulator and attempt the read and the write, both the allowed and the denied case. Rules never fail at build time. |
| `firebase.json` headers or rewrites | Start the emulator, request the route, read the actual response headers. |
| A Cloud Function or SEO injection | Run `npm run build`, then invoke the function against the built `functions/index.html` and read the output HTML. |
| Recipe JSON in `src/data/recipes/` | Load the app and open the recipe page. Check ingredients, steps, scaling, and the image path resolve. |
| CSS or layout | Open the app. Check the change at mobile width and in print preview, and in both themes. |
| A dependency bump | `npm run test` plus the one feature that dependency actually powers. |

## Before you say done

State three things:

1. **What you ran.** The exact command.
2. **What you saw.** The actual output, not a summary of it. Counts, not vibes.
3. **What you did not cover.** Say it plainly. "No test covers the print layout; I checked it by hand in the browser" is a complete and honest answer. "Done" is not.

If a check was impractical, say why and name the closest thing you did instead. Skipping verification silently is the failure. Skipping it out loud is a decision the human can overrule.
