---
name: handoff
description: Compact the current session into a handoff document another agent or a future session can pick up cold. Use for "handoff", "write this up before we lose context", "I'm stopping here", or when a session is getting long and the work is not finished.
---

# Handoff

Write a document that lets a cold agent resume this work without reading the conversation.

The test: someone opens the file tomorrow, having seen none of this, and knows what to do next without asking a question.

## Where it goes

`docs/handoffs/YYYY-MM-DD-short-slug.md`. Create the directory if it does not exist. These are working notes, not documentation, so do not link them from `README.md`. Delete a handoff once the work lands.

## What goes in

Write it in this order. Lead with state, not narrative.

```markdown
# <what this work is>

**Branch:** <branch> · **Status:** <in flight | blocked | ready to test>
**Last verified:** <command you ran and what it said>

## Goal
One paragraph. What we are trying to make true, and why. Not a summary of what was done.

## State
What is actually on disk right now. Files changed, what each change does.
Include uncommitted work, and say it is uncommitted.

## Decisions made
Each with its reason. These are the ones that would get re-litigated otherwise.

## Dead ends
What was tried and did not work, and why. This is the highest-value section.
Without it the next session repeats the same failure.

## Open questions
Things a human has to answer. Do not resolve them here.

## Next step
One concrete action. A file to open, a command to run, a decision to make.
```

## Rules

- **Facts over narrative.** Nobody needs the story of how you got here. They need where "here" is.
- **Verify before you write state.** Run `git status` and `git diff --stat`. Do not write from memory what you think you changed.
- **The dead ends section is not optional.** The most expensive thing a cold session does is rediscover a failure you already found. Write down what did not work even when it feels like admitting waste.
- **Name real paths and commands.** "The service needs updating" is useless. "`src/services/recipeService.js:88` still returns the raw Firestore doc; callers reshape it" is a handoff.
- **Say what is unverified.** If you did not run `npm run test` since the last edit, say so in the status line.
- **One page.** If it runs longer, the work should have been split.

Write it through **unslop** and **technical-writing** in reference mode. No hedging, no encouragement, no summary of the summary.
