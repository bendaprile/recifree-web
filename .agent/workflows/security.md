---
description: Daily/weekly security audit for Recifree — scans for vulnerabilities, updates the registry, and opens PRs for safe fixes.
---

# 🔐 Recifree Security Audit Workflow

This is the canonical instruction file for the scheduled security agent. When triggered (manually or on schedule), follow every phase in order without skipping steps. This document is the single source of truth for what the agent does and how it makes decisions.

---

## 🎯 Mission

1. **Audit** Recifree's specific attack surface for real vulnerabilities.
2. **Record** every new finding in `docs/SECURITY_REGISTRY.md` (deduplicating against existing entries).
3. **Fix** as many items as safely possible per run — starting from the highest severity. The test suite is the safety gate, not severity level.
4. **Escalate** critical findings immediately as a GitHub Issue without waiting for the next run.

---

## ⚠️ Non-Negotiables (Read Before Anything Else)

- **NEVER open a PR if `npm run test` fails.** Record the failure in the registry instead.
- **NEVER attempt a fix you cannot confidently reverse** — always know the `git checkout -- <file>` escape hatch before touching a file.
- **NEVER bump a major version of a production dependency** (`react`, `firebase`, `react-router-dom`) automatically. Flag it in the registry for manual review instead.
- **NEVER modify `firestore.rules` or `.env.*` files in a PR without also updating the registry entry status.**
- **NEVER hardcode secrets, tokens, or keys anywhere in the fix.**
- **ALWAYS run `npm run test` before AND after making any code change.**
- **ALWAYS keep the dashboard counters in the registry accurate.**

---

## 📋 Phase 1: Setup & Branch

1. Confirm you are in the Recifree project root (`/Users/BigBoss/Desktop/Recifree3`).
2. Ensure the working tree is clean: run `git status`. If there are uncommitted changes, stop and report them — do not proceed.
3. Record today's date (`YYYY-MM-DD`) — you will use it throughout.
4. Create a working branch for this run:
   ```bash
   git checkout -b security/audit-YYYY-MM-DD
   ```
   If a branch for today already exists, switch to it and continue.

---

## 📋 Phase 2: Run All Audits

Run each check below in sequence. Collect all findings into a structured list before touching the registry.

### Check 1 — npm Dependency Audit

```bash
npm audit --json
```

- Parse the JSON output. Extract every vulnerability with severity `critical`, `high`, `moderate`, or `low`.
- For each finding, capture: **package name**, **severity**, **vulnerability title**, **CVE ID if present**, **fix availability** (`npm audit fix` vs manual).
- Ignore `devDependencies` vulnerabilities that **cannot reach production** (i.e., only used in test/build tools that never ship to the browser). Use judgment — if a devDependency vulnerability can be exploited during CI or build, still record it as `low`.

### Check 2 — Firestore Security Rules Audit

Read `firestore.rules` and evaluate it against these specific rules for Recifree:

| Rule | Check | Risk if Violated |
|------|-------|-----------------|
| R1 | `recipes` collection: `allow read: if true` is intentional and acceptable (public recipes). Verify no write is allowed without `request.auth != null`. | High — anyone could write recipes |
| R2 | `recipes` collection: Verify `allow delete` is NOT permitted (neither implicitly nor explicitly). | High — recipes could be deleted by any authed user |
| R3 | `users/{userId}` documents: Verify `request.auth.uid == userId` is enforced for ALL read AND write operations. | Critical — cross-user data exposure |
| R4 | `users/{userId}/savedRecipes` subcollection: Same `uid` check required. | High — saved lists could be read/written by others |
| R5 | No wildcard `match /{document=**}` catch-all that grants broad access. | Critical — global open access |
| R6 | `allow update` on recipes — verify if present — should require `request.auth != null` AND ideally field-level validation (e.g., only allow known fields). | Medium — recipe content injection |
| R7 | No collection is accidentally left with `allow read, write: if true`. | Critical |

For each rule violation found, classify severity using the table above.

### Check 3 — Environment Variable / Secret Exposure Audit

Search the entire `src/` directory for hardcoded secrets or misconfigured env usage:

```bash
# Check for hardcoded Firebase API keys or secrets in source
grep -rn "AIza" src/ functions/ scripts/
grep -rn "firebase.*private_key" src/ functions/ scripts/
grep -rn "service_account" src/ functions/ scripts/ --include="*.js" --include="*.jsx"

# Check for raw process.env usage (should use import.meta.env in Vite frontend)
grep -rn "process\.env\." src/ --include="*.js" --include="*.jsx"

# Check for any .env files accidentally committed
git ls-files | grep "\.env" | grep -v ".env.example"
```

Flag any findings. Note: `import.meta.env.*` usage is correct for Vite; only flag if raw values are present.

### Check 4 — Content Security Policy (CSP) Audit

Read `firebase.json` and check the `hosting.headers` section:

- Is a `Content-Security-Policy` header present?
- If present, does it allow `unsafe-inline` or `unsafe-eval`? (These weaken XSP significantly.)
- Is `X-Frame-Options` or `frame-ancestors` present (clickjacking protection)?
- Is `X-Content-Type-Options: nosniff` present?
- Is `Referrer-Policy` present?

Missing CSP headers are `low`/`info` severity for this project since Recifree is a public recipe SPA, but still worth tracking.

### Check 5 — Dependency Version Staleness Check

```bash
npm outdated --json 2>/dev/null || true
```

Flag any **direct dependencies** (from `dependencies` in `package.json`, not `devDependencies`) that are more than 2 major versions behind. This is `info` severity — not a fix for automated PRs, just for awareness.

### Check 6 — LLM Prompt Injection Regression Check

Read `functions/index.js` (or the equivalent Cloud Function entry point). Verify that the extraction function still has:

- Input length limits (character caps on incoming URLs/text).
- HTML sanitization before passing content to the Gemini prompt.
- No user-controlled input directly interpolated into the system prompt string.
- JSON schema validation on LLM output before writing to Firestore.

If any of these protections are absent or appear weakened from a previous version, flag as `high`.

---

## 📋 Phase 3: Update the Security Registry

Open `docs/SECURITY_REGISTRY.md`.

### Deduplication Rule
Before adding any finding, search the registry for an existing entry with the same:
- Package name (for npm vulns)
- Rule ID (for Firestore rule checks)
- File path + grep pattern (for env/CSP checks)

If a matching entry already exists with status `open` or `in-progress`, **do not add a duplicate**. If it exists as `fixed` or `dismissed`, add it fresh (it may have regressed).

### Adding New Findings
For each new finding not already in the registry, append it to the correct severity section using this exact format:

```markdown
### [VULN-NNN] <Title>
- **ID**: VULN-NNN
- **Status**: `open`
- **Severity**: `critical` | `high` | `low` | `info`
- **Category**: `npm-dependency` | `firestore-rules` | `env-exposure` | `csp-header` | `code-pattern` | `prompt-injection`
- **Discovered**: YYYY-MM-DD
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: <package name, file path, or rule ID>
- **Description**: <1–3 sentences explaining the vulnerability and its impact in Recifree's context.>
- **Fix Applied**: —
- **Dismissed Reason**: —
```

Assign IDs sequentially (`VULN-001`, `VULN-002`, etc.). Never reuse an ID even if an entry is deleted.

### Updating the Dashboard
After adding all new entries, recount and update the dashboard table at the top of the file.

### Update Last Audit Date
Replace the `*Last audit run: Never*` / existing date line with today's date.

---

## 📋 Phase 4: Decide What to Fix This Run

Fix as much as you safely can. The right axis is **disruption level**, not severity — a critical devDependency patch is safer to apply than a moderate major-version bump of a production dep.

### Step 1 — Always run `npm audit fix` first (non-breaking)

```bash
npm audit fix
```

This applies all patch and minor upgrades that npm considers non-breaking. It can clear dozens of entries across all severity levels in one shot. Always do this — it is the lowest-risk action available. Run `npm run test` immediately after.

### Step 2 — Assess remaining open items by disruption level

After `npm audit fix`, re-run `npm audit --json` to see what's still open. Then work through remaining items in this order:

| Priority | Disruption | Approach |
|----------|------------|----------|
| 1st | **Patch/minor upgrade of any devDependency** | Apply directly — build tools, test runners, Firebase CLI. Run tests. |
| 2nd | **CSP / security header additions** in `firebase.json` | One-line additions, zero code risk. Apply all at once. |
| 3rd | **Patch/minor upgrade of a production dependency** (`firebase`, `react-router-dom`) | Apply, run tests, verify app still builds (`npm run build`). |
| 4th | **Firestore rule hardening** (adding restrictions only) | Apply with care, document exactly what changed and why. |
| 5th | **`npm audit fix --force`** on a devDependency with a major bump | Only if you can verify the build still works after. |
| ❌ Skip | **Major version bump of `react`, `firebase`, `react-router-dom`** | Flag in registry as `needs-manual-review`. Open a GitHub Issue explaining the upgrade path. Do not auto-apply. |
| ❌ Skip | **Fixes requiring architectural changes** or removing features | Leave `open`. Document reasoning in the registry entry. |

When in doubt, leave it as `open` and document your reasoning in the registry entry. Partial progress is fine — the registry persists across runs.

---

## 📋 Phase 5: Apply Fixes

1. **Establish a baseline** — run tests before touching anything:
   ```bash
   npm run test
   ```
   If tests fail on the baseline, stop immediately. Document in the registry and do not proceed.

2. **Run `npm audit fix`** (always first, every run):
   ```bash
   npm audit fix
   npm run test
   ```
   If tests pass → stage these changes and continue to step 3. If tests fail → run `git checkout -- package.json package-lock.json` to revert and note the failure.

3. **Work through remaining items** from the Phase 4 priority table. For each:
   - Apply the fix (targeted, minimal change)
   - Run `npm run test` immediately after
   - If tests pass → keep the change, update the registry entry to `fixed`
   - If tests fail → `git checkout -- <changed file>` to revert, update registry entry:
     ```
     - **Fix Applied**: ATTEMPTED YYYY-MM-DD — reverted; tests failed. Manual review required.
     ```
   - Move on to the next item regardless — don't let one failure block others

4. **After all fixes**, do a final test run to confirm the combined state is clean:
   ```bash
   npm run test
   ```

5. **Update the registry** for every fixed entry:
   - Status → `fixed`
   - `Fixed / Dismissed` → today's date
   - `Fix Applied` → clear description of what changed

---

## 📋 Phase 6: Commit & Open a PR

Only proceed if at least one fix was successfully applied and all tests pass.

1. Stage changes:
   ```bash
   git add -A
   ```

2. Commit with a clear, conventional message:
   ```bash
   git commit -m "security: fix VULN-NNN, VULN-NNN — <one-line summary>

   - VULN-NNN: <package or rule> — <what was done>
   - VULN-NNN: <package or rule> — <what was done>

   All tests passing. Registry updated in docs/SECURITY_REGISTRY.md."
   ```

3. Push the branch:
   ```bash
   git push origin security/audit-YYYY-MM-DD
   ```

4. Open a Pull Request with:
   - **Title**: `security: [VULN-NNN, VULN-NNN] <short summary>`
   - **Body**: (use the template below)

### PR Body Template

```markdown
## 🔐 Security Fix — Automated Audit Run YYYY-MM-DD

This PR was generated by the Recifree scheduled security audit agent.

### Vulnerabilities Fixed
| ID | Severity | Category | Description |
|----|----------|----------|-------------|
| VULN-NNN | 🟡 High | npm-dependency | Brief description |
| VULN-NNN | 🟢 Low | csp-header | Brief description |

### What Was Changed
- `package.json` / `package-lock.json`: Upgraded X from vA to vB (resolves CVE-XXXX)
- `firebase.json`: Added `X-Content-Type-Options` and `Referrer-Policy` headers

### Test Results
- ✅ `npm run test` passed before and after all changes
- ✅ No regressions detected

### What Was NOT Fixed This Run
See `docs/SECURITY_REGISTRY.md` for the full list of open vulnerabilities queued for future runs.

### Reviewer Notes
Please review each diff carefully before merging. The agent applies minimal, targeted changes — if anything looks broader than expected, investigate before approving.
```

---

## 📋 Phase 7: Handle Critical Escalations

If any `critical` severity finding was discovered during Phase 2 **that cannot be fixed automatically this run**, open a GitHub Issue immediately (do not wait for the next scheduled run):

```bash
gh issue create \
  --title "🚨 [SECURITY] Critical vulnerability found: VULN-NNN — <title>" \
  --body "A critical security vulnerability was found during the scheduled audit on YYYY-MM-DD.

**ID**: VULN-NNN
**Severity**: Critical
**Category**: <category>
**Affected**: <affected area>
**Description**: <description>

See docs/SECURITY_REGISTRY.md for full details. Immediate manual review recommended." \
  --label "security,critical"
```

---

## 📋 Phase 8: Final Report

After completing all phases, output a brief summary to the user:

```
🔐 Security Audit Complete — YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
New findings:    N (C critical, H high, L low, I info)
Fixes applied:   N
PR opened:       #NNN (or "None — no fixes applied this run")
Escalations:     N critical issues raised as GitHub Issues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Registry: docs/SECURITY_REGISTRY.md
```

If no new findings and no open items remain, output:
```
✅ No new vulnerabilities found. Registry is clean.
```

---

## 🗂️ Recifree Attack Surface Reference

This section is a stable reference of the areas the agent should always check. Update this if the architecture changes.

| Area | Files | Primary Risk |
|------|-------|--------------|
| npm dependencies | `package.json`, `package-lock.json` | Known CVEs in third-party packages |
| Firestore security rules | `firestore.rules` | Unauthorized data read/write |
| Firebase hosting headers | `firebase.json` | XSS, clickjacking, MIME sniffing |
| Environment variables | `src/**`, `.env.*` | Secret exposure in client bundle |
| Cloud Functions | `functions/index.js` | Prompt injection, SSRF, data validation |
| React components | `src/components/`, `src/pages/` | XSS via dangerouslySetInnerHTML, open redirect |
| Auth guards | `src/App.jsx`, `src/context/` | Bypassed route protection |
| Build output | `dist/` (never committed) | Not applicable |

---

## 📅 Recommended Schedule

Use Antigravity's `/schedule` command with the following cron:

- **Daily audit (weekdays)**: `0 9 * * 1-5` — Runs weekdays at 9am. Full audit + fix everything safely fixable + open a PR if any fixes applied.

Suggested `/schedule` prompt:
> *"Every weekday at 9am, follow the `.agent/workflows/security.md` workflow: audit Recifree for security vulnerabilities, update `docs/SECURITY_REGISTRY.md` with any new findings, then fix as many open vulnerabilities as safely possible starting from highest severity — run `npm audit fix`, apply CSP headers, and upgrade dependencies where tests pass. Open a PR for any fixes applied. Escalate any unfixed critical items as GitHub Issues."*
