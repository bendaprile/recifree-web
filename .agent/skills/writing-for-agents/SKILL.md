---
name: writing-for-agents
description: How to write and edit documents an agent reads: AGENTS.md files, skills in .agent/skills/, and workflows in .agent/workflows/. Use whenever creating or editing any of those.
---

# Writing for agents

Recifree has a root `AGENTS.md` plus one in `src/components/`, `src/context/`, `src/data/`, `src/pages/`, and `src/services/`. It has workflows in `.agent/workflows/` and skills in `.agent/skills/`. Every one of those is a document whose only reader is a model. They follow different rules than docs for people.

## The core difference

A human skims, infers, and asks when confused. An agent reads linearly, takes every sentence as equally weighted instruction, and cannot ask. So:

- **An agent obeys what is written, not what is meant.** Vague guidance produces vague behavior. "Keep components small" does nothing. "If a component file passes 200 lines, stop and extract" does something.
- **Every sentence is an instruction.** Background prose gets executed as if it were a rule. Cut it or mark it clearly as context.
- **Order is priority.** What is near the top gets weighted more. Put the non-negotiables first.
- **Contradictions are worse than gaps.** Two rules that conflict make the agent pick one at random. A missing rule at least surfaces as a question.

## Rules

1. **Write the trigger, not the topic.** A `description` field decides whether the skill loads at all. It must name the situations and phrases that should invoke it, not summarize the contents. "Standard for writing docs" is a topic. "Use whenever you touch a .md file" is a trigger.
2. **Be specific enough to fail.** A rule you cannot violate is not a rule. If you cannot describe what breaking it looks like, rewrite it or delete it.
3. **Name real things.** Real paths, real script names, real symbols. `npm run test`, `src/services/recipeService.js`, `firestore.rules`. Never "the test command" or "the data layer."
4. **One rule per line.** An agent splits a compound rule and drops half of it.
5. **Say what to do, not only what to avoid.** "Never hardcode secrets" leaves the agent stuck. "Never hardcode secrets. Frontend config goes in `.env` via `import.meta.env`; backend secrets go in Firebase Secret Manager" gives it the path forward.
6. **Put the escape hatch in.** Every rule meets a case where it is wrong. Say what to do then. Without an exception clause the agent either breaks the rule silently or gets stuck.
7. **Cut background.** If a paragraph does not change what the agent does, delete it. Rationale belongs in `ROADMAP.md` or `docs/`, linked.
8. **Delete on sight.** Two documents saying different things about the same rule is the most expensive failure mode in this repo. When you add a rule, grep the other `AGENTS.md` files for the old version and remove it.

## Structure of a skill in `.agent/skills/`

```markdown
---
name: kebab-case-name          # must match the directory name
description: What it does, then when to use it, with trigger phrases.
---

# Title

One paragraph: what this is for, and the one idea behind it.

## Steps or rules
Numbered if order matters. Bulleted if not.

## Recifree specifics
Where this repo differs from the generic case.

**Reply:** what the agent hands back, if the skill produces an artifact.
```

Keep a skill under about 120 lines. Past that, split it or move detail into a sibling file the skill links to.

## Which file does a rule belong in

- **A rule that applies to all code in the repo** goes in root `AGENTS.md`.
- **A rule about one directory** goes in that directory's `AGENTS.md`. Do not repeat it at the root.
- **A procedure with ordered steps that a human triggers** goes in `.agent/workflows/`.
- **A reusable technique the agent should reach for on its own** goes in `.agent/skills/`.

If you are unsure between the last two: workflows are invoked, skills are recognized.

## Before you finish

- Reread it as an agent would: literally, top to bottom, with no context.
- Check for a contradiction with the root `AGENTS.md`.
- Run it through **technical-writing** (reference mode for `AGENTS.md`, how-to for workflows) and then **unslop**.
