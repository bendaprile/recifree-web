# 🔐 Recifree Security Registry

> **Living Document** — Maintained automatically by the scheduled security audit agent (`.agent/workflows/security.md`).
> Do not edit vulnerability status manually unless dismissing a false positive. The agent will deduplicate on each run.

---

## 📊 Dashboard

| Severity | Open | In Progress | Fixed | Dismissed |
|----------|------|-------------|-------|-----------|
| 🔴 Critical | 1 | 0 | 0 | 0 |
| 🟡 High | 10 | 0 | 0 | 0 |
| 🟠 Moderate | 9 | 0 | 0 | 0 |
| 🟢 Low | 5 | 0 | 0 | 0 |
| ℹ️ Info | 4 | 0 | 0 | 0 |

*Last audit run: 2026-05-19*

> **Note on scope**: The majority of vulnerabilities below are in `devDependencies` (build tools, Firebase emulator toolchain). They do not ship to the production browser bundle. However, they can pose a risk during CI/CD, local development, or build-time attacks and are tracked here for completeness. Production-facing vulnerabilities are explicitly noted.

---

## 🔴 Critical Vulnerabilities

<!-- CRITICAL_START -->

### [VULN-001] Arbitrary Code Execution in protobufjs
- **ID**: VULN-001
- **Status**: `open`
- **Severity**: `critical`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `protobufjs` (transitive via `firebase-admin`, `google-gax`, `@google-cloud/*`)
- **Description**: Multiple critical CVEs in `protobufjs` allow arbitrary code execution via crafted protobuf field names/byte defaults in generated code, prototype injection in generated message constructors, and unbounded recursive JSON descriptor expansion. This package is a transitive dependency of `firebase-admin` used in the Cloud Functions and migration scripts — it does **not** ship to the client browser bundle, but poses risk in the backend/CI environment.
- **Fix Applied**: —
- **Dismissed Reason**: —

<!-- CRITICAL_END -->

---

## 🟡 High Vulnerabilities

<!-- HIGH_START -->

### [VULN-002] Path Traversal — Vite Dev Server (3 CVEs)
- **ID**: VULN-002
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `vite` (devDependency — local dev server only, not production)
- **Description**: Multiple path traversal CVEs in Vite: arbitrary file read via dev server WebSocket, `server.fs.deny` bypass via query strings, and path traversal in optimized dependency map handling. Only exploitable when the dev server is running locally — no production risk. However, a malicious dependency or local network attacker could read arbitrary files from the dev machine.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-003] Rollup 4 Arbitrary File Write via Path Traversal
- **ID**: VULN-003
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `rollup` (devDependency — build tool only)
- **Description**: Two CVEs in Rollup 4 allow arbitrary file write via path traversal during the build phase. A maliciously crafted input file or dependency could write files outside the project directory during `npm run build`. Risk is limited to the CI/CD build environment and local build runs.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-004] undici HTTP Request Smuggling & Multiple High CVEs
- **ID**: VULN-004
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `undici` (transitive via `firebase` SDK — affects both client and functions)
- **Description**: Multiple high-severity CVEs in `undici`: HTTP request/response smuggling, unbounded decompression chain (resource exhaustion), 64-bit WebSocket length overflow crashing client, CRLF injection via `upgrade` option, and unbounded memory in WebSocket permessage-deflate. Since `undici` is pulled in by the Firebase JS SDK (`@firebase/auth`, `@firebase/firestore`, etc.), this potentially affects the **production client bundle**.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-005] minimatch ReDoS — Multiple Patterns
- **ID**: VULN-005
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `minimatch` (devDependency — build toolchain)
- **Description**: Multiple ReDoS vulnerabilities in `minimatch` via repeated wildcards with non-matching literals, nested `*()` extglobs, and multiple non-adjacent GLOBSTAR segments. Affects build tooling only; no production impact.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-006] picomatch ReDoS & Method Injection
- **ID**: VULN-006
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `picomatch` (devDependency — build toolchain)
- **Description**: Two classes of vulnerability in `picomatch`: method injection via POSIX character classes causing incorrect glob matching, and a ReDoS vulnerability via extglob quantifiers. Build toolchain only; no production impact.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-007] lodash Code Injection & Prototype Pollution
- **ID**: VULN-007
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `lodash` (transitive — likely via Firebase Admin or Google Cloud libraries)
- **Description**: `lodash` vulnerable to code injection via `_.template` imports key names, and prototype pollution via array path bypass in `_.unset`/`_.omit`. Backend/scripts toolchain risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-008] flatted Prototype Pollution & Unbounded Recursion DoS
- **ID**: VULN-008
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `flatted` (transitive — devDependency)
- **Description**: Prototype pollution via `parse()` and unbounded recursion DoS in `parse()` revive phase. DevDependency toolchain risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-009] node-tar Path Traversal & Symlink Poisoning (6 CVEs)
- **ID**: VULN-009
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `tar` (transitive via `firebase-tools` — devDependency)
- **Description**: Six CVEs in `node-tar` covering hardlink path traversal, symlink poisoning, arbitrary file creation/overwrite, and a race condition via Unicode ligature collisions on macOS APFS. Affects Firebase CLI tools used locally and in CI.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-010] fast-uri Path Traversal & Host Confusion
- **ID**: VULN-010
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `fast-uri` (transitive devDependency)
- **Description**: Path traversal via percent-encoded dot segments and host confusion via percent-encoded authority delimiters in `fast-uri`. DevDependency toolchain risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-011] @babel/plugin-transform-modules-systemjs Arbitrary Code Generation
- **ID**: VULN-011
- **Status**: `open`
- **Severity**: `high`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `@babel/plugin-transform-modules-systemjs` (devDependency — build toolchain)
- **Description**: Generates arbitrary code when compiling malicious input during the Babel transpilation step. Risk during build when processing untrusted source files.
- **Fix Applied**: —
- **Dismissed Reason**: —

<!-- HIGH_END -->

---

## 🟠 Moderate Vulnerabilities

<!-- MODERATE_START -->

### [VULN-012] brace-expansion Zero-Step Sequence & Large Range DoS
- **ID**: VULN-012
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `brace-expansion` (devDependency — build toolchain)
- **Description**: Zero-step sequence causes process hang and memory exhaustion; large numeric range defeats documented `max` DoS protection. Build toolchain only.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-013] ajv ReDoS via $data Option
- **ID**: VULN-013
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `ajv` (devDependency — build toolchain / Firebase tools)
- **Description**: ReDoS when using `$data` option in `ajv` (two separate CVEs). DevDependency toolchain risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-014] postcss XSS via Unescaped </style> in CSS Stringify
- **ID**: VULN-014
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `postcss` (devDependency — Vite build toolchain)
- **Description**: PostCSS can output unescaped `</style>` in its CSS stringify output, potentially allowing XSS if the CSS output is injected into HTML without sanitization. Build toolchain only; no production risk since CSS is bundled as static files.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-015] @protobufjs/utf8 Overlong UTF-8 Decoding
- **ID**: VULN-015
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `@protobufjs/utf8` (transitive via `firebase-admin` backend)
- **Description**: Overlong UTF-8 decoding vulnerability. Backend/Cloud Functions toolchain risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-016] fast-xml-parser XML Comment/CDATA Injection
- **ID**: VULN-016
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `fast-xml-parser`, `fast-xml-builder` (transitive via Firebase toolchain)
- **Description**: XML comment and CDATA injection via unescaped delimiters in `fast-xml-parser`; attribute values with unwanted quotes bypass in `fast-xml-builder`. Firebase toolchain risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-017] ip-address XSS in Address6 HTML-Emitting Methods
- **ID**: VULN-017
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `ip-address` (transitive devDependency)
- **Description**: XSS in Address6 HTML-emitting methods if IPv6 addresses from untrusted sources are rendered as HTML. DevDependency toolchain risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-018] uuid Missing Buffer Bounds Check
- **ID**: VULN-018
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `uuid` (transitive dependency)
- **Description**: Missing buffer bounds check in UUID v3/v5/v6 when `buf` is provided. Low exploitability in Recifree's context since UUIDs are generated server-side.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-019] ws Uninitialized Memory Disclosure
- **ID**: VULN-019
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `ws` (transitive — Firebase emulator / toolchain)
- **Description**: Uninitialized memory disclosure in `ws`. Emulator/toolchain risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-020] undici (Firebase SDK) — Moderate CVEs
- **ID**: VULN-020
- **Status**: `open`
- **Severity**: `moderate`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `@firebase/auth`, `@firebase/firestore`, `@firebase/storage`, `@firebase/functions` (production client bundle)
- **Description**: The Firebase JS SDK pulls in `undici` which has moderate vulnerabilities (unbounded WebSocket memory, invalid `server_max_window_bits` validation). While likely not directly exploitable in a browser context (undici is a Node.js HTTP client), these are tracked until the Firebase SDK ships an updated dependency.
- **Fix Applied**: —
- **Dismissed Reason**: —

<!-- MODERATE_END -->

---

## 🟢 Low Vulnerabilities

<!-- LOW_START -->

### [VULN-021] Missing Content Security Policy (CSP) Header
- **ID**: VULN-021
- **Status**: `open`
- **Severity**: `low`
- **Category**: `csp-header`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `firebase.json` — `hosting.headers` config
- **Description**: No `Content-Security-Policy` header is configured in Firebase Hosting. While Recifree's SPA is relatively low-risk (no user-generated HTML rendering, `dangerouslySetInnerHTML` not used broadly), the absence of a CSP header means there is no defense-in-depth against XSS if one were introduced. A strict CSP is a best-practice baseline.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-022] Missing X-Frame-Options / frame-ancestors (Clickjacking)
- **ID**: VULN-022
- **Status**: `open`
- **Severity**: `low`
- **Category**: `csp-header`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `firebase.json` — `hosting.headers` config
- **Description**: No `X-Frame-Options` or CSP `frame-ancestors` directive configured. Recifree pages could be embedded in an iframe on a malicious site for clickjacking attacks. Low risk for a recipe reading app, but trivial to fix.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-023] Missing X-Content-Type-Options Header
- **ID**: VULN-023
- **Status**: `open`
- **Severity**: `low`
- **Category**: `csp-header`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `firebase.json` — `hosting.headers` config
- **Description**: No `X-Content-Type-Options: nosniff` header. Prevents MIME sniffing attacks where browsers guess content type from response body. A one-line fix.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-024] Missing Referrer-Policy Header
- **ID**: VULN-024
- **Status**: `open`
- **Severity**: `low`
- **Category**: `csp-header`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `firebase.json` — `hosting.headers` config
- **Description**: No `Referrer-Policy` header configured. Without this, full URLs (including any query parameters or internal paths) may be sent to third-party origins as HTTP `Referer` headers. A `strict-origin-when-cross-origin` policy is the modern standard.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-025] google-gax / retry-request / teeny-request Low CVEs
- **ID**: VULN-025
- **Status**: `open`
- **Severity**: `low`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `google-gax`, `retry-request`, `teeny-request`, `http-proxy-agent`, `@tootallnate/once` (transitive via Firebase Admin / Cloud toolchain)
- **Description**: Low-severity CVEs across the Google Cloud API client toolchain, including `@tootallnate/once` incorrect control flow scoping. Backend/scripts toolchain only; no production browser impact.
- **Fix Applied**: —
- **Dismissed Reason**: —

<!-- LOW_END -->

---

## ℹ️ Informational / Best Practice Gaps

<!-- INFO_START -->

### [VULN-026] Firestore rules: `allow create, update` without field-level validation on recipes
- **ID**: VULN-026
- **Status**: `open`
- **Severity**: `info`
- **Category**: `firestore-rules`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `firestore.rules` — `/recipes/{recipeId}` collection
- **Description**: Authenticated users can `create` or `update` any recipe with any field values. There is no field-level validation ensuring only known fields (title, ingredients, etc.) are written. A logged-in user could write arbitrary data into recipe documents. Upgrading to use `request.resource.data.keys().hasOnly([...])` would add defense-in-depth. Low practical risk since Recifree's extraction flow is controlled via Cloud Functions, but worth hardening.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-027] Firestore rules: `allow delete` not explicitly denied on recipes
- **ID**: VULN-027
- **Status**: `open`
- **Severity**: `info`
- **Category**: `firestore-rules`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `firestore.rules` — `/recipes/{recipeId}` collection
- **Description**: The current rule `allow create, update: if request.auth != null` does not explicitly grant `delete`. In Firestore, operations not explicitly `allow`ed are denied by default, so `delete` is currently blocked. However, making this explicit (`allow delete: if false`) is a best practice — it ensures the intent is clear and prevents accidental future relaxation via a broad rule change.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-028] No Permissions-Policy header configured
- **ID**: VULN-028
- **Status**: `open`
- **Severity**: `info`
- **Category**: `csp-header`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `firebase.json` — `hosting.headers` config
- **Description**: No `Permissions-Policy` header to restrict browser features (camera, microphone, geolocation, etc.). Recifree doesn't use any of these APIs, so disabling them via policy is a minor hardening measure.
- **Fix Applied**: —
- **Dismissed Reason**: —

### [VULN-029] serialize-javascript RCE & CPU Exhaustion
- **ID**: VULN-029
- **Status**: `open`
- **Severity**: `info`
- **Category**: `npm-dependency`
- **Discovered**: 2026-05-19
- **Fixed / Dismissed**: —
- **PR**: —
- **Affected**: `serialize-javascript` (transitive via `@rollup/plugin-terser` — devDependency build tool)
- **Description**: RCE via `RegExp.flags` and `Date.prototype.toISOString()`, and CPU exhaustion via crafted array-like objects. Only runs during build-time minification with `@rollup/plugin-terser`; no production runtime risk.
- **Fix Applied**: —
- **Dismissed Reason**: —

<!-- INFO_END -->

---

## ✅ Fixed Vulnerabilities

<!-- FIXED_START -->
*No fixes recorded yet.*
<!-- FIXED_END -->

---

## 🚫 Dismissed (False Positives)

<!-- DISMISSED_START -->
*No dismissed items.*
<!-- DISMISSED_END -->

---

## 📋 Registry Schema Reference

Each vulnerability entry follows this format:

```
### [VULN-NNN] Title of Vulnerability
- **ID**: VULN-NNN (sequential, never reused)
- **Status**: `open` | `in-progress` | `fixed` | `dismissed`
- **Severity**: `critical` | `high` | `moderate` | `low` | `info`
- **Category**: `npm-dependency` | `firestore-rules` | `env-exposure` | `csp-header` | `code-pattern` | `prompt-injection`
- **Discovered**: YYYY-MM-DD
- **Fixed / Dismissed**: YYYY-MM-DD (if applicable)
- **PR**: #NNN (if applicable)
- **Affected**: File(s) or package(s) affected
- **Description**: Clear description of the vulnerability and why it matters in Recifree's context.
- **Fix Applied**: Description of what was changed to resolve it (filled in when fixed).
- **Dismissed Reason**: Explanation if this is a false positive (filled in when dismissed).
```
