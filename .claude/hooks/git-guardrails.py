#!/usr/bin/env python3
"""Block destructive git commands before they run.

Reads a PreToolUse hook payload on stdin. Exit 2 blocks the call and returns
stderr to the agent. Exit 0 lets it through.

Only shell segments whose first word is `git` are inspected, so a command that
merely mentions one of these patterns (writing a doc, patching this file) is
not blocked.
"""

import json
import re
import shlex
import sys

# Each rule: (predicate over the git argv, reason shown to the agent).
RULES = []


def rule(reason):
    def wrap(fn):
        RULES.append((fn, reason))
        return fn

    return wrap


def has(args, *flags):
    return any(a in flags for a in args)


@rule("force push. It rewrites history on the remote.")
def _force_push(a):
    return a[:1] == ["push"] and (
        has(a, "--force", "-f") or any(x.startswith("--force-with-lease") for x in a)
    )


@rule("git reset --hard. It discards uncommitted work with no recovery.")
def _reset_hard(a):
    return a[:1] == ["reset"] and has(a, "--hard")


@rule("git clean -f. It deletes untracked files, including .env.local and .secret/.")
def _clean(a):
    if a[:1] != ["clean"]:
        return False
    return any(re.fullmatch(r"-[a-eg-z]*f[a-z]*", x) or x == "--force" for x in a)


@rule("a bulk checkout or restore of the working tree. Name the specific file instead.")
def _bulk_restore(a):
    if a[:1] not in (["checkout"], ["restore"]):
        return False
    targets = [x for x in a[1:] if x not in ("--", "--staged", "--worktree", "--source")]
    return any(t in (".", "./", "*") for t in targets)


@rule("force branch delete. Use -d, which refuses to drop unmerged work.")
def _branch_force_delete(a):
    return a[:1] == ["branch"] and (
        has(a, "-D") or (has(a, "--delete") and has(a, "--force"))
    )


@rule("git rebase. Rewriting history is a human decision in this repo.")
def _rebase(a):
    return a[:1] == ["rebase"] and not has(a, "--abort", "--quit", "--continue")


@rule("a history-rewriting or object-pruning command.")
def _history_rewrite(a):
    if a[:1] in (["filter-branch"], ["filter-repo"]):
        return True
    if a[:2] == ["reflog", "expire"]:
        return True
    return a[:1] == ["gc"] and any(x.startswith("--prune") for x in a)


@rule("--no-verify. Husky runs the pre-commit gate for a reason.")
def _no_verify(a):
    return a[:1] in (["commit"], ["push"]) and has(a, "--no-verify", "-n")


@rule("direct ref manipulation.")
def _refs(a):
    return (a[:2] == ["update-ref", "-d"]) or a[:1] == ["symbolic-ref"]


SPLIT = re.compile(r"(?:\|\||&&|[;\n|&])")


def git_invocations(command):
    """Yield the argv (minus the leading `git`) of each git call in a command."""
    for segment in SPLIT.split(command):
        segment = segment.strip()
        if not segment:
            continue
        try:
            words = shlex.split(segment)
        except ValueError:
            words = segment.split()
        while words and words[0] in ("sudo", "command", "nohup", "time", "env"):
            words.pop(0)
        if words[:1] == ["git"]:
            # Drop global options like -C <path> so the subcommand lands first.
            rest = words[1:]
            while rest and rest[0].startswith("-"):
                skip = 2 if rest[0] in ("-C", "-c", "--git-dir", "--work-tree") else 1
                rest = rest[skip:]
            yield rest


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    command = payload.get("tool_input", {}).get("command", "")
    if not command:
        return 0

    for argv in git_invocations(command):
        if not argv:
            continue
        for predicate, reason in RULES:
            if predicate(argv):
                print(
                    f"BLOCKED by .claude/hooks/git-guardrails.py: {reason}",
                    file=sys.stderr,
                )
                print(
                    "If this is genuinely what you want, ask the user to run it "
                    "themselves.",
                    file=sys.stderr,
                )
                return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
