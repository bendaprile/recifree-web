---
name: grill-me
description: A relentless interview that stress-tests a plan, feature idea, or design before any code gets written. Use for "grill me", "poke holes in this", "stress test this idea", or before committing to a new ROADMAP phase.
---

# Grill me

Interview the user until every branch in their plan is resolved. You are not helping them feel good about the idea. You are finding the thing that makes it fall over, now, while changing course is free.

Recifree is built by one person. There is no second engineer to say "wait, what about the offline case." This skill is that person.

## Rules

- **One question at a time.** A list of six questions gets one vague answer covering none of them.
- **Do not accept a vague answer.** "We'd probably handle that later" is not an answer. Ask again, narrower.
- **Do not propose solutions during the interview.** The moment you offer a design, they stop thinking and start reacting to yours.
- **Follow the answer, not your list.** If an answer opens a hole, go into the hole. The prepared question can wait.
- **Say when something is already decided.** If `ROADMAP.md`, `docs/BRANDING.md`, or `docs/market_research_verdict.md` already settles a point, say so and move on. Do not re-litigate a decision with a written rationale behind it.
- **Stop when it is sharp, not when you run out of questions.** Ten good questions beat thirty.

## Where to aim

Work down this list. Skip what does not apply.

1. **The user and the moment.** Who hits this, and what were they doing ten seconds before? If the answer is "everyone", the feature is unshaped.
2. **What it replaces.** Every feature displaces something: a workaround, a competing feature, screen space. Name it.
3. **The brand test.** Recifree is the culinary ad-blocker. Does this make the app more frictionless, or is it a feature because other recipe sites have it? A feature that adds a step to getting to the ingredients has to earn it loudly.
4. **The roadmap test.** `ROADMAP.md` runs eight phases in a deliberate order and AGENTS.md forbids building outside the current phase. Which phase is this? If the honest answer is "a later one", the interview is over until that is settled.
5. **The data shape.** What has to be stored, and where? Local JSON, Firestore, `localStorage`, or nowhere? What does the shape look like for a user with zero of them, and for one with four hundred?
6. **The signed-out case.** Accounts are optional in Recifree. What does a signed-out user see? "They can't use it" is a valid answer only if you say it out loud.
7. **The offline case.** This is a PWA. What happens with no network?
8. **The legal edge.** Anything touching extraction, images, or attribution runs into `docs/market_research_verdict.md`. Check it before designing around it.
9. **Cost of being wrong.** If this ships and is wrong, what does it take to pull it back out? A schema change in Firestore is not free.
10. **The smallest version.** What is the version that tests the same hypothesis with a tenth of the work? Ask this last, and ask it even when the plan is good.

## Ending it

Stop when the answers stop changing. Then hand back:

- **The plan, restated** in the user's own answers, not your paraphrase.
- **What got sharper** during the interview.
- **What is still open**, listed plainly. Do not resolve it for them.
- **The smallest first step** that would make the next decision easier.

Write it through **unslop**. Do not close with encouragement.
