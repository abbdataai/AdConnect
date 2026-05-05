# DEFINE: AUTH_HARDENING

> Backend-focused slice closing the auth-token-not-validated gap (slice-2 Decision 8) + the NFR-016 server-side-role-enforcement gap. Real JWT (python-jose, HS256, 7-day TTL) + `Depends(verify_token)` + per-endpoint `Depends(require_role([...]))` on the 16 admin endpoints in `backend/main.py`. Plus a 15-LoC admin-SPA tweak for graceful 401 → auto-logout UX.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | AUTH_HARDENING |
| **Date** | 2026-05-04 |
| **Author** | define-agent (via /workflow:define) |
| **Status** | ✅ Shipped 2026-05-04 — archived |
| **Clarity Score** | 15/15 |
| **Source Input** | [BRAINSTORM_AUTH_HARDENING.md](BRAINSTORM_AUTH_HARDENING.md) — pre-validated, 4 questions answered, 11 decisions locked, 13 YAGNI cuts, 2 validations passed |

---

## Problem Statement

The MKT WiFi platform's **16 admin endpoints** in `backend/main.py` accept any HTTP request without validating authentication or authorization — every admin handler's `Depends` injection is `get_session` (DB session) only, never `verify_token`. The `/api/auth/login` endpoint mints an opaque token (`base64(email)[:12] + token_hex(8)` at [main.py:299](../../../backend/main.py#L299)) that no admin endpoint validates. **Anyone with network access to `:8000` can call `/api/campaigns`, `/api/users`, `/api/devices/{id}/refresh` etc. with `curl` and bypass the admin SPA's role-gate entirely** — that role-gate is purely client-side per slice-2's [Decision 8](../archive/ADMIN_SPA/DESIGN_ADMIN_SPA.md). NFR-016 ("role enforcement must be server-side") is **not met**. The admin SPA has 2 outstanding `// TODO(auth-hardening-slice)` markers ([client.ts:10](../../../mkt-wifi-admin/src/api/client.ts#L10) + [RoleGuard.tsx:11](../../../mkt-wifi-admin/src/ui/RoleGuard.tsx#L11)) waiting for the backend to validate. Slice 3 closes both gaps in one cycle: real JWT (python-jose, HS256, 7-day TTL, 5 claims) + `Depends(verify_token)` on all 16 admin endpoints + per-endpoint `Depends(require_role([...]))` mirroring slice-2's RoleGuard policy with one data-model-aware tightening (Anunciante GET-only on campaigns since `Campaign.owner_id` doesn't exist yet) + 15 LoC SPA tweak that auto-logouts on 401. Captive-portal endpoints (`/api/portal/*`, `/api/connect`, `/api/sessions/*`) **stay public by design** (anonymous Wi-Fi guests).

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| **Operator (Administrador)** | Logs into the admin SPA to manage campaigns/devices/leads/monetization | Today, anyone with network access to `:8000` can call admin endpoints without auth. The SPA's role-gate is client-side UX only; a malicious actor with `curl` bypasses entirely. Reputational + LGPD risk. |
| **Anunciante (Advertiser) + Visualizador (Viewer)** | Self-service or read-only access | Server treats all requests as anonymous. The "role" claimed in slice-2's opaque token is decorative. Same exposure as Administrador. |
| **Future contributors** building **multi-tenant**, **R5 (password hashing)**, **audit-pipeline (NFR-015)**, or **auth-recovery (forgot password)** slices | Need to extend authn/authz | No `auth.py` module exists today; nothing to import from. Without this slice, each future slice would either re-implement auth or fight `main.py`'s mixed-concerns. |
| **Operator's Legal/DPO contact** | Reviews compliance posture | Slice-2's BUILD_REPORT explicitly documented the auth gap. The DPO sees an admin panel with no actual access control on the backend — that's a finding in any LGPD audit. |
| **Admin SPA users on token expiry** | Operators who left a tab open >7 days | Currently see toast errors forever (slice-2's `client.ts` throws `ApiError(401, ...)` with no special handling). With this slice: expiry → auto-logout → "Sua sessão expirou" notice on login page. |
| **/docs Swagger UI users** | Developers / integration partners testing endpoints | Today they can hit any admin endpoint without auth — Swagger doesn't show a lock icon because none is required. With this slice: lock icon on every admin endpoint; "Authorize" button reveals the JWT input. |

---

## Goals

What success looks like (prioritized):

| Priority | Goal |
|----------|------|
| **MUST** | Add `Depends(verify_token)` (or `Depends(require_role([...]))`) to all 16 admin endpoints in `backend/main.py` |
| **MUST** | Replace the opaque token in `/api/auth/login` with a real JWT (HS256, 5 claims: `sub`/`name`/`role`/`iat`/`exp`, 7-day TTL) |
| **MUST** | Implement `verify_token` and `require_role(allowed)` as FastAPI dependencies in a new `backend/auth.py` module |
| **MUST** | Promote `/api/auth/login` and `/api/auth/logout` from `main.py` to a new `backend/auth_routes.py` (APIRouter pattern, mirrors slice-1's `portal_routes.py`) |
| **MUST** | Per-endpoint role policy mirroring slice-2 RoleGuard with one tightening (Anunciante GET-only on `/api/campaigns`; no `Campaign.owner_id` to scope writes) |
| **MUST** | Captive-portal endpoints (`/api/portal/*`, `/api/connect`, `/api/sessions/*`) **remain public** — verified by slice-1's existing tests continuing to pass |
| **MUST** | Admin SPA `client.ts` 401-interceptor: on 401, call `useAuthStore.logout()` and redirect to `/login?reason=expired` |
| **MUST** | Both slice-2 `// TODO(auth-hardening-slice)` markers **removed** from `mkt-wifi-admin/src/` |
| **MUST** | `JWT_SECRET` env var loading; if unset, generate random 32-byte secret at startup with `WARNING: JWT_SECRET unset…` log |
| **SHOULD** | Pytest coverage ≥ 80% on `backend/auth.py` and `backend/auth_routes.py` |
| **SHOULD** | LoginPage reads `?reason=expired` and renders the existing (slice-2-shipped-but-unused) `STR.login.expired` notice above the form |
| **SHOULD** | `tsc --noEmit` exits with 0 errors / 0 warnings on `mkt-wifi-admin/` after the SPA delta |
| **SHOULD** | Existing slice-1 backend tests (39) + slice-2 frontend unit tests (20) all continue to pass — **no regression** |
| **SHOULD** | AT-015 PII grep continues to pass (no JWT or password tokens accidentally logged) |
| **SHOULD** | `backend/README.md` documents `JWT_SECRET` env var with a "production: set this; rotate on incident" note |
| **COULD** | Stub structured `log.warning("auth_failed", extra={...})` calls at every authn/authz failure path — future audit-pipeline slice consumes |
| **COULD** | The 401 interceptor preserves the current path as `?next=...` so post-login lands the user back where the token expired |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

Measurable outcomes (numeric and testable):

- [ ] All **16 admin endpoints** reject requests without `Authorization: Bearer <token>` header — verified by pytest integration tests asserting **HTTP 401** without token.
- [ ] All **5 write endpoints** (`POST /api/campaigns`, `PATCH /api/campaigns/{id}`, `DELETE /api/campaigns/{id}`, `POST /api/devices/{id}/refresh`, `PATCH /api/notifications/rules/{id}`) reject `viewer` and `advertiser` tokens with **HTTP 403 `forbidden`** — verified by pytest.
- [ ] All **6 read-all endpoints** (`/api/kpis`, `/api/connections/weekly`, `/api/demographics`, `/api/campaigns` GET, `/api/reports`) accept any of the 3 role tokens with **HTTP 200** — verified by pytest.
- [ ] All **5 read-admin-and-viewer endpoints** (`/api/users`, `/api/users/live`, `/api/devices`, `/api/notifications/rules`, `/api/notifications/groups`) accept admin+viewer (200) and reject advertiser (403) — verified by pytest.
- [ ] **1 admin-only read endpoint** (`/api/monetization`) accepts admin only — verified by pytest.
- [ ] `POST /api/auth/login` returns a JWT decodable with `python-jose` whose `claims == {sub, name, role, iat, exp}` — exactly 5 keys, no extras — verified by unit test using `jose.jwt.decode(token, secret, algorithms=["HS256"])`.
- [ ] Token TTL is exactly **604800 seconds (7 days)**: `exp - iat == 604800` — verified by unit test.
- [ ] Token with `exp < now` rejected with **HTTP 401** + body `{"detail": "token_expired"}` — verified by pytest using `jose.jwt.encode` with backdated `exp`.
- [ ] Malformed token / wrong-signature token rejected with **HTTP 401** + body `{"detail": "invalid_token"}` — verified by pytest.
- [ ] Token without `role` claim or with `role` ∉ `{"admin","advertiser","viewer"}` rejected with **HTTP 401** + body `{"detail": "invalid_token"}` — verified by pytest.
- [ ] Captive-portal endpoints **return the same responses as before** without `Authorization` header — verified by slice-1's existing 39 tests continuing to pass unchanged.
- [ ] Admin SPA `client.ts` 401-interceptor calls `useAuthStore.logout()` and `window.location.href = "/login?reason=expired"` — verified by vitest unit test using a mocked `fetch` returning 401.
- [ ] LoginPage renders `STR.login.expired` ("Sua sessão expirou. Entre novamente.") when URL is `/login?reason=expired` — verified by Playwright spec or vitest with React Testing Library (whichever is in scope per /design).
- [ ] **0** matches for `/// TODO\(auth-hardening-slice\)/` in `mkt-wifi-admin/src/` — verified by `grep -rn`.
- [ ] **0** new matches for forbidden field identifiers (AT-015 grep continues to pass) — verified by `bash backend/scripts/grep_pii_check.sh`.
- [ ] **0** matches for raw token string substrings in any backend log statement — verified by `grep -rE 'log\.(info|warning|error)\(.*token[^_]' backend/auth*.py` returning 0 lines.
- [ ] `tsc --noEmit` in `mkt-wifi-admin/` exits with **0 errors / 0 warnings**.
- [ ] **All 39 slice-1 backend tests + all 20 slice-2 frontend unit tests pass** after this slice's changes — verified by running the existing test suites.
- [ ] Backend startup with `JWT_SECRET` unset emits exactly one `WARNING` log line containing the substring `JWT_SECRET unset` — verified by integration test capturing log output.
- [ ] FastAPI Swagger UI at `/docs` shows a lock icon (or padlock annotation) on every admin endpoint — verified manually + by checking `/openapi.json` for `security: [{Bearer: []}]` entries.

---

## Acceptance Tests

> **20 ATs grouped into 6 categories:** token mechanics (5), per-endpoint role gating (5 categorical), captive-portal regression (1), SPA-side 401 handling (3), compatibility (3), and observability/security invariants (3).

### Category A — Token mechanics (AT-001 .. AT-005)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-001** | Login returns valid JWT with 5 claims | Backend running with valid `JWT_SECRET` | `POST /api/auth/login` with `{email: "admin@mktwifi.com", password: "admin123"}` | Response is 200; body contains `token` (string); `jose.jwt.decode(token, JWT_SECRET, algorithms=["HS256"])` returns dict with **exactly** keys `{sub, name, role, iat, exp}`; `sub == "admin@mktwifi.com"`; `role == "admin"`; `exp - iat == 604800`. |
| **AT-002** | Wrong password returns ok:false (no JWT minted) | Same backend | `POST /api/auth/login` with `password: "wrong"` | Response is 200 (existing convention) with body `{ok: false, message: "Email ou senha incorretos."}`; no `token` field; **no** JWT minted. |
| **AT-003** | Expired token rejected | Backend with valid secret; mint a token with `exp` set 1 second in the past | `GET /api/kpis` with `Authorization: Bearer <expired-token>` | Response is **401**; body is `{"detail": "token_expired"}`. |
| **AT-004** | Malformed / wrong-signature token rejected | Backend with valid secret; submit a syntactically-malformed token OR a token signed with a different secret | `GET /api/kpis` with `Authorization: Bearer <malformed>` | Response is **401**; body is `{"detail": "invalid_token"}`. |
| **AT-005** | Missing required claim rejected | Mint a token whose claims dict omits `role` (or has `role: "godmode"` not in the Literal set) | `GET /api/kpis` with that token | Response is **401**; body is `{"detail": "invalid_token"}`. |

### Category B — Per-endpoint role gating (AT-006 .. AT-010)

> Each AT is a single parameterized pytest covering an entire group of endpoints, not a single endpoint.

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-006** | Read-all endpoints accept all 3 role tokens | Tokens minted for admin, advertiser, viewer | `GET /api/kpis`, `/api/connections/weekly`, `/api/demographics`, `/api/campaigns`, `/api/reports` (5 endpoints × 3 roles) | All 15 calls return **200** (or appropriate 2xx). |
| **AT-007** | Read-admin-and-viewer endpoints accept admin+viewer, reject advertiser | Same 3 tokens | `GET /api/users`, `/api/users/live`, `/api/devices`, `/api/notifications/rules`, `/api/notifications/groups` (5 endpoints × 3 roles) | admin → 200; viewer → 200; **advertiser → 403** for all 5 endpoints (15 total assertions). |
| **AT-008** | Admin-only read accepts admin, rejects advertiser+viewer | Same 3 tokens | `GET /api/monetization` × 3 roles | admin → 200; advertiser → 403; viewer → 403. |
| **AT-009** | Write endpoints accept admin only | Same 3 tokens | `POST /api/campaigns`, `PATCH /api/campaigns/{id}`, `DELETE /api/campaigns/{id}`, `POST /api/devices/{id}/refresh`, `PATCH /api/notifications/rules/{id}` (5 endpoints × 3 roles) | admin → 200/201/204; advertiser → **403**; viewer → **403** (15 total assertions). |
| **AT-010** | Missing `Authorization` header on any admin endpoint → 401 | Backend with valid secret | `GET /api/kpis` (or any of the 16) **without** Authorization header | Response is **401**; `WWW-Authenticate: Bearer` header present (HTTP standard). |

### Category C — Captive-portal regression guard (AT-011)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-011** | Captive-portal endpoints remain public | Backend running this slice's auth | `GET /api/portal/bootstrap?...`, `POST /api/connect` (with valid body), `POST /api/sessions/{id}/ad-complete`, `POST /api/sessions/{id}/renew` — **all without Authorization header** | All return their expected slice-1 status codes (200/201/200/200). **No 401, no 403**. Equivalent to: `pytest backend/tests/test_portal_routes.py` continues to pass unchanged. |

### Category D — SPA-side 401 handling (AT-012 .. AT-014)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-012** | 401 interceptor calls logout + redirects | Admin SPA logged in; `useAuthStore.user` is non-null | A `client.get("/api/anything")` call returns 401 (mocked) | `useAuthStore.getState().user === null` (logout fired); `window.location.href === "/login?reason=expired"` (or matching `?next=...&reason=expired` per /design's choice on COULD goal). |
| **AT-013** | LoginPage renders expired notice on `?reason=expired` | Browser at `/login?reason=expired` | Page renders | The text `"Sua sessão expirou. Entre novamente."` is in the DOM (matches `STR.login.expired` exactly). |
| **AT-014** | TODO markers removed | Source tree of `mkt-wifi-admin/` | `grep -rn "TODO(auth-hardening-slice)" mkt-wifi-admin/src` | **0 matches** (both slice-2 markers removed by /build). |

### Category E — Compatibility & non-regression (AT-015 .. AT-017)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-015** | Slice-1 backend tests pass unchanged | All slice-1 portal test files | `cd backend && pytest tests/test_portal_*.py tests/test_main_integration.py tests/test_openapi_contract.py` | All **39 tests pass** (no regression from this slice's `main.py` edits). |
| **AT-016** | Slice-2 frontend unit tests pass unchanged | All slice-2 vitest test files | `cd mkt-wifi-admin && npx vitest run` | All **20 tests pass** (no regression from `client.ts` 401 interceptor or `LoginPage.tsx` query-param handling). |
| **AT-017** | TypeScript strict pass | `mkt-wifi-admin/` after the SPA delta | `npx tsc --noEmit` | Exit code 0; 0 errors / 0 warnings. |

### Category F — Observability & security invariants (AT-018 .. AT-020)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-018** | No raw token in backend logs | Source tree of `backend/auth*.py` | `grep -rE '\.(info\|warning\|error)\(.*\btoken\b[^_]' backend/auth*.py` (excludes `token_*` identifiers like `token_hex`) | **0 matches**. The slice's auth code may log `event_type="auth_failed"` or `mac_hash_prefix`-style 8-char prefixes, but never the raw JWT string. |
| **AT-019** | AT-015 PII grep continues to pass after slice ships | Full source tree | `bash backend/scripts/grep_pii_check.sh` | Exit 0: "AT-015 OK: 0 matches across N target(s)". The slice adds **no** new files under `mkt-wifi-admin/src/` or `backend/portal_routes.py` etc., so the per-scope policy continues to hold. |
| **AT-020** | Random-secret startup warning fires when `JWT_SECRET` unset | Backend launched with `JWT_SECRET` unset (deleted from env) | uvicorn boots normally | A WARNING log line contains the substring `"JWT_SECRET unset"`; backend continues to function (using random in-memory secret); tokens minted in this run will be invalid after restart. |

**20 ATs total**: 5 token-mechanics + 5 categorical role-gating (collapsing 16×3 = 48 raw cases into 5 parameterized tests) + 1 captive-portal regression + 3 SPA-side + 3 compat + 3 invariants.

---

## Out of Scope

Explicitly NOT included in this feature (re-stating from BRAINSTORM and adding ATR-derived items):

- ❌ **Refresh tokens / `/api/auth/refresh` endpoint** — 7-day TTL is the simple flow; future slice tightens.
- ❌ **Bcrypt/argon2 password hashing** — R5 is a separate slice; `auth_routes.py` is the swap point.
- ❌ **Password complexity policy enforcement** — R5 territory.
- ❌ **Account lockout / Captcha / 2FA / MFA** — security-hardening v2.
- ❌ **Token revocation blocklist** — 7-day TTL is the de facto revocation; YAGNI.
- ❌ **Multiple JWT algorithms (RS256, ES256)** — single-backend deployment; HS256 sufficient.
- ❌ **Key rotation / `kid` claim** — single static secret per deployment.
- ❌ **`iss` / `aud` / `jti` JWT claims** — YAGNI for single-tenant single-deployment.
- ❌ **`/api/auth/me` endpoint** — login response already contains `user`; SPA stores in Zustand.
- ❌ **Audit logging pipeline (NFR-015)** — stub `log.warning("auth_failed", ...)` only.
- ❌ **CORS tightening (`allow_origins=["*"]` → specific origins)** — deployment concern.
- ❌ **Email verification / self-signup** — multi-tenant onboarding slice.
- ❌ **Password reset (`/api/auth/forgot` + `/api/auth/reset`)** — auth-recovery slice.
- ❌ **Multi-tenant `org_id` claim** — multi-tenant slice; `auth.py` accepts an additive claim later.
- ❌ **Backend modernization** (legacy Pydantic v1 `class Config:` in `Campaign` schema) — separate `/iterate`.
- ❌ **Captive-portal endpoint authentication** — public by design (anonymous Wi-Fi guests).
- ❌ **Server-side `Authorization` header logging** — token in logs = security antipattern.
- ❌ **Per-route response-header annotations** (`X-RateLimit-*`, `X-Auth-User-Role`, etc.) — not requested; not part of OpenAPI contract.
- ❌ **Cookie-based auth fallback** — header-only; OQ-3 default below.
- ❌ **Replacing the existing `expires_at` Wi-Fi-session field with JWT mechanics** — captive-portal sessions are a different concept (Wi-Fi access TTL, MikroTik authorize); this slice doesn't touch them.

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| **Library** | `python-jose[cryptography]>=3.3` (latest stable: 3.5.0) — added to `requirements.txt` | New dep; `[cryptography]` extra pulls in `cryptography` for HS256 signing. |
| **Algorithm** | HS256 with shared `JWT_SECRET` env var; if unset, random 32-byte at startup + WARNING | Single-backend deployment; sufficient cryptographic strength; future slice rotates / migrates to KMS. |
| **TTL** | Exactly 7 days (604800 seconds) — locked Q2 | Parity with current client-side TTL in `stores/auth.ts:isExpired()`. |
| **Claims** | `sub` (email), `name`, `role` (Literal), `iat`, `exp` — exactly 5; no `iss`/`aud`/`jti` | Minimal-but-sufficient; additive expansion (e.g., `org_id`) by future slices doesn't break this contract. |
| **Module shape** | New `backend/auth.py` + `backend/auth_routes.py` mirroring slice-1's `portal_routes.py` extraction pattern | Idiomatic FastAPI; reusable across future slices; Swagger UI shows auth requirement. |
| **No backend role check in middleware** | `Depends(verify_token)` and `Depends(require_role([...]))` are per-endpoint dependencies, not middleware | Idiomatic FastAPI; Swagger-visible; brittle public-allowlist anti-pattern avoided. |
| **No password hashing this slice** | `/api/auth/login` continues to validate plaintext against `DEMO_ACCOUNTS` | R5 is a separate slice; concerns are different (token mechanics vs credential storage). |
| **No refresh token endpoint** | Operators re-authenticate every 7 days | Acceptable parity with current behavior; tightening is a future iterate. |
| **Captive-portal endpoints remain public** | `/api/portal/*`, `/api/connect`, `/api/sessions/*` — no `Depends(verify_token)` | Anonymous Wi-Fi guests; non-negotiable. |
| **Per-endpoint role policy mirrors slice-2 RoleGuard** with one tightening | Anunciante GET-only on `/api/campaigns` (no `Campaign.owner_id` to scope writes by) | Multi-tenant slice introduces `owner_id` and re-tightens. |
| **Admin SPA changes are minimal** | ~15 LoC across 3 files: `client.ts`, `RoleGuard.tsx`, `LoginPage.tsx` | No new dependencies; no architectural shift in the SPA. |
| **No regression** | Existing 39 backend tests + 20 frontend tests must continue to pass | Verified by AT-015, AT-016 above. |
| **AT-015 PII grep continues to hold** | The slice adds no PII identifiers and no PII-leaking log statements | Verified by AT-019 + the existing CI script (no rewrites needed beyond what slice-2 already shipped). |
| **Standards-compliant HTTP responses** | 401 for authn failures (with `WWW-Authenticate: Bearer` header), 403 for authz failures | Allows the SPA's 401-interceptor to handle all auth failures uniformly while leaving room for separate 403 UX (e.g., "your role can't do this") in a future slice. |

---

## Technical Context

> Essential context for /design.

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location (backend new)** | NEW `backend/auth.py`, NEW `backend/auth_routes.py`, NEW `backend/tests/test_auth.py`, NEW `backend/tests/test_auth_integration.py` | Mirrors slice-1's `portal_routes.py` + `tests/test_portal_*.py` extraction. |
| **Backend modifications** | `backend/main.py` (delete legacy login/logout/DEMO_ACCOUNTS; `app.include_router(auth_router)`; add `Depends(...)` to 16 admin endpoints), `backend/requirements.txt` (add `python-jose[cryptography]`), `backend/README.md` (JWT_SECRET section) | 16 mechanical signature edits in main.py; ~3 surgical edits to other files. |
| **Frontend modifications (admin SPA only)** | `mkt-wifi-admin/src/api/client.ts` (+10 LoC interceptor), `mkt-wifi-admin/src/ui/RoleGuard.tsx` (-1 line: remove TODO comment), `mkt-wifi-admin/src/sections/login/LoginPage.tsx` (+5 LoC: read `?reason=expired`, render `STR.login.expired`) | Total SPA delta: ~15 LoC across 3 files. No new files in mkt-wifi-admin/. |
| **Untouched** | `captive-portal-frontend/`, `backend/portal_routes.py`, `backend/schemas/portal.py`, `backend/fixtures/portal_fixtures.py`, all of `mkt-wifi-frontend/` | Captive-portal endpoints stay public; legacy folder stays as visual reference. |
| **KB Domains** | FastAPI security utilities (`fastapi.security.HTTPBearer` or `OAuth2PasswordBearer`), Pydantic v2 (existing slice-1 patterns), pytest + httpx.AsyncClient (existing test patterns) | All existing in repo. |
| **IaC Impact** | None this slice | No new infrastructure. Production deployers must set `JWT_SECRET` env var via existing deploy mechanism (out of scope here). |
| **Build & dev** | `cd backend && uvicorn main:app --reload --port 8000` (single worker — preserves slice-1 in-memory portal sessions). `JWT_SECRET=dev-only-secret` for stable token testing across restarts. | Same dev command as slice 1; just add the env var. |
| **Test runners** | Backend: `pytest` (with the existing slice-1 fixtures + new `test_auth.py` and `test_auth_integration.py`). Frontend: `vitest` (with the existing slice-2 setup + new test for the 401 interceptor). | No new test infrastructure. |
| **Library to add** | `python-jose[cryptography]>=3.3,<4` (latest stable: 3.5.0) | The `[cryptography]` extra pulls in the C-backed `cryptography` lib for fast HS256 sign/verify. |
| **Logger names** | `log = logging.getLogger("auth")` in `auth.py` (parallel to slice-1's `log = logging.getLogger("portal")`) | Future audit-pipeline slice can grep events by logger name. |

**Why This Matters:**

- **`auth.py` becomes the integration surface for 4 future slices** — multi-tenant (`org_id` claim), R5 (bcrypt swap), audit-pipeline (`auth_failed` event consumption), auth-recovery (forgot/reset endpoints in `auth_routes.py`). Each future slice extends a single module rather than fighting `main.py`.
- **The 16-endpoint signature edits in main.py are mechanical but spread out** — each gets one new `_: UserClaims = Depends(require_role([...]))` parameter. The /design's file manifest will show every edit; /build executes them in one pass.
- **The SPA delta is forward-compatible with the COULD goal of `?next=...` preservation** — `client.ts`'s 401 interceptor can either redirect to `/login?reason=expired` (MUST) or `/login?reason=expired&next=<path>` (COULD). LoginPage already has slice-2's `?next=...` handling; reusing it is one line.

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| **A-001** | `python-jose[cryptography]>=3.3` is compatible with Python 3.12 + FastAPI 0.110 | If the `[cryptography]` extra fails to install (the Mac native build is occasionally slow), fall back to `python-jose>=3.3` without the extra (uses the pure-Python `pycryptodome` backend; slower but functional). | [x] Latest is 3.5.0 (verified via `pip index versions`); 3.3.x has been stable since 2023 |
| **A-002** | `fastapi.security.HTTPBearer` is the right security scheme for Swagger UI integration | Alternative: `OAuth2PasswordBearer` (more "OAuth-y", shows a proper login form in Swagger) vs `HTTPBearer` (simpler, just a "Authorize" button accepting raw JWT). For an admin panel without OAuth, `HTTPBearer` is the right call — but `OAuth2PasswordBearer` shows a more polished Swagger UX. | [ ] /design picks; default `HTTPBearer` |
| **A-003** | `python-jose` exception types are `jose.exceptions.ExpiredSignatureError` and `jose.exceptions.JWTError` | These have been stable since 3.0; library docs confirm. | [x] Library docs confirm |
| **A-004** | `DEMO_ACCOUNTS` plaintext-password validation in `/api/auth/login` is acceptable for this slice | R5 is the slice that fixes this. If Legal/Security blocks shipping with plaintext passwords, R5 must run before this slice. **Risk:** unlikely — slice-1 + slice-2 both shipped with this same posture. | [x] Confirmed by slice-1 and slice-2 shipping with this posture |
| **A-005** | The random-secret-on-startup warning is sufficient ops feedback when `JWT_SECRET` is unset | If a production deployer ignores log output, they'll deploy with a random secret that invalidates all tokens on every restart. Operationally annoying but not insecure (the secret is still random and per-process). | [ ] /design may choose to also fail-fast in production mode (e.g., refuse to start if `ENVIRONMENT=production` and `JWT_SECRET` unset) |
| **A-006** | Slice-1 portal tests don't transitively call admin endpoints | Verified by inspection: portal tests only hit `/api/portal/*` and `/api/connect`. **Confirmed.** | [x] Confirmed via `grep -E "client\.(get\|post)" backend/tests/test_portal_*.py` |
| **A-007** | Slice-2 frontend unit tests don't fire 401 responses | The 5 tests use mocked `useAuthStore.setState(...)` directly; they don't make real fetch calls. **Confirmed by inspection** of `tests/unit/stores/auth.test.ts`. | [x] Confirmed |
| **A-008** | python-jose's `decode()` automatically validates `exp` and raises `ExpiredSignatureError` | Library default behavior; can be disabled via `options={"verify_exp": False}` but we don't disable. | [x] Confirmed in library docs |
| **A-009** | Vite's dev proxy (`/api → :8000` configured in `mkt-wifi-admin/vite.config.ts`) forwards `Authorization` headers without stripping | Standard HTTP-proxy behavior. If Vite stripped `Authorization`, slice-2 would have shipped with an even bigger gap. | [x] Implicit in slice-2's design (header is sent — never validated, but proxy works) |
| **A-010** | HS256 + 32-byte `JWT_SECRET` is sufficient cryptographic strength for this threat model | NIST recommends ≥256 bits for HMAC-SHA256 keys. 32 bytes = 256 bits. Sufficient. RS256 + key pairs would be stronger but premature. | [x] Cryptographic analysis straightforward |
| **A-011** | The admin SPA's 401-interceptor change in `client.ts` doesn't break TanStack Query's retry behavior | TanStack Query has its own retry config (`defaultOptions.queries.retry: 1` in slice-2's `main.tsx`). On 401, our interceptor logs out + redirects, so the page unmounts before any retry fires. **Confirmed by inspection.** | [x] Confirmed |

**Note:** A-002 + A-005 are the only "to verify in /design" items. Everything else is solid.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| **Problem** | **3** | One specific pain (16 admin endpoints unauthenticated) + structural pain (2 outstanding TODO markers) + named-source (slice-2 Decision 8); concrete consequences (DPO finding, curl bypass). |
| **Users** | **3** | 6 personas with explicit pain points; spans operator + 2 sub-roles + future devs + DPO + Swagger users. |
| **Goals** | **3** | 9 MUSTs, 6 SHOULDs, 2 COULDs; all backed by FR-IDs / NFR-IDs / decision references. |
| **Success** | **3** | 19 measurable criteria with explicit numbers (16 endpoints, 5 write/6 read-all/5 read-admin-viewer/1 admin-only, 5 claims, 604800 s, HTTP status codes, 0 errors, 0 grep matches, 39+20 regression count). |
| **Scope** | **3** | 21 explicit out-of-scope items + 14 typed constraints + roadmap of slice dependencies in BRAINSTORM (preserved); 13 YAGNI cuts inherited. |
| **Total** | **15/15** | Exceeds 12 minimum; ready for Design. |

**Minimum to proceed: 12/15** ✅

---

## Open Questions

These do not block `/design`; each has a sensible default that /design either accepts or overrides.

| # | Question | Owner | Default if unanswered |
|---|----------|-------|-----------------------|
| **OQ-1** | `HTTPBearer` vs `OAuth2PasswordBearer` security scheme for Swagger UI? | tech-lead | **`HTTPBearer`** — simpler "Authorize" button accepting raw JWT in Swagger. `OAuth2PasswordBearer` would integrate the login form but is overkill for an admin panel without OAuth flow. |
| **OQ-2** | When `JWT_SECRET` is unset and `ENVIRONMENT=production`, should the backend refuse to start (fail-fast)? | security + tech-lead | **Yes — fail-fast in production.** Read `ENVIRONMENT` env var; if set to `production` or `prod` AND `JWT_SECRET` unset, raise `RuntimeError` at startup. Otherwise (dev/test), random + WARNING log per A-005. Two extra lines of code; significantly safer in production. |
| **OQ-3** | Should `verify_token` accept the token from a cookie as fallback? | tech-lead | **No — header only.** Cookie-based auth requires CSRF mitigation; we have neither the threat model nor the budget for it this slice. |
| **OQ-4** | Logger name for auth events? | observability-lead | **`logging.getLogger("auth")`** — parallel to slice-1's `"portal"` logger. Future audit slice can grep by logger name. |
| **OQ-5** | Should the 401 interceptor preserve `?next=<current-path>` for post-login redirect? (COULD goal) | tech-lead | **Yes — preserve.** Slice-2's `<AuthGate>` already implements `?next=...` for unauthenticated initial loads. Reusing the same redirect target is one extra line in `client.ts`. Better UX. |
| **OQ-6** | Should LoginPage's expired notice clear after first input change? | product | **Yes — clear on input change.** Standard form UX: stale notice disappears once the user starts typing. Matches HTML `<form>` validation conventions. |
| **OQ-7** | Should `backend/README.md` include a JWT_SECRET rotation note (production runbook)? | devops | **Yes — one-paragraph note**: "Rotating JWT_SECRET invalidates all in-flight tokens, forcing operators to re-login. Acceptable during scheduled maintenance; for incident-response key rotation, this is the intended behavior." |
| **OQ-8** | Should the slice ship a `tests/contract/openapi_security.test.ts` extending slice-2's contract test to assert every admin endpoint has `security: [{Bearer: []}]` in `/openapi.json`? | tech-lead | **Yes — small addition** (~30 LoC). Catches drift if a future slice adds an endpoint without auth. |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-04 | define-agent | Initial version. Extracted from `BRAINSTORM_AUTH_HARDENING.md` (4 questions, 11 decisions, 13 YAGNI cuts, 2 validations passed). 15/15 clarity. **20 acceptance tests** grouped into 6 categories (token mechanics, role gating, regression guards, SPA-side, compatibility, observability invariants). **11 assumptions** (8 already validated; 3 deferred for /design — `HTTPBearer` vs `OAuth2PasswordBearer`, fail-fast posture, observability logger). **8 open questions** with defaults — none blocking. Pre-write inspection confirmed `python-jose 3.5.0` available; slice-1 backend has 39 tests + slice-2 admin SPA has 20 unit tests; both must pass after this slice's edits (regression guard via AT-015 + AT-016). |

---

## Next Step

**Ready for:**
```
/design .claude/sdd/features/DEFINE_AUTH_HARDENING.md
```

This will produce `.claude/sdd/features/DESIGN_AUTH_HARDENING.md` — the implementation plan turning these requirements into:
- File-by-file build order across `backend/auth.py`, `backend/auth_routes.py`, `backend/main.py` edits, `backend/requirements.txt`, `backend/README.md`, the 3 SPA file edits, and 2 new test files (~10 files total)
- Decision records: `HTTPBearer` vs `OAuth2PasswordBearer`, fail-fast-in-prod posture, exact JWT mint/decode signatures, exception-handling at the FastAPI layer
- Code patterns: `auth.py` skeleton (mint + verify + dependencies + exceptions), `auth_routes.py` skeleton (login/logout endpoints + `LoginRequest`/`LoginResponse` Pydantic), the per-endpoint signature edit pattern in `main.py`, the SPA 401-interceptor pattern
- Test plan implementing AT-001..AT-020
- Resolution of OQ-1..OQ-8
- Validation of A-002 + A-005 against the existing repo state
- Pre-build repo inspection (slice-1/2 lesson) — sniff for any latent issue in `main.py` that would surprise the build (e.g., missing imports, unused symbols after the edits)
