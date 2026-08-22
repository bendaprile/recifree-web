---
name: simplicity
description: The operational version of "Simplicity over Spaghetti Code". Bias toward deletion, count the layers a reader crosses, and subtract before you add. Apply when refactoring, reviewing your own diff, or tempted to add an abstraction, wrapper, or layer.
---

# Simplicity

AGENTS.md non-negotiable #2 says simplicity over spaghetti, do not over-architect, and review your own code before finishing. That is a value. This is the checklist.

Three moves, in order. Subtract first, then resist adding, then check what you left behind is readable.

## 1. Subtract before you add

Before you build on top of something, remove the dead weight underneath it.

- Delete unreachable branches, unused exports, and stubs nobody calls.
- Delete the validator that duplicates a check the caller already made.
- Delete commented-out code. Git has it.
- Collapse a config option that only ever takes one value.

Building on a simpler base is cheaper than building on a pile and cleaning up after. The addition usually gets smaller once the removal lands, and sometimes it disappears entirely.

If you cannot delete it in this change, say why in one line and move on. Do not build a compatibility layer around it.

## 2. Bias toward deletion

The smallest change that solves the problem wins.

- **Do not add a layer for one caller.** A wrapper with a single call site is indirection with no payoff. Inline it.
- **Do not thread a prop through three components to reach the fourth.** Either the state is context state or the component boundary is wrong. Pick one.
- **Do not add an abstraction for a second case that has not arrived.** Two similar things are not a pattern. Three might be.
- **Do not add a flag to preserve old behavior** unless a real user depends on it. Migrate the callers and delete the old path in the same change.
- **A diff that only deletes is a good diff.** It does not need to be balanced by an addition.

When you catch yourself writing "this will make it easier to..." about a future that has not happened, stop. That is the sentence that produces spaghetti.

## 3. Minimize reader load

The measure of readable code is how much a reader has to hold in their head to answer a question about it.

Count two things:

**Layers between question and answer.** Pick a real question. "Where does a saved recipe get written to Firestore?" Now count the hops from the button to the write. Every hop is a file the reader opens. Three is normal, six is a problem. Collapse the hops that add nothing: one-caller wrappers, pass-through functions that rename an argument, a service method that only forwards to another service method.

**Hidden state.** Count what the reader has to remember that is not on screen. A mutable variable set forty lines up. A context value written somewhere else in the tree. A `localStorage` key touched by two modules. Each one is something the reader carries. Shrink the scope of mutable things until the write and the read are visible together.

## Applying it here

- **Components.** If you copy-paste UI a second time, extract it into `src/components/`. If a component file passes roughly 200 lines, stop and look for the extraction. But do not extract a component that has one use and one caller.
- **Services.** `src/services/` files should each own one thing. If `recipeService.js` starts knowing about shopping lists, that logic belongs elsewhere.
- **Context.** Four providers wrap the tree. Adding a fifth is a real cost paid by every render and every reader. Prove local state cannot do the job first.
- **Tests.** Simplicity applies here too. A test that mocks four things to assert one is testing the mocks.

## Review pass before you finish

Reread your own diff and answer:

1. What did I add that I could delete instead?
2. Is there a wrapper here with one caller?
3. How many files does someone open to trace this change end to end?
4. Did I leave a compatibility path I should have migrated?

If the answer to any of those bothers you, fix it now. Nobody comes back for it later.
