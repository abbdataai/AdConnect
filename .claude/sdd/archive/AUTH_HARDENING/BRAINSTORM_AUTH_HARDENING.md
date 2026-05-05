# BRAINSTORM: AUTH_HARDENING

> Backend-focused slice closing the auth-token-not-validated gap explicitly documented in slice-2's [DESIGN_ADMIN_SPA.md Decision 8](../archive/ADMIN_SPA/DESIGN_ADMIN_SPA.md). Adds real JWT (python-jose) + `Depends(verify_token)` + per-endpoint role enforcement (NFR-016) to the 16 admin endpoints in `backend/main.py`. Plus a ~15 LoC admin-SPA tweak to handle 401 → auto-logout cleanly.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | AUTH_HARDENING |
| **Date** | 2026-05-04 |
| **Author** | brainstorm-agent (via /workflow:brainstorm) |
| **Status** | ✅ Shipped 2026-05-04 — archived |
| **Source Input** | User prompt referencing [SHIPPED_2026-05-04.md (ADMIN_SPA)](../archive/ADMIN_SPA/SHIPPED_2026-05-04.md) §Recommendations + slice-2 Decision 8 (Security Considerations §) |

---

## Initial Idea

**Raw Input:** User invoked `/workflow:brainstorm "auth hardening: real JWT (python-jose), Depends(verify_token) on admin endpoints, server-side TTL enforcement (closes the documented gap from ADMIN_SPA Decision 8)"` after shipping slice 2.

**Context Gathered:**
- **Slice 2 shipped 2026-05-04** with an explicitly-documented auth gap. [DESIGN_ADMIN_SPA.md Decision 8](../archive/ADMIN_SPA/DESIGN_ADMIN_SPA.md) lays it out: opaque token (`base64(email)[:12] + token_hex(8)`), no `Depends(verify_token)` on any of the 16 admin endpoints, no real JWT, no server-side TTL enforcement. NFR-016 ("role enforcement must be server-side") explicitly **not met** by slice 2.
- **Slice 2 pre-wired half the work.** The admin SPA already sends `Authorization: Bearer <token>` on every request (currently ignored server-side). Two `// TODO(auth-hardening-slice)` markers in [client.ts:10](../../../mkt-wifi-admin/src/api/client.ts) and [RoleGuard.tsx:11](../../../mkt-wifi-admin/src/ui/RoleGuard.tsx) flag the spots that come "active" once the backend validates.
- **`backend/main.py:284`** has the comment *"In production: store hashed passwords in DB and use python-jose for JWTs"* — the technical direction was preordained.
- **No frontend rewrite needed.** Both shipped SPAs already handle auth; this slice modifies ~15 LoC across 3 files in `mkt-wifi-admin/`.

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location (backend) | NEW `backend/auth.py` (JWT mint/verify, dependencies, exceptions) + NEW `backend/auth_routes.py` (APIRouter for /api/auth/login + /api/auth/logout, promoted from main.py) + NEW `backend/tests/test_auth*.py` | Mirrors slice-1's `portal_routes.py` extraction pattern. |
| Modifications | `backend/main.py` (delete legacy login/logout + DEMO_ACCOUNTS; add `app.include_router(auth_router)`; add `Depends(verify_token)` or `Depends(require_role([...]))` to 16 admin endpoints), `backend/requirements.txt` (add `python-jose[cryptography]`), `backend/README.md` (JWT_SECRET env var docs) | 16 mechanical signature edits in main.py — small but spread out. |
| Modifications (SPA) | `mkt-wifi-admin/src/api/client.ts` (+10 LoC: 401 → auto-logout interceptor), `mkt-wifi-admin/src/ui/RoleGuard.tsx` (remove TODO comment), `mkt-wifi-admin/src/sections/login/LoginPage.tsx` (+5 LoC: read ?reason=expired, show STR.login.expired) | The 2 slice-2 TODO markers vanish in this slice's /build. |
| Untouched | `captive-portal-frontend/`, `backend/portal_routes.py`, all of `mkt-wifi-frontend/` | Captive-portal endpoints are PUBLIC by design (anonymous Wi-Fi guests); no auth required. |
| Library | `python-jose[cryptography]>=3.3` (already mentioned in main.py:284 comment) | HS256 + shared secret. |
| Secret management | `JWT_SECRET` env var; if unset, generate random 32-byte secret at startup with `WARNING` log | Future slice integrates with secrets manager. |
| Forward-compat with multi-tenant slice | JWT claims include `role`; future multi-tenant slice adds `org_id` claim without breaking the contract | New claim is additive. |
| Forward-compat with R5 (password hashing) | Login validates plaintext password against DEMO_ACCOUNTS today; R5 slice replaces with bcrypt — `auth_routes.py` is the swap point | Single-file change in R5 slice. |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Which gaps should the auth-hardening slice close? | **B — JWT + verify_token + per-endpoint role enforcement** (closes Decision 8 + NFR-016 in one slice) | R5 (plaintext passwords) and refresh tokens deferred to separate slices. |
| 2 | What JWT TTL should the access token use? | **7 days** — parity with current client-side TTL | Matches existing 7-day check in `stores/auth.ts:isExpired()`. Operators see no behavior change. |
| 3 | Should the admin SPA's 401-handling tweak be included in this slice? | **Yes — include now (~10 LoC delta)** | Ships a complete user-facing auth experience; clears the 2 outstanding `// TODO(auth-hardening-slice)` markers from slice 2. |
| 4 (sample collection) | Which samples / reference assets are available? | **Existing backend/main.py + slice-1 + slice-2 patterns** + **slice-2 RoleGuard role policy table**. No external secrets manager. | Per-endpoint role policy mirrors slice-2 RoleGuard with data-model-aware tightening (no Campaign.owner_id → Anunciante GET-only on campaigns). |

**Minimum Questions:** 3 ✅ — exceeded with 4.

---

## Sample Data Inventory

| Type | Location | Notes |
|------|----------|-------|
| Backend admin-endpoint inventory | [backend/main.py](../../../backend/main.py) | 16 endpoints in scope; 2 `/api/auth/*` endpoints stay public. |
| Slice-1 APIRouter pattern (recipe) | [backend/portal_routes.py](../../../backend/portal_routes.py) | `auth_routes.py` will mirror this exactly: APIRouter + Pydantic models + tests in `backend/tests/`. |
| Slice-2 RoleGuard policy | [archive/ADMIN_SPA/DESIGN_ADMIN_SPA.md](../archive/ADMIN_SPA/DESIGN_ADMIN_SPA.md) Decision 5 | Per-route role policy that this slice mirrors as per-endpoint enforcement. |
| Slice-2 TODO markers | `mkt-wifi-admin/src/api/client.ts:10` + `mkt-wifi-admin/src/ui/RoleGuard.tsx:11` | Both removed in this slice's /build. |
| `STR.login.expired` (already in slice 2) | `mkt-wifi-admin/src/strings.ts` | Already says "Sua sessão expirou. Entre novamente." — wired in this slice's LoginPage. |
| python-jose docs | external | `jose.jwt.encode` + `jose.jwt.decode`; `ExpiredSignatureError` + `JWTError` exception classes. |

**How samples will be used:**
- Slice-1's `portal_routes.py` is the structural template for `auth_routes.py` (APIRouter + tests pattern).
- Slice-2's `RoleGuard` policy table is the source of truth for per-endpoint role mapping (with the data-model-aware Anunciante tightening).
- python-jose's idiomatic API is the contract for `auth.py` mint/verify functions.

---

## Approaches Explored

### Approach A — APIRouter + `auth.py` module + dependency-pattern role guards ⭐ Recommended (SELECTED)

**Description:** Mirror slice-1's `portal_routes.py` extraction pattern. New `backend/auth.py` module hosts JWT mint/verify functions + `verify_token` + `require_role` FastAPI dependencies + the `UserClaims` dataclass + secret loading. New `backend/auth_routes.py` hosts `/api/auth/login` + `/api/auth/logout` (promoted from main.py for cleaner separation). Each of the 16 admin endpoints in `main.py` gets either `_: UserClaims = Depends(verify_token)` (for read endpoints) or `_: UserClaims = Depends(require_role(["admin"]))` (for writes). Add `python-jose[cryptography]` to `requirements.txt`. ~15 LoC of changes across 3 files in `mkt-wifi-admin/`. New `backend/tests/test_auth.py` (unit) + `test_auth_integration.py` (integration).

**Pros:**
- Mirrors slice-1's APIRouter pattern verbatim — low recipe risk.
- `auth.py` becomes the single source of truth for token mechanics. Future slices (multi-tenant tenant context, R5 password hashing, audit-pipeline) extend it cleanly.
- Per-endpoint Depends is **idiomatic FastAPI** — Swagger UI shows the auth requirement on every protected endpoint automatically.
- Tests cleanly separable: unit tests for token mechanics, integration tests for endpoint gating.
- `UserClaims` dataclass gives type-safety to every endpoint that needs the current user.

**Cons:**
- 16 endpoint signatures in `main.py` change (mechanical edits — one `_: UserClaims = Depends(...)` parameter each).
- Promoting auth routes to `auth_routes.py` is a small `main.py` cleanup that touches lines beyond the strict scope.

**Why Recommended (and selected):** This is the only approach that gives us a proper `auth.py` module future slices can reuse. The 16 mechanical signature edits are trivial; the structural payoff (clean separation + reusability) is worth it.

---

### Approach B — Middleware-based auth (single mount, fewer per-endpoint changes)

**Description:** Single `app.add_middleware(AuthMiddleware)` in `main.py`. The middleware verifies tokens before request dispatch; skips an allowlist of public paths; attaches `request.state.user`. Per-endpoint role checks remain `Depends(require_role)` opt-in.

**Pros:**
- Single mount point; no per-endpoint signature change for *authentication*.
- Conceptually clean — auth is a cross-cutting concern.

**Cons:**
- Public-path allowlist is **brittle**: every new public endpoint requires updating the middleware. Forgetting it accidentally exposes or accidentally requires auth on a public endpoint.
- FastAPI's idiomatic pattern is `Depends`; middleware-based auth fights the framework. Swagger UI doesn't show middleware-applied auth.
- Mixes authn (middleware) and authz (Depends) — split design; harder to reason about.

**Rejected because:** The brittleness of the public-path allowlist combined with the lack of Swagger visibility makes this a security smell.

---

### Approach C — Inline `verify_token` in `main.py` (no shared module)

**Description:** Define JWT mint/verify + `verify_token` + `require_role` directly in `main.py`. No new files.

**Pros:**
- Smallest possible footprint.

**Cons:**
- `main.py` becomes 500+ LoC mixing auth logic, route handlers, schemas.
- Future slices (multi-tenant, R5, DB-baseline) can't import auth helpers cleanly.
- Reverts the slice-1 module-extraction pattern.

**Rejected because:** Slice 1 already established "extract into module" as the convention. Reverting is regression.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A — APIRouter + `auth.py` module + dependency-pattern role guards |
| **User Confirmation** | 2026-05-04 (during /workflow:brainstorm session, Validation 1 + Validation 2 both ✅) |
| **Reasoning** | Only approach that gives a reusable `auth.py` module + idiomatic FastAPI with Swagger visibility. The 16 mechanical signature edits in main.py are trivial; the structural payoff (clean separation + reusability) is worth it. |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Slice scope: Decision 8 + NFR-016 in one slice; R5 + refresh tokens deferred | Decision 8 and NFR-016 are tightly coupled (auth without authz is incomplete); R5 is a separate concern (credential storage vs token mechanics); refresh tokens are YAGNI at 7-day TTL | Option A (auth only — leaves NFR-016 open); Option C (full hardening — bundles unrelated concerns); Option D (refresh tokens — premature) |
| 2 | JWT TTL = 7 days, matching current client-side TTL | Zero UX disruption; client-side `isExpired()` becomes redundant but harmless; tightening becomes a future iterate | 8h or 1h (UX disruption + need for refresh tokens); env-var-configurable (slight overengineering) |
| 3 | Include SPA 401 interceptor in this slice (~15 LoC across 3 files) | Without it, expired-token UX is broken (toasts forever). Slice ships a complete user-facing auth flow. Clears 2 TODO markers from slice 2 | Backend-only (broken UX); +"sessão expirou" notice (kept as polish — reads STR.login.expired which slice 2 already shipped unused) |
| 4 | APIRouter pattern + `auth.py` module + `auth_routes.py` (mirror slice 1's `portal_routes.py`) | Idiomatic FastAPI; reusable across future slices; Swagger UI shows auth requirements; tests cleanly separable | Middleware (brittle allowlist; no Swagger visibility); inline (regression vs slice 1) |
| 5 | JWT algorithm = HS256 with shared `JWT_SECRET` env var; random startup default + WARNING log if unset | Single-backend deployment; HS256 + shared secret is sufficient. Random default lets dev work without env config; warning makes the production-misconfig case loud | RS256 (asymmetric, premature); hardcoded default (dangerous in production) |
| 6 | JWT claims: `sub` (email) + `name` + `role` + `iat` + `exp` (no `iss`/`aud`/`jti`) | Minimal-but-sufficient. `name` in the JWT avoids a separate `/api/auth/me` round-trip | `iss/aud/jti` (YAGNI for single-tenant single-deployment); separate /api/auth/me (extra round-trip with no benefit) |
| 7 | `UserClaims` frozen dataclass + `Literal["admin", "advertiser", "viewer"]` for `role` | Type-safe in every endpoint signature; mirrors slice-1's Pydantic Literal pattern from `schemas/portal.py` | Untyped dict (loses type safety); pydantic BaseModel (overkill for an internal claim shape) |
| 8 | `require_role(allowed)` factory (returns dependency) — composes with `verify_token` | Idiomatic FastAPI factory pattern; per-endpoint declarative; testable in isolation | Decorator (less Pythonic in FastAPI); per-endpoint manual check (boilerplate) |
| 9 | Per-endpoint role policy mirrors slice-2 RoleGuard with one tightening: Anunciante GET-only on campaigns (no `owner_id` to scope by) | Data-model-aware fidelity to slice-2 UX. Multi-tenant slice introduces `Campaign.owner_id` and re-tightens | Looser (advertiser can write any campaign — security hole); stricter (advertiser admin-only — contradicts BD-03's three-tier model) |
| 10 | 401 interceptor calls `useAuthStore.logout()` + redirects to `/login?reason=expired`; LoginPage reads the query param and shows `STR.login.expired` | `STR.login.expired` already shipped unused in slice 2 ("Sua sessão expirou. Entre novamente."). Polishing the expired-token UX with one extra LoC is essentially free | Silent retry (without refresh tokens, just re-fails — bad UX); generic toast (loses the auth-specific signal) |
| 11 | Authn failures → **401**, authz failures → **403**, malformed/missing token → **401** with `WWW-Authenticate: Bearer` header (HTTP standard) | Standards-compliant; SPA 401-interceptor handles all auth failures uniformly; 403 means "you're authenticated but not allowed" (different UX possible later) | Always 401 (loses the authz/authn distinction); 400 (loses the auth signal entirely) |

---

## Features Removed (YAGNI Pass)

| Feature | Status | Reason | Re-add When |
|---|---|---|---|
| **Refresh tokens** + `/api/auth/refresh` endpoint | **Cut entirely** (Q1 D rejected) | 7-day access TTL + simple flow is sufficient at current scale | Future slice tightens TTL to <1 hour |
| **Bcrypt/argon2 password hashing** | **Cut** | R5 is a separate slice; mixing token mechanics with credential storage is two concerns | The R5 slice (straightforward to bolt on once `auth.py` exists) |
| **Account lockout after N failed logins** | **Cut** | YAGNI without password-complexity policy or observed abuse; needs DB-backed counter | Auth-hardening v2 if abuse observed |
| **Token revocation blocklist** | **Cut** | Adds DB table + per-request lookup; 7-day TTL is the de facto revocation | Future slice if compromised-user revocation becomes a real need |
| **Multiple JWT algorithms (RS256)** | **Cut** | Single-backend deployment; HS256 + shared secret is sufficient | Multi-service architecture |
| **Key rotation / `kid` claim** | **Cut** | Single static secret per deployment; rotation = restart | Production-scale deployment slice |
| **Audit logging of failed logins / 401s** | **Stubbed** (`log.warning(...)`) | Real audit pipeline (NFR-015) is a separate slice; structured logs are the hook | Audit-pipeline slice consumes |
| **Account lockout / Captcha / 2FA / MFA** | **Cut entirely** | All belong in a security-hardening v2 slice with observed-abuse motivation | Post-launch security review |
| **CORS tightening** (`allow_origins=["*"]` → specific origins) | **Cut** | Deployment concern; affects no auth logic | Production-deploy slice |
| **`/api/auth/me` endpoint** | **Cut** | Login already returns `user`; SPA stores it in Zustand. No demonstrated need | If a future slice needs server-side identity refresh |
| **Email verification / "Solicitar acesso" self-signup** | **Cut** | No signup flow exists; `mailto:` link in slice 2 is the handoff | Multi-tenant onboarding slice (NFR-020) |
| **Password reset (`/api/auth/forgot` + `/api/auth/reset`)** | **Cut** | Separate auth-recovery slice (slice-2 already deferred) | Auth-recovery slice |
| **Server-side `Authorization` header logging** | **Cut** | Token in logs = security antipattern. Default = don't log | If observability requires it, with proper truncation |

**13 features cut/stubbed.** This slice ships exactly what closes Decision 8 + NFR-016, nothing else.

---

## Per-Endpoint Role Policy

| Endpoint | Method | admin | advertiser | viewer | Dependency |
|---|---|---|---|---|---|
| `/api/auth/login`, `/api/auth/logout` | POST | public | public | public | (none) |
| `/api/kpis`, `/api/connections/weekly`, `/api/demographics` | GET | ✅ | ✅ | ✅ | `verify_token` |
| `/api/campaigns` | GET | ✅ | ✅ | ✅ | `verify_token` |
| `/api/campaigns`, `/api/campaigns/{id}` | POST/PATCH/DELETE | ✅ | ❌ | ❌ | `require_role(["admin"])` |
| `/api/users`, `/api/users/live` | GET | ✅ | ❌ | ✅ | `require_role(["admin","viewer"])` |
| `/api/devices` | GET | ✅ | ❌ | ✅ | `require_role(["admin","viewer"])` |
| `/api/devices/{id}/refresh` | POST | ✅ | ❌ | ❌ | `require_role(["admin"])` |
| `/api/notifications/rules`, `/api/notifications/groups` | GET | ✅ | ❌ | ✅ | `require_role(["admin","viewer"])` |
| `/api/notifications/rules/{id}` | PATCH | ✅ | ❌ | ❌ | `require_role(["admin"])` |
| `/api/monetization` | GET | ✅ | ❌ | ❌ | `require_role(["admin"])` |
| `/api/reports` | GET | ✅ | ✅ | ✅ | `verify_token` |
| `/api/portal/*`, `/api/connect`, `/api/sessions/*` | (slice 1) | public | public | public | (none — captive portal) |

**Tightening vs slice-2 RoleGuard:** Anunciante loses `POST /api/campaigns` (no `Campaign.owner_id` data-model support). Multi-tenant slice introduces `owner_id` and tightens further.

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| **Validation 1 — Architecture concept** (file layout: auth.py + auth_routes.py + main.py edits + 3 SPA edits + per-endpoint role policy table) | ✅ 2026-05-04 | "Yes — architecture and policy look right, proceed" | No |
| **Validation 2 — JWT claim shape + 401 interceptor pattern** (5 claims, HS256 + JWT_SECRET, UserClaims dataclass, require_role factory, 401→logout interceptor with ?reason=expired) | ✅ 2026-05-04 | "Yes — lock the contract, generate BRAINSTORM doc" | No |

**Minimum Validations:** 2 ✅

---

## Suggested Requirements for /define

### Problem Statement (Draft)

The MKT WiFi platform's 16 admin endpoints in `backend/main.py` accept any HTTP request without validating authentication or authorization — the `Depends` injection on every admin handler is `get_session` (DB session injection) only, not `verify_token`. The `/api/auth/login` endpoint mints an opaque token (`base64(email)[:12] + token_hex(8)`) that no admin endpoint validates. This is a documented gap from slice-2's [Decision 8](../archive/ADMIN_SPA/DESIGN_ADMIN_SPA.md), explicitly punted to "the auth-hardening slice"; it is also a known **NFR-016 violation** ("role enforcement must be server-side"). Compounding this, the admin SPA has 2 outstanding `// TODO(auth-hardening-slice)` markers (in `client.ts` and `RoleGuard.tsx`) waiting for the backend to validate. Slice 3 closes both gaps in one cycle: introduces real JWT (python-jose, HS256, 7-day TTL, `sub`/`name`/`role`/`iat`/`exp` claims) + `Depends(verify_token)` on all 16 admin endpoints + per-endpoint `Depends(require_role([...]))` mirroring slice-2's RoleGuard policy + a 15 LoC SPA tweak that auto-logouts on 401. The captive-portal endpoints stay public by design (anonymous Wi-Fi guests).

### Target Users (Draft)

| User | Role | Pain Point |
|------|------|------------|
| **Operator (Administrador)** | Logs in to manage campaigns/devices/leads | Today, anyone with a network path to `:8000` can call `/api/campaigns` etc. without authentication. The admin SPA's role-gate is purely client-side (UX-only); a malicious actor with `curl` bypasses it entirely. |
| **Anunciante & Visualizador roles** | Self-service or read-only access | Same as above — server treats all requests as anonymous. The "role" in their JWT today is decorative. |
| **Future contributors building multi-tenant / R5 / audit-pipeline slices** | Need to extend auth | No `auth.py` module exists; nothing to import from. Each future slice would either re-implement auth or fight `main.py`'s mixed-concerns. |
| **Operator's Legal/DPO contact** | Reviews compliance posture | Slice-2 documented the auth gap explicitly. The DPO sees an admin panel with no actual access control on the backend — that's a finding in any audit. |
| **Admin SPA users on token expiry** | Currently see toast errors forever | With this slice, expiry → auto-logout → "Sua sessão expirou" notice on login page. |

### Success Criteria (Draft)

- [ ] All **16 admin endpoints** in `main.py` reject requests without a valid `Authorization: Bearer <token>` header — verified by `pytest` integration tests asserting **401** without token.
- [ ] All **write endpoints** (`POST/PATCH/DELETE /api/campaigns/*`, `POST /api/devices/{id}/refresh`, `PATCH /api/notifications/rules/{id}`) reject viewer/advertiser tokens — verified by integration tests asserting **403** with wrong-role token.
- [ ] All **read endpoints** with `verify_token` only (kpis, weekly, demographics, campaigns GET, reports GET) accept any of admin/advertiser/viewer tokens — verified by integration tests.
- [ ] `POST /api/auth/login` returns a real JWT decodable with `python-jose` containing exactly the 5 claims (`sub`, `name`, `role`, `iat`, `exp`) — verified by unit test.
- [ ] Token TTL is exactly **7 days** (`exp == iat + 604800`) — verified by unit test.
- [ ] Expired token (`exp` < now) is rejected with **401 `token_expired`** — verified by unit test using `vi.useFakeTimers`-equivalent for Python.
- [ ] Malformed token / wrong-signature token is rejected with **401 `invalid_token`**.
- [ ] Captive-portal endpoints (`/api/portal/*`, `/api/connect`, `/api/sessions/*`) **remain public** (no `Authorization` header required) — verified by an existing portal test continuing to pass.
- [ ] Admin SPA `client.ts` 401 interceptor calls `useAuthStore.logout()` and redirects to `/login?reason=expired` — verified by unit test.
- [ ] LoginPage reads `?reason=expired` and displays `STR.login.expired` — verified by manual QA + unit test.
- [ ] `tsc --noEmit` exits with 0 errors / 0 warnings (admin SPA delta).
- [ ] AT-015 PII grep continues to pass (no PII added to logs by JWT mint/verify).
- [ ] Both slice-2 `// TODO(auth-hardening-slice)` markers are **removed** from `mkt-wifi-admin/src/`.
- [ ] `JWT_SECRET` env var documented in `backend/README.md`; if unset at startup, backend logs `WARNING: JWT_SECRET unset — using random secret; all tokens invalidate on restart`.
- [ ] No backend regression: existing slice-1 portal tests (39) + slice-2 admin-SPA tests (20) continue to pass after this slice's changes.

### Constraints Identified

- **JWT TTL = 7 days** locked (Q2; matches current client-side TTL exactly).
- **JWT algorithm = HS256** locked (single-backend deployment).
- **JWT claims = exactly `sub`/`name`/`role`/`iat`/`exp`** (5 claims; no `iss`/`aud`/`jti`).
- **No password hashing this slice** — R5 is a separate slice; `/api/auth/login` continues to validate plaintext against `DEMO_ACCOUNTS`.
- **No refresh token endpoint** — 7-day TTL is the simple flow.
- **`auth.py` and `auth_routes.py` mirror slice-1's `portal_routes.py` extraction pattern** — convention is established.
- **Per-endpoint role policy mirrors slice-2 RoleGuard** with one tightening (Anunciante GET-only on campaigns; data-model-aware).
- **Captive-portal endpoints remain public** — non-negotiable.
- **Admin SPA changes are minimal** (~15 LoC across 3 files); no new dependencies; no architectural shift.

### Out of Scope (Confirmed)

- ❌ Refresh tokens / `/api/auth/refresh` endpoint
- ❌ Password hashing (R5 slice — bcrypt/argon2)
- ❌ Password complexity policy enforcement
- ❌ Account lockout / Captcha / 2FA / MFA
- ❌ Token revocation blocklist
- ❌ Multiple JWT algorithms (RS256)
- ❌ Key rotation
- ❌ `iss` / `aud` / `jti` JWT claims
- ❌ `/api/auth/me` endpoint
- ❌ Audit logging pipeline (NFR-015 — stub `log.warning(...)` only)
- ❌ CORS tightening (deployment concern)
- ❌ Email verification / self-signup
- ❌ Password reset (`/api/auth/forgot` + `/api/auth/reset`) — auth-recovery slice
- ❌ Multi-tenant `org_id` claim — multi-tenant slice
- ❌ Backend modernization (legacy Pydantic v1 `class Config:` in `Campaign` schema)
- ❌ Captive-portal endpoint authentication (intentionally public)

---

## Roadmap — How This Slice Connects to the Rest of the Platform

| Slice | Relationship | Notes |
|---|---|---|
| **Slice 1: Captive Portal** (shipped 2026-05-04) | Captive-portal endpoints stay public; this slice doesn't touch them | Verified by AT continuing to pass |
| **Slice 2: Admin SPA** (shipped 2026-05-04) | This slice closes the gap explicitly documented in slice-2's Decision 8 + Security § + 2 TODO markers. Admin SPA changes are 15 LoC across 3 files | The 2 `// TODO(auth-hardening-slice)` markers vanish in this slice's /build |
| **R5 (password hashing)** | This slice's `auth_routes.py` is the swap point — replace plaintext check with `passlib.bcrypt.verify` in one PR | Single-file change |
| **Multi-tenant foundation** | Adds `org_id` claim to JWT (additive, doesn't break this slice's contract); adds `Depends(verify_org_membership)` companion to `verify_token` | Reuses `auth.py` module |
| **Audit-pipeline (NFR-015)** | Consumes the `log.warning("auth_failed", ...)` stubs this slice plants in `auth.py` + `auth_routes.py` | Format already structured |
| **Auth-recovery (forgot password)** | New `/api/auth/forgot` + `/api/auth/reset` endpoints in `auth_routes.py` | Module is ready |

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 4 (3 discovery + 1 sample collection) |
| Approaches Explored | 3 (A selected, B + C rejected with reasons) |
| Features Removed (YAGNI) | 13 cuts/stubs |
| Validations Completed | 2 (architecture + JWT claim shape) — both ✅ |
| Spec Decisions Frozen | 11 (see "Key Decisions Made") |
| Estimated Slice Size | ~10 files (~700-1000 LoC including tests); **3-5 days** of focused work |
| Quality Gate | All 7 criteria met (≥3 questions ✅; sample collection asked ✅; ≥2 approaches ✅; YAGNI applied ✅; ≥2 validations ✅; user confirmed approach ✅; draft requirements included ✅) |

---

## Next Step

**Ready for:**
```
/define .claude/sdd/features/BRAINSTORM_AUTH_HARDENING.md
```

This will produce `.claude/sdd/features/DEFINE_AUTH_HARDENING.md` — formal requirements with acceptance criteria for each of the 16 admin endpoints + 3 role tiers + JWT mint/verify edge cases + the SPA 401 interceptor behavior, plus assumptions to validate during /design (python-jose version compatibility, exception class shape, `OAuth2PasswordBearer` vs `HTTPBearer` security scheme choice) and the test plan (~12-15 backend tests + 1-2 frontend unit tests).
