# Recifree agent skills

Reusable techniques an agent reaches for on its own. One directory per skill, each holding a `SKILL.md` with YAML frontmatter (`name`, `description`).

This directory is the single source of truth. Claude Code reads the same files through symlinks in `.claude/skills/`, so a skill is edited in exactly one place.

## Skills vs workflows

- **`.agent/workflows/`** holds procedures a human triggers. Ordered steps, run start to finish. Adding a recipe, running the security audit.
- **`.agent/skills/`** holds techniques an agent recognizes it needs. Loaded by description when the situation matches.

Workflows are invoked. Skills are recognized.

## The skills

| Skill | Use it when |
|---|---|
| `unslop` | Always. Any text you write, including chat replies and commit messages. |
| `technical-writing` | Writing or editing any `.md` file, a PR body, or a commit message. |
| `writing-for-agents` | Editing an `AGENTS.md`, a workflow, or a skill. |
| `simplicity` | Refactoring, reviewing your own diff, or about to add a layer. |
| `codebase-design` | Designing a component or service interface, or deciding where a seam goes. |
| `blast-radius` | Before touching `firestore.rules`, `firebase.json`, `functions/`, or a shared context. |
| `fix-root-causes` | Something is broken, throwing, or slow. |
| `prove-it-works` | Before saying "done". Every time. |
| `verify-in-app` | Before claiming a UI, routing, styling, or auth change works. |
| `grill-me` | Stress-testing a plan or a new roadmap phase before writing code. |
| `handoff` | Ending a session with the work unfinished. |

## Loading them

**Claude Code** discovers them automatically through `.claude/skills/`, which symlinks to this directory.

**Antigravity** and any other agent read `AGENTS.md`, which points here. If a skill is not being picked up automatically, name it: "use the blast-radius skill."

Any agent can read a skill directly. They are plain markdown with no tool-specific syntax, so `cat .agent/skills/<name>/SKILL.md` always works.

## Adding a skill

1. Create `.agent/skills/<name>/SKILL.md` with `name` matching the directory.
2. Symlink it: `ln -s ../../.agent/skills/<name> .claude/skills/<name>`.
3. Add a row to the table above and to the list in the root `AGENTS.md`.
4. Follow `writing-for-agents` while you write it.

## Origin

Adapted from [cursor/plugins pstack](https://github.com/cursor/plugins/tree/main/pstack/skills) and [mattpocock/skills](https://github.com/mattpocock/skills). Both are MIT-adjacent open source; check each repo for its license before redistributing. These versions are rewritten for Recifree: harness-specific machinery removed, repo paths and scripts filled in, and several source skills merged where they overlapped.
