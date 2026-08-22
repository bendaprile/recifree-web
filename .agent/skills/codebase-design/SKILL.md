---
name: codebase-design
description: Vocabulary and method for designing deep modules with narrow interfaces. Use when designing or improving a component or service interface, deciding where a seam goes, or making code more testable.
---

# Codebase design

One idea: **a good module hides more than it exposes.**

Depth is the ratio of what a module does to what a caller has to know to use it. A deep module has a small interface over real behavior. A shallow module has an interface almost as complicated as its implementation, so it costs the reader nearly as much as inlining the code would.

AGENTS.md non-negotiable #3 says to extract repeatable UI into `src/components/`. This skill is about whether the extraction actually helped.

## Vocabulary

- **Deep module.** Small interface, substantial behavior underneath. `ingredientConsolidator.js` taking a list of ingredients and returning a merged list is deep: one function, real logic hidden.
- **Shallow module.** The interface costs about as much as the implementation. A component taking twelve props and passing eleven straight through is shallow.
- **Seam.** The line where one module stops knowing about another. A good seam is where the vocabulary changes: above it you talk about recipes, below it you talk about Firestore documents.
- **Information leakage.** Two modules that both have to know the same fact. Change one, you must change the other, and nothing tells you. The recipe JSON shape leaking from `src/data/` into three components is leakage.
- **Pass-through.** A function or component whose whole job is forwarding to another. Almost always worth removing.
- **Temporal decomposition.** Splitting modules by the order things happen rather than by what they know. It looks organized and leaks badly, because every step ends up knowing the shape the previous step produced.

## How to find a deepening opportunity

Ask what a caller has to know.

If using a module requires knowing the order to call things in, which fields to set first, what to clean up afterward, or what a returned shape means, that knowledge belongs inside the module. Pull it in and the interface shrinks.

Concretely, look for:

- A component whose props are mostly other components' internals.
- Two call sites doing the same three-step dance before calling one function. Make it one call.
- A service returning a raw Firestore shape that every caller then reshapes the same way. Reshape it once, inside.
- Error handling repeated at every call site. Handle it at the seam, or return something the caller can act on without a `try` block.
- A hook that must be used with a specific `useEffect` next to it. The effect belongs in the hook.

## Where the seams are in this repo

The vocabulary changes at these lines, and they are the seams worth defending.

- **`src/services/` is the only place that knows Firestore exists.** Above it: recipes, saved recipes, shopping lists, users. Below it: documents, collections, and the emulator-or-JSON fallback. A component importing anything from `firebase/firestore` has crossed a seam that should have held.
- **`src/context/` is the only place that knows about cross-page shared state.** A page reading `localStorage` directly has bypassed it.
- **`src/components/` knows about presentation and nothing about persistence.** A component that calls a service directly is doing two jobs. Push the call up to the page or into a context.
- **`src/utils/` is pure.** `recipeScaler.js` takes data and returns data. No network, no storage, no React. Keep it that way, because that is what makes it trivially testable.

## Testability is the signal

If a module is hard to test, the interface is usually wrong, not the test.

A test needing four mocks says the module knows about four things. A test that has to set up a full provider tree to check one calculation says the calculation should be a pure function in `src/utils/`. Before writing an elaborate mock, ask whether the seam is in the wrong place.

## Before you commit an interface

1. What does a caller have to know that it should not?
2. Could this interface stay the same if the implementation changed completely? If not, it is leaking.
3. Is any parameter here only passed through?
4. How many files does the same fact appear in?
