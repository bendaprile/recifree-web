#!/usr/bin/env bash
# Blocks destructive git commands before they run.
# Wired up as a PreToolUse hook on Bash in .claude/settings.json.
# Exit 2 blocks the call and hands stderr back to the agent.
#
# Only shell segments that actually start with `git` are inspected, so writing
# about these commands in a doc or a heredoc does not trip the guard.
exec python3 "$(dirname "$0")/git-guardrails.py"
