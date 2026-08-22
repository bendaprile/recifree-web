---
name: technical-writing
description: Standard for writing or reviewing docs, READMEs, ROADMAP entries, RFCs, PR descriptions, and commit messages in this repo. Picks a Diataxis mode, then enforces sentence-level clarity. Use whenever you touch a .md file.
---

# Technical writing

The goal is writing a tired engineer understands on the first read. AGENTS.md non-negotiable #4 says documentation must never go stale. This skill says what "not stale" looks like.

Three rules sit above everything else:

- **Cut every word that does no work.** If the sentence survives without a word, the word goes. "In order to" is "to". "It is important to note that" is nothing.
- **Use the short, everyday word.** "Use", not "utilize". "Help", not "facilitate". A long word has to buy its length with precision.
- **When a rule makes a sentence worse, fix the sentence another way or leave it alone.** A sentence that follows every rule and sounds machine-written has failed.

The codebase is the word list. Write the real symbol, file, script, or path: `recipeService.js`, `npm run test`, `firestore.rules`, `src/data/recipes/`. Not a synonym, not a description of it.

## Pick the mode first

One document, one mode. Two questions pick it: does the content inform action (doing) or understanding (thinking), and does it serve learning or work?

- Action + learning: **tutorial**
- Action + work: **how-to**
- Understanding + work: **reference**
- Understanding + learning: **explanation**

**Tutorial: learning by doing.** You are the teacher; the learner's success is your job. Open with what they will build. Every step produces a visible result, and you tell them what they should see. Cut explanation to one clause and a link. Write as "we", in commands.

**How-to: steps to a goal.** Solve a problem a person has. Assume competence, skip teaching, action only. Allow forks: "If you want x, do y." Name the guide by the task.

**Reference: facts for lookup.** Describe, only describe. No instruction, no persuasion, no opinion. Dry, complete, sure. Mirror the structure of the thing described. Generate from code where possible so it stays true.

**Explanation: understanding and why.** One bounded topic, readable away from the product. Anchor on a real why question. Context, design decisions, constraints, alternatives. Opinion is allowed here and nowhere else.

Don't mix modes. No reference tables inside a tutorial, no hand-holding inside reference, no arguing inside a how-to. Split and link instead.

### Where the Recifree docs land

| File | Mode | What that means |
|---|---|---|
| `README.md` | how-to, with a short explanation opener | Get it running. No philosophy past the first paragraph. |
| `AGENTS.md` (all of them) | reference | Rules and structure. Dry and complete. No persuasion. |
| `ROADMAP.md` | explanation | Why the phases are ordered this way, not just what they are. |
| `RECIPE_GENERATION.md` | how-to | Steps to add a recipe. Nothing else. |
| `docs/SECURITY_REGISTRY.md` | reference | Machine-updated facts. Never editorialize a severity. |
| `docs/BRANDING.md` | explanation | The why behind the persona and the visual system. |
| `docs/market_research_verdict.md` | explanation | Legal and commercial rationale. |
| `.agent/workflows/*.md` | how-to | Steps an agent runs. Imperative, ordered, no background. |

If you are about to add a "why we did it this way" paragraph to a reference doc, that paragraph belongs in `ROADMAP.md` or `docs/`. Link to it.

## Write sentences to the reader

- Talk to the reader as "you", in the present tense. "Will" only for things that genuinely happen later.
- Say who does what. "The extraction service parses the page", not "the page is parsed". Passive is fine only when the actor is unknown or beside the point.
- Write instructions as commands. "Run `npm run test`." Never "the tests should be run".
- Put the condition before the instruction. "To seed the emulator, run `npm run migrate:local`." The reader skips what does not apply.
- Put the common case first, exceptions after.
- No "simply", "easy", "just", or "quickly" in a procedure. If it were simple the reader would not be here.

## Keep sentences carrying one thing

- One thought per sentence. Split the sentence carrying two.
- One instruction per numbered step. If a step has an "and" in it, it is two steps.
- Same word for the same thing every time. "Recipe" is always "recipe", never "dish" or "entry".
- Say the condition before the action, and say what happens if it fails.
- Spell out what a pronoun refers to when two nouns could claim it.

## Vary the rhythm

A doc can obey every rule above and still read machine-written: every sentence clipped, no view anywhere, nothing specific.

- Mix sentence lengths on purpose. Short ones land a point. Longer ones carry a fact with its condition.
- Have a view where the mode allows it. Explanation weighs trade-offs, so say what you make of them.
- Be specific over sterile. Not "schema changes can cause issues" but "renaming a field in `src/data/recipes/*.json` silently drops it from the Firestore migration."

## Commit messages and PR bodies

- Subject: imperative, under 72 characters, scoped like the existing history (`feat(recipes):`, `style(recipe):`, `fix(ui):`).
- Body: what changed and why, not a diff summary. The diff is already in the PR.
- Name the verification. "Ran `npm run test`, 214 passing" beats "tested".

Run the finished text through **unslop** before it ships.
