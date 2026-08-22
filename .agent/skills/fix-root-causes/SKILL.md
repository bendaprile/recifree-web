---
name: fix-root-causes
description: Diagnosis loop for bugs and regressions. Reproduce first, trace each symptom to its cause, fix it there. Use when something is broken, throwing, failing, or slow, or when the user says "debug this" or "why is X happening".
---

# Fix root causes

Reproduce, trace to the cause, fix it there. Never guard the symptom.

The failure mode this exists to prevent: adding a null check that makes the crash stop while the bad value keeps flowing. The crash was the only thing telling you something upstream was wrong. Silence it and the bug moves somewhere quieter.

## Loop

1. **Reproduce it.** Before reading any code, make it happen on demand. A bug you cannot reproduce is a bug you cannot verify you fixed. Get the exact steps, the exact input, the exact route, and whether it needs a signed-in user.
2. **Get the real error.** The stack trace, the console output, the Firestore permission error, the network response. Not a paraphrase of what the user saw.
3. **State the gap.** One sentence: expected behavior, actual behavior. If you cannot write it, you do not understand the bug yet.
4. **Form one hypothesis.** Specific enough to be wrong. "The scaler rounds before converting units" is a hypothesis. "Something in the scaler" is not.
5. **Test it cheaply.** A log line, a breakpoint, a one-off script, a temporary assertion. Confirm or kill it before moving on. Do not test three hypotheses at once.
6. **Ask why again.** You found the line that throws. Why did it get that value? Keep asking until the answer is "because that is what the code is supposed to do" or "because this input was never valid." That is the root.
7. **Write the failing test.** A `.test.js` or `.test.jsx` that fails for the right reason, right now. Run it and watch it fail. A test that passes before your fix is testing the wrong thing.
8. **Fix at the root.** The smallest change that makes the cause impossible.
9. **Run the test, then the suite.** The new test passes, `npm run test` is green.
10. **Look for siblings.** The same cause usually produced other symptoms nobody reported. Grep for the pattern.

## Guards that hide bugs

Each of these is sometimes correct and usually a symptom patch. If you write one, say in the commit why the bad value is legitimately possible.

- A `?.` or `|| {}` added to stop a crash, with no explanation of why the value can be missing.
- A `try/catch` that swallows and logs.
- A `setTimeout` that makes a race go away.
- A default value that papers over a field the migration never wrote.
- Loosening a Firestore rule until the read succeeds.
- Changing a test's assertion to match the broken output.

## Recifree-specific first checks

Before you go deep, rule these out. They account for most of what looks mysterious here.

- **Is the emulator running, and seeded?** `npm run dev` starts both Vite and the emulators. A "missing data" bug is often an empty emulator. `npm run migrate:local` seeds it.
- **JSON or Firestore?** `recipeService.js` falls back between them. Confirm which path served the data before blaming either.
- **Signed in or out?** Four routes sit behind `ProtectedRoute`. Auth state changes async, so a bug that only appears on hard refresh is usually a component reading auth before it resolves.
- **Is it the service worker?** A PWA serving stale assets after a deploy looks like a code bug and is not. Check with the cache cleared.
- **Is it a Firestore rule?** Permission errors surface as failed reads with empty results, not as thrown exceptions in every path. Check the emulator log, not just the browser console.
- **Is the recipe JSON malformed?** A single bad file in `src/data/recipes/` can break a list render with an error pointing at the component.

## Reporting

Say what actually happened:

- The reproduction, in steps.
- The root cause, at a real `file:line`.
- Why the symptom appeared where it did, if that was not obvious.
- The failing-before test, named, with the failure it produced.
- The passing-after run.
- Any sibling instances you found, fixed or filed.
