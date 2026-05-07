# DESIGN: AUTH_HARDENING

> Technical design for slice 3 — closes the slice-2 Decision 8 auth gap + the NFR-016 server-side-role-enforcement gap. Real JWT (python-jose 3.5.0, HS256, 7-day TTL, 5 claims) + per-endpoint `Depends(verify_token)` / `Depends(require_role([...]))` on the 16 admin endpoints + a 15-LoC admin-SPA tweak for graceful 401 → auto-logout. Backend-heavy; mirrors slice-1's `portal_routes.py` extraction pattern.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | AUTH_HARDENING |
| **Date** | 2026-05-04 |
| **Author** | design-agent (via /workflow:design) |
| **DEFINE** | [DEFINE_AUTH_HARDENING.md](DEFINE_AUTH_HARDENING.md) (15/15 clarity, 20 ATs) |
| **BRAINSTORM** | [BRAINSTORM_AUTH_HARDENING.md](BRAINSTORM_AUTH_HARDENING.md) |
| **Slice 1 reference (recipe)** | [archive/CAPTIVE_PORTAL/DESIGN_CAPTIVE_PORTAL.md](../archive/CAPTIVE_PORTAL/DESIGN_CAPTIVE_PORTAL.md) — `portal_routes.py` extraction pattern + `conftest.py` fixtures + AT-015 grep |
| **Slice 2 reference (consumer)** | [archive/ADMIN_SPA/DESIGN_ADMIN_SPA.md](../archive/ADMIN_SPA/DESIGN_ADMIN_SPA.md) Decision 8 — the gap this slice closes; `client.ts:10` + `RoleGuard.tsx:11` TODO markers |
| **Status** | ✅ Shipped 2026-05-04 — archived |

---

## Pre-Design Repo Inspection (Assumption Validation)

Per slice-1/2 lesson learned, this is the highest-leverage step. Findings drive the file manifest and ADRs.

| Item | Finding | Disposition |
|------|---------|-------------|
| **A-001** python-jose availability | Latest stable: **3.5.0**; `pip index versions` confirms; `[cryptography]` extra resolves at install. Not yet in `requirements.txt`. | **Locked: `python-jose[cryptography]>=3.3,<4`** in Decision 5 |
| **A-002** `HTTPBearer` vs `OAuth2PasswordBearer` | The existing `/api/auth/login` accepts a Pydantic JSON body (`body: LoginRequest`), NOT OAuth2 form-encoded (`username` + `password`). `OAuth2PasswordBearer`'s Swagger "Authorize" button submits a form to the configured `tokenUrl` — would produce **422 Unprocessable Entity** on every Swagger-driven login attempt. | **Locked: `HTTPBearer`** in Decision 1 |
| **A-005** Production fail-fast posture | Pre-design discussion confirmed the random-secret-warning approach is operationally risky if deployers ignore log output. Adding ~3 lines for `ENVIRONMENT=production` fail-fast eliminates the silent-misconfig footgun. | **Locked: fail-fast in production** in Decision 6 |
| **A-006** Slice-1 portal tests don't transitively call admin endpoints | `grep -E "client\.(get\|post)" backend/tests/test_portal_*.py` confirms portal tests only hit `/api/portal/*` and `/api/connect`. Adding auth to admin endpoints does not break portal tests. | ✅ Confirmed |
| **A-009** Vite proxy forwards Authorization | Slice-2 already sends the header through the proxy (currently ignored). Validation is implicit. | ✅ Confirmed |
| **Bonus finding 1 — Orphan `EmailStr` import in main.py** | `EmailStr` (line 11) is used ONLY by `LoginRequest`. Once `LoginRequest` moves to `auth_routes.py`, `EmailStr` becomes a dead import. Slice-1 cleanup discipline applies. | **Locked: remove from main.py imports** in Decision 7 |
| **Bonus finding 2 — Zero existing tests reference `/api/auth/login` or `DEMO_ACCOUNTS`** | `grep -rE "(api/auth\|DEMO_ACCOUNTS)" backend/tests/` returns 0 matches. No regression risk from changing login's return shape or moving it to `auth_routes.py`. | Documented; AT-015 (slice-1 backend regression) is automatically safe |
| **Bonus finding 3 — `auth_routes.py` does NOT need a lifespan** | Slice-1's `portal_routes.py` has `_session_gc_loop` + `portal_lifespan` because portal sessions are stateful. JWT is stateless; auth has no background task. | `auth_routes.py` is structurally simpler than `portal_routes.py` |
| **Bonus finding 4 — Slice-2 `LoginPage.tsx` already uses `useSearchParams()`** | Reading `next` is already wired (line 14). Adding `reason` is one line; rendering `STR.login.expired` is two more. **5 LoC total for the COULD goal.** | Cheap polish; included by default |

**No blockers. All 11 DEFINE assumptions resolved or stable.** Two bonus findings (#1 + #2) directly inform the file manifest.

---

## Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTH HARDENING — SLICE 3                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  Operator's browser  ──►  POST /api/auth/login {email, password}                       │
│                            │                                                            │
│                            ▼                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  FastAPI backend (:8000)                                                         │  │
│  │                                                                                  │  │
│  │   main.py  ┌────────────────────────────────────────────────────────────────┐    │  │
│  │            │ admin endpoints (16) — each gets one of:                        │    │  │
│  │            │   _: UserClaims = Depends(verify_token)                         │    │  │
│  │            │   _: UserClaims = Depends(require_role(["admin"]))              │    │  │
│  │            │   _: UserClaims = Depends(require_role(["admin","viewer"]))     │    │  │
│  │            │ DELETED: LoginRequest, /api/auth/login, /api/auth/logout,       │    │  │
│  │            │          DEMO_ACCOUNTS, EmailStr import (orphan after deletes)  │    │  │
│  │            │ ADDED:   app.include_router(auth_router)                        │    │  │
│  │            └─────────────────────────────────────────────────────────────────┘    │  │
│  │                              │                                                   │  │
│  │   auth_routes.py  ────────── ▼ ─────────────────────────────────────────────────  │  │
│  │      • POST /api/auth/login   → LoginRequest → mint_token → LoginResponse        │  │
│  │      • POST /api/auth/logout  → stateless ack {ok: true}                         │  │
│  │      • Imports DEMO_ACCOUNTS from auth.py (relocated)                            │  │
│  │      • Logs: "auth_login_ok"  / "auth_login_failed"  events                      │  │
│  │                                                                                  │  │
│  │   auth.py  ───────────────────────────────────────────────────────────────────   │  │
│  │      • mint_token(claims) → str  (HS256, 7-day TTL, 5 claims)                    │  │
│  │      • verify_token(creds: HTTPAuthorizationCredentials = Depends(bearer))       │  │
│  │            → UserClaims  (raises HTTPException 401 with WWW-Authenticate header) │  │
│  │      • require_role(allowed: list[Role]) factory → Depends                       │  │
│  │      • UserClaims dataclass (sub, name, role)                                    │  │
│  │      • get_secret() loads JWT_SECRET env or generates random + WARNING            │  │
│  │      • In production (ENVIRONMENT=production), missing JWT_SECRET → RuntimeError │  │
│  │      • DEMO_ACCOUNTS hashtable (relocated from main.py)                          │  │
│  │      • bearer = HTTPBearer(auto_error=False)  ← OQ-1 lockdown                    │  │
│  │      • Logs: "auth_failed" with event_type for audit-pipeline future slice       │  │
│  │                                                                                  │  │
│  │   portal_routes.py  ────────────────────────────  UNCHANGED (slice 1)            │  │
│  │   (captive-portal endpoints stay public — anonymous Wi-Fi guests)                │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  ───── Admin SPA (mkt-wifi-admin/) — 3 files modified, ~15 LoC delta ──────────────    │
│                                                                                        │
│   src/api/client.ts        ┌──────────────────────────────────────────────────────┐    │
│                            │ if (res.status === 401 && useAuthStore.getState().user) {│
│                            │   useAuthStore.getState().logout();                     │  │
│                            │   const next = encodeURIComponent(location.pathname     │  │
│                            │     + location.search);                                 │  │
│                            │   window.location.href =                                │  │
│                            │     `/login?reason=expired&next=${next}`;               │  │
│                            │ }                                                       │  │
│                            └──────────────────────────────────────────────────────┘    │
│                            (TODO comment removed)                                      │
│                                                                                        │
│   src/ui/RoleGuard.tsx     (TODO comment removed; 1 line delta)                        │
│                                                                                        │
│   src/sections/login/      ┌──────────────────────────────────────────────────────┐    │
│   LoginPage.tsx            │ const reason = params.get("reason");                  │    │
│                            │ {reason === "expired" && (                            │    │
│                            │   <p className="login__error">{STR.login.expired}</p> │    │
│                            │ )}                                                    │    │
│                            └──────────────────────────────────────────────────────┘    │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

| Component | Purpose | Technology | Location |
|-----------|---------|------------|----------|
| **`auth.py` module** | JWT mint/verify, FastAPI dependencies (`verify_token`, `require_role`), `UserClaims` dataclass, secret loading, `DEMO_ACCOUNTS` (relocated) | python-jose 3.5.0 + FastAPI 0.110+ | `backend/auth.py` (NEW) |
| **`auth_routes.py` router** | 2 endpoints (login + logout) on `APIRouter(prefix="/api/auth")` | FastAPI APIRouter | `backend/auth_routes.py` (NEW) |
| **main.py edits** | DELETE legacy login/logout/DEMO_ACCOUNTS/LoginRequest/EmailStr; ADD `include_router(auth_router)` + 16 `Depends(...)` parameters | (none — surgical edits) | `backend/main.py` (MODIFY) |
| **Pytest auth fixtures** | `admin_token`, `advertiser_token`, `viewer_token`, `expired_token`, `malformed_token` fixtures for integration tests | pytest + python-jose | `backend/tests/conftest.py` (MODIFY — add fixtures) |
| **Auth unit tests** | mint + verify happy paths + edge cases (expired, malformed, missing-claim) | pytest + python-jose | `backend/tests/test_auth.py` (NEW) |
| **Auth integration tests** | AT-006..AT-010 categorical role-gating across the 16 admin endpoints | pytest + httpx.AsyncClient | `backend/tests/test_auth_integration.py` (NEW) |
| **Production fail-fast at startup** | Reads `ENVIRONMENT` + `JWT_SECRET`; raises RuntimeError if production and unset | stdlib | inside `auth.py:get_secret()` |
| **Admin SPA 401 interceptor** | On 401 → logout + redirect | TypeScript | `mkt-wifi-admin/src/api/client.ts` (MODIFY) |
| **LoginPage `?reason=expired` notice** | Reads URL param, renders `STR.login.expired` | TypeScript / React | `mkt-wifi-admin/src/sections/login/LoginPage.tsx` (MODIFY) |
| **Vitest 401-interceptor test** | Mocks fetch returning 401, asserts `logout()` + redirect fired | vitest + jsdom | `mkt-wifi-admin/tests/unit/api/client.test.ts` (NEW) |
| **OpenAPI security contract test** | Asserts every admin endpoint has `security: [{Bearer: []}]` (OQ-8 resolution) | vitest | `mkt-wifi-admin/tests/contract/openapi_security.test.ts` (NEW) |
| **README JWT_SECRET section** | Production runbook for `JWT_SECRET` — set, rotate, fail-fast behavior | markdown | `backend/README.md` (MODIFY) |

---

## Key Decisions

### Decision 1 — `HTTPBearer` (NOT `OAuth2PasswordBearer`) — resolves OQ-1

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (resolves OQ-1) |
| **Date** | 2026-05-04 |

**Context:** DEFINE A-002 deferred the choice between `fastapi.security.HTTPBearer` and `OAuth2PasswordBearer` to /design.

**Choice:** **`HTTPBearer(auto_error=False)`** — wraps the `Authorization: Bearer <jwt>` header parsing. `auto_error=False` so we can produce our own structured `{"detail": "..."}` body (matches DEFINE AT-003/AT-004/AT-005 wording).

**Rationale:** The existing `/api/auth/login` accepts a **Pydantic JSON body** (`body: LoginRequest`), NOT OAuth2 form-encoded (`username` + `password`). `OAuth2PasswordBearer`'s Swagger "Authorize" button submits a `application/x-www-form-urlencoded` request to the `tokenUrl` — would produce **422 Unprocessable Entity** every time and confuse Swagger users. `HTTPBearer` simply provides an "Authorize" dialog accepting a raw JWT to attach as `Authorization: Bearer ...` — exact fit.

**Alternatives Rejected:**
1. `OAuth2PasswordBearer` — form-mismatch with existing JSON login endpoint. Would actively confuse Swagger users.
2. `APIKeyHeader` (custom header) — non-standard; `Authorization: Bearer` is HTTP RFC 6750.
3. Manual header parsing in each endpoint — duplicated boilerplate; loses Swagger lock-icon integration.

**Consequences:**
- Swagger UI shows a padlock icon on every gated endpoint and a single "Authorize" button (top right) accepting a raw JWT.
- `auto_error=False` means missing-header behavior is implemented in `verify_token` (we control the response body).
- `WWW-Authenticate: Bearer` header on 401 is added manually (HTTP standard for AT-010).

---

### Decision 2 — APIRouter for `auth_routes.py` (mirror slice-1's `portal_routes.py`)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** BRAINSTORM Approach A locked APIRouter pattern. /design specifies the prefix and structure.

**Choice:** `auth_router = APIRouter(prefix="/api/auth", tags=["auth"])` with 2 endpoints — `POST /login` and `POST /logout` (so the full paths are `/api/auth/login` and `/api/auth/logout`, matching the existing contract).

**Rationale:** Mirrors slice-1's `portal_router = APIRouter(prefix="/api", tags=["portal"])`. Tags group endpoints in Swagger; explicit prefix avoids hardcoding `/api/auth/...` in each route decorator.

**Alternatives Rejected:** Inline in main.py (slice-1 lesson — extraction is established convention).

**Consequences:**
- Swagger UI shows an `auth` tag group above the `default` tag; auth endpoints are clearly separated.
- `auth_routes.py` does NOT need a lifespan (unlike slice-1's `portal_routes.py` with its GC task) — JWT is stateless.

---

### Decision 3 — `verify_token` and `require_role` as FastAPI dependencies (per-endpoint, not middleware)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** BRAINSTORM Approach A vs B vs C selection chose dependency-pattern role guards over middleware. /design locks the API.

**Choice:** Two related dependencies:

```python
def verify_token(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> UserClaims:
    """Validates JWT; returns UserClaims; raises 401 on failure."""

def require_role(allowed: list[Role]) -> Callable[..., UserClaims]:
    """Factory returning a dependency that requires `verify_token` AND a role match.
       Raises 403 if authenticated but role not in allowed."""
    def dep(claims: UserClaims = Depends(verify_token)) -> UserClaims:
        if claims.role not in allowed:
            raise HTTPException(status_code=403, detail="forbidden")
        return claims
    return dep
```

**Rationale:**
- Per-endpoint Depends is **idiomatic FastAPI** — Swagger UI shows the auth requirement on every protected endpoint.
- `require_role` composes with `verify_token` (single source of token validation truth).
- Both return `UserClaims` so handlers that need the current user can ergonomically access it.

**Alternatives Rejected:**
1. Middleware-based (BRAINSTORM Approach B) — brittle public-allowlist; no Swagger visibility.
2. Decorator-based — non-Pythonic in FastAPI.
3. Manual per-endpoint check — boilerplate; not testable.

**Consequences:**
- 16 main.py endpoint signatures gain one new parameter (`_: UserClaims = Depends(...)`).
- Some endpoints prefer `_:` (unused) when they don't actually need the user; e.g., `/api/kpis` doesn't filter by user. The unused-parameter is fine — `noUnusedParameters` is a TS-strict thing, not a Python lint default.

---

### Decision 4 — JWT claims locked: exactly `sub`, `name`, `role`, `iat`, `exp` (5 keys, no others)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (BRAINSTORM Decision 6 carry-forward) |
| **Date** | 2026-05-04 |

**Context:** BRAINSTORM Validation 2 locked the claim shape. /design records the exact serialization.

**Choice:**
```python
@dataclass(frozen=True)
class UserClaims:
    sub: str       # email — RFC 7519 standard "subject"
    name: str      # display name
    role: Role     # Literal["admin", "advertiser", "viewer"]

# When minted, also includes iat (auto-set by jose) and exp (= iat + 604800).
```

JWT payload at sign time:

```python
payload = {
    "sub": user.email,
    "name": user.name,
    "role": user.role,
    "iat": int(now.timestamp()),
    "exp": int(now.timestamp()) + JWT_TTL_SECONDS,  # 604800
}
```

`verify_token` decodes, validates `exp` (automatic), checks `role` is in the Literal set, and constructs `UserClaims(sub, name, role)` (drops `iat`/`exp` — handlers don't need them).

**Rationale:** Minimal-but-sufficient. Including `name` in the JWT avoids a separate `/api/auth/me` round-trip from the SPA. `role` is enum-validated at decode time (type-safety end-to-end).

**Alternatives Rejected:** `iss`/`aud`/`jti` (YAGNI); store `name` separately (extra round-trip for no benefit).

**Consequences:**
- Adding new claims is purely additive — future multi-tenant slice adds `org_id` without breaking this shape.
- Removing claims is a breaking change — anything in this set is part of the contract. We commit to these 5 forever.

---

### Decision 5 — `python-jose[cryptography]>=3.3,<4` pinned

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (resolves A-001) |
| **Date** | 2026-05-04 |

**Context:** BRAINSTORM directly suggested python-jose. Pre-design `pip index versions` confirmed 3.5.0 latest stable; 3.3+ has been stable since 2023.

**Choice:** Add `python-jose[cryptography]>=3.3,<4` to `backend/requirements.txt`. The `[cryptography]` extra pulls in the C-backed `cryptography` library for fast HS256 sign/verify.

**Rationale:** Industry-standard JWT library for Python. The `[cryptography]` extra is faster than the pure-Python fallback. `<4` cap protects against future breaking changes.

**Alternatives Rejected:**
1. `PyJWT` — also fine; library reputation is comparable. Direction was preordained by `main.py:284` comment.
2. `authlib` — heavyweight; full OAuth2/OIDC stack; overkill for a single login endpoint.

**Consequences:** One new dep. ~600 KB on disk; ~2 ms per token mint/verify. Negligible.

---

### Decision 6 — `JWT_SECRET` env var with **fail-fast in production** + random+WARNING in dev/test (resolves OQ-2 + A-005)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (resolves OQ-2) |
| **Date** | 2026-05-04 |

**Context:** BRAINSTORM Decision 5 locked HS256 + shared `JWT_SECRET`. DEFINE OQ-2 raised the question: should the backend refuse to start in production if `JWT_SECRET` is unset?

**Choice:**

```python
def get_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if secret:
        return secret
    env = os.environ.get("ENVIRONMENT", "dev").lower()
    if env in ("production", "prod"):
        raise RuntimeError(
            "JWT_SECRET must be set in production. Refusing to start."
        )
    # dev/test: random + WARNING
    secret = secrets.token_urlsafe(32)
    log.warning(
        "JWT_SECRET unset — using random secret. "
        "All tokens invalidate on restart. "
        "Set JWT_SECRET in production."
    )
    return secret
```

`get_secret()` is called once at module import time. The result is cached in `_SECRET` module-level variable.

**Rationale:**
- **Production:** loud failure beats silent misconfig. A missing `JWT_SECRET` in prod means tokens silently invalidate on every restart — operators see "logged out" after every deploy. Fail-fast forces deployers to fix the misconfig at deploy time, not after losing trust.
- **Dev/test:** random secret keeps `pytest` and local dev frictionless. The WARNING is loud enough that anyone running locally knows to set `JWT_SECRET=dev-only` for stability.
- The `ENVIRONMENT` env var convention is widespread and lightweight.

**Alternatives Rejected:**
1. Always random + WARNING (DEFINE A-005 default) — leaves the production footgun.
2. Always require `JWT_SECRET` — breaks `pytest` ergonomics; tests now need env-var setup.
3. Hardcoded default secret — security catastrophe.

**Consequences:**
- Production deployers MUST set `JWT_SECRET` (documented in `backend/README.md`).
- The `ENVIRONMENT` env var is now part of the production contract (set to `production` or `prod`).
- Dev defaults to `ENVIRONMENT=dev` (or unset), which keeps the random+WARNING path.
- `tests/conftest.py` must set `JWT_SECRET` for stable token tests across runs (covered in Decision 8).

---

### Decision 7 — Surgical `main.py` edits including orphan-import cleanup

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (resolves Bonus Finding 1) |
| **Date** | 2026-05-04 |

**Context:** Pre-design inspection found that moving `LoginRequest` to `auth_routes.py` orphans the `EmailStr` import in main.py (line 11). Slice-1's R13 lesson — clean orphan imports in the same PR.

**Choice:** Surgical edits to `main.py`:

1. **REMOVE imports:** `EmailStr` from line 11's `from pydantic import BaseModel, EmailStr, Field` → `from pydantic import BaseModel, Field`.
2. **DELETE** `class LoginRequest(BaseModel)` (lines 281-283).
3. **DELETE** `# In production: store hashed passwords in DB and use python-jose for JWTs.` (line 284) + `DEMO_ACCOUNTS = {...}` (lines 286-290) — relocated to `auth.py`.
4. **DELETE** `@app.post("/api/auth/login")` route handler (lines 292-303).
5. **DELETE** `@app.post("/api/auth/logout")` route handler (lines 305-308).
6. **ADD** at top: `from auth_routes import auth_router`.
7. **ADD** after the `app.include_router(portal_router)` line: `app.include_router(auth_router)`.
8. **ADD** `_: UserClaims = Depends(...)` parameter to each of the 16 admin endpoints (per the role policy table below).
9. **ADD** at top: `from auth import UserClaims, verify_token, require_role`.

Total edit: ~60 LoC delta in main.py (~30 deletes + ~30 adds for the 16 endpoint signature changes).

**Per-endpoint signature change pattern:**

```python
# BEFORE (line 80):
@app.get("/api/kpis")
async def kpis(s: AsyncSession = Depends(get_session)):

# AFTER:
@app.get("/api/kpis")
async def kpis(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(verify_token),     # any-authenticated
):
```

For write endpoints:

```python
# AFTER:
@app.post("/api/campaigns", response_model=Campaign, status_code=201)
async def create_campaign(
    body: CampaignCreate,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin"])),
):
```

**Rationale:** Slice-1 R13 lesson — pre-design caught the orphan; clean it up now. The mechanical signature edits are tedious but trivial.

**Alternatives Rejected:** Leave EmailStr import as dead code (slice-1 lesson rejects); inline the signature additions in random files (no — same convention everywhere).

**Consequences:** main.py is ~30 LoC shorter (deletes outpace adds because login/logout had bodies; the new `Depends(...)` is one line per endpoint).

---

### Decision 8 — Pytest auth fixtures in `conftest.py`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** AT-001 + AT-006..AT-010 all need real JWTs minted with the right secret. Repeating the mint logic in every test is boilerplate; pytest fixtures centralize.

**Choice:** Extend `backend/tests/conftest.py` with these fixtures:

```python
@pytest.fixture(autouse=True, scope="session")
def jwt_secret_env():
    os.environ["JWT_SECRET"] = "test-secret-for-pytest-only"
    yield
    # Don't pop — other tests may rely on it.

@pytest.fixture
def admin_token() -> str:
    from auth import mint_token
    return mint_token(sub="admin@mktwifi.com", name="Admin", role="admin")

@pytest.fixture
def advertiser_token() -> str: ...
@pytest.fixture
def viewer_token() -> str: ...

@pytest.fixture
def expired_token() -> str:
    """Token with exp set 1 second in the past."""
    from auth import _SECRET  # internal — fixture only
    from jose import jwt
    return jwt.encode(
        {"sub": "x", "name": "x", "role": "admin",
         "iat": int(time.time()) - 100,
         "exp": int(time.time()) - 1},
        _SECRET, algorithm="HS256",
    )

@pytest.fixture
def malformed_token() -> str:
    return "not-a-real-jwt-token"
```

**Rationale:** Reusable across all integration tests. Setting `JWT_SECRET` at session start ensures deterministic token validity across test runs (no random-secret drift between mint and verify).

**Alternatives Rejected:** Per-test inline mint calls (boilerplate); env-var via shell (test-runner-specific).

**Consequences:** The `JWT_SECRET=test-secret-for-pytest-only` env var is set during test runs only. Production / dev are unaffected.

---

### Decision 9 — SPA 401 interceptor preserves `?next=...` (resolves OQ-5)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (resolves OQ-5) |
| **Date** | 2026-05-04 |

**Context:** DEFINE OQ-5 (COULD goal): preserve current path on 401 redirect for post-login restoration. Pre-design confirmed slice-2's `LoginPage.tsx` already reads `next` (line 14).

**Choice:** On 401, the interceptor builds:

```typescript
const next = encodeURIComponent(window.location.pathname + window.location.search);
window.location.href = `/login?reason=expired&next=${next}`;
```

Slice-2's `LoginPage.tsx` already redirects to `params.get("next") || "/"` after successful login. Reusing the existing param means **zero new logic in LoginPage**.

**Rationale:** Better UX — operators land back where the token expired. Single extra line of code; no architectural change.

**Alternatives Rejected:** Always redirect to `/` (loses context); store the path in localStorage (race-condition-prone).

**Consequences:** None negative. `LoginPage.tsx` already handles the param.

---

### Decision 10 — Standards-compliant 401 with `WWW-Authenticate: Bearer`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** RFC 6750 mandates the `WWW-Authenticate: Bearer` header on 401 responses for resources protected by Bearer authentication. Skipping it is a small but real protocol violation.

**Choice:** All 401 responses from `verify_token` and the FastAPI exception handler set `WWW-Authenticate: Bearer realm="api"`. Implementation:

```python
raise HTTPException(
    status_code=401,
    detail="invalid_token",  # or "token_expired" or "not_authenticated"
    headers={"WWW-Authenticate": 'Bearer realm="api"'},
)
```

**Rationale:** HTTP standard compliance. Some clients (curl with `--anyauth`, certain HTTP libraries) auto-retry with credentials when they see this header. Costs nothing; correct.

**Consequences:** AT-010 explicitly checks for this header.

---

### Decision 11 — OpenAPI security contract test (resolves OQ-8)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (resolves OQ-8) |
| **Date** | 2026-05-04 |

**Context:** DEFINE OQ-8 asked whether to ship a contract test asserting every admin endpoint has `security: [{Bearer: []}]` in `/openapi.json`. Without it, a future slice could add an endpoint without auth and the slip wouldn't be caught until production.

**Choice:** New `mkt-wifi-admin/tests/contract/openapi_security.test.ts` that:

1. Loads `/openapi.json` from the running backend (graceful skip if backend offline).
2. Iterates every path + method.
3. For each operation, verifies that:
   - If path is in the public-allowlist (`/api/auth/login`, `/api/auth/logout`, `/api/portal/*`, `/api/connect`, `/api/sessions/*`, `/`, `/docs`, `/openapi.json`) → skip.
   - Otherwise → assert `security` array exists and contains `{Bearer: []}` (or whatever name FastAPI assigns to our HTTPBearer instance).

**Rationale:** Catches future-slice drift mechanically. Cheap (~30 LoC). Already part of slice-2's contract-test pattern (`openapi.test.ts`).

**Consequences:** Future slices that add a new admin endpoint must wire `Depends(verify_token)` or this test fails CI.

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `backend/auth.py` | Create | JWT mint/verify, `UserClaims` dataclass, `verify_token`/`require_role` deps, `get_secret()` with fail-fast, `DEMO_ACCOUNTS` (relocated from main.py), structured logging | @python-developer | — |
| 2 | `backend/auth_routes.py` | Create | `APIRouter(prefix="/api/auth")` with `POST /login` (Pydantic `LoginRequest`/`LoginResponse`) and `POST /logout` (stateless ack) | @python-developer | 1 |
| 3 | `backend/main.py` | Modify | (a) DELETE `LoginRequest` class, `DEMO_ACCOUNTS`, `/api/auth/login`, `/api/auth/logout`. (b) REMOVE `EmailStr` from pydantic import (orphan after deletes). (c) ADD `from auth import UserClaims, verify_token, require_role` + `from auth_routes import auth_router`. (d) ADD `app.include_router(auth_router)`. (e) ADD `_: UserClaims = Depends(...)` parameter to each of the 16 admin endpoints per the role policy table. | @python-developer | 1, 2 |
| 4 | `backend/requirements.txt` | Modify | ADD `python-jose[cryptography]>=3.3,<4` | (direct) | — |
| 5 | `backend/README.md` | Modify | ADD §JWT_SECRET section: production setup, fail-fast behavior, rotation note (OQ-7) | (direct) | — |
| 6 | `backend/tests/conftest.py` | Modify | ADD pytest fixtures: `jwt_secret_env` (autouse session), `admin_token`, `advertiser_token`, `viewer_token`, `expired_token`, `malformed_token`. Reuse existing `client` fixture. | @test-generator | 1 |
| 7 | `backend/tests/test_auth.py` | Create | Unit tests for `auth.py`: AT-001 (login mints valid JWT with 5 claims), AT-002 (wrong password — no JWT), AT-003 (expired token rejected), AT-004 (malformed token rejected), AT-005 (missing-claim rejected). + token-expiry math + UserClaims dataclass + get_secret() fail-fast in production. | @test-generator | 1, 6 |
| 8 | `backend/tests/test_auth_integration.py` | Create | Integration tests for the per-endpoint policy: AT-006 (read-all × 3 roles), AT-007 (read-admin-and-viewer × 3 roles), AT-008 (admin-only-read × 3 roles), AT-009 (write-admin-only × 3 roles), AT-010 (missing-header → 401 + WWW-Authenticate). All parameterized. | @test-generator | 1, 3, 6 |
| 9 | `backend/tests/test_main_integration.py` | Modify | UPDATE `test_legacy_connect_route_deleted_at_module_level` style tests: now also assert `LoginRequest`, `DEMO_ACCOUNTS`, `EmailStr` are gone from main.py source; assert `auth_router` is mounted on `app.routes` | @test-generator | 3 |
| 10 | `mkt-wifi-admin/src/api/client.ts` | Modify | (a) REMOVE `// TODO(auth-hardening-slice)` comment (line 10). (b) ADD 401 interceptor block inside `if (!res.ok)`: `useAuthStore.getState().logout()` + `window.location.href = ...?reason=expired&next=...` | @react-specialist | — |
| 11 | `mkt-wifi-admin/src/ui/RoleGuard.tsx` | Modify | REMOVE `// TODO(auth-hardening-slice)` comment (line 11). No code change. | @react-specialist | — |
| 12 | `mkt-wifi-admin/src/sections/login/LoginPage.tsx` | Modify | ADD `?reason=expired` reading + render `STR.login.expired` notice above the form. ~5 LoC. | @react-specialist | — |
| 13 | `mkt-wifi-admin/tests/unit/api/client.test.ts` | Create | vitest test for the 401 interceptor: mocks `fetch` returning 401, asserts `useAuthStore.logout()` fired and `window.location.href` set to `/login?reason=expired&next=<encoded>`. Uses `vi.stubGlobal("fetch", ...)` and `Object.defineProperty(window, "location", ...)`. | @test-generator | 10 |
| 14 | `mkt-wifi-admin/tests/contract/openapi_security.test.ts` | Create | Contract test (resolves OQ-8): loads `/openapi.json`, iterates paths, asserts every non-public admin endpoint has `security: [{HTTPBearer: []}]` (or whatever FastAPI names our Bearer scheme). Graceful skip if backend offline. | @test-generator | 3 |

**Total Files:** **14** (5 Create + 9 Modify; 1 backend script unchanged from slice-2's grep_pii_check.sh — no further edits needed)

---

## Per-Endpoint Role Policy (mirrors slice-2 RoleGuard with data-model-aware tightening)

| Endpoint | Method | Dependency | admin | advertiser | viewer |
|---|---|---|---|---|---|
| `/api/auth/login`, `/api/auth/logout` | POST | (public — no Depends) | ✅ | ✅ | ✅ |
| `/api/portal/*`, `/api/connect`, `/api/sessions/*` (slice 1) | various | (public — no Depends) | ✅ | ✅ | ✅ |
| `/api/kpis` | GET | `verify_token` | ✅ | ✅ | ✅ |
| `/api/connections/weekly` | GET | `verify_token` | ✅ | ✅ | ✅ |
| `/api/demographics` | GET | `verify_token` | ✅ | ✅ | ✅ |
| `/api/campaigns` | GET | `verify_token` | ✅ | ✅ | ✅ |
| `/api/campaigns` | POST | `require_role(["admin"])` | ✅ | ❌ | ❌ |
| `/api/campaigns/{cid}` | PATCH | `require_role(["admin"])` | ✅ | ❌ | ❌ |
| `/api/campaigns/{cid}` | DELETE | `require_role(["admin"])` | ✅ | ❌ | ❌ |
| `/api/users` | GET | `require_role(["admin","viewer"])` | ✅ | ❌ | ✅ |
| `/api/users/live` | GET | `require_role(["admin","viewer"])` | ✅ | ❌ | ✅ |
| `/api/devices` | GET | `require_role(["admin","viewer"])` | ✅ | ❌ | ✅ |
| `/api/devices/{did}/refresh` | POST | `require_role(["admin"])` | ✅ | ❌ | ❌ |
| `/api/notifications/rules` | GET | `require_role(["admin","viewer"])` | ✅ | ❌ | ✅ |
| `/api/notifications/rules/{rid}` | PATCH | `require_role(["admin"])` | ✅ | ❌ | ❌ |
| `/api/notifications/groups` | GET | `require_role(["admin","viewer"])` | ✅ | ❌ | ✅ |
| `/api/monetization` | GET | `require_role(["admin"])` | ✅ | ❌ | ❌ |
| `/api/reports` | GET | `verify_token` | ✅ | ✅ | ✅ |

**Tightening vs slice-2 RoleGuard:** Anunciante loses POST/PATCH/DELETE on campaigns (no `Campaign.owner_id`). Multi-tenant slice introduces `owner_id` and re-tightens.

---

## Code Patterns

### Pattern 1 — `auth.py` skeleton

```python
# backend/auth.py
import logging
import os
import secrets as secrets_lib
import time
from dataclasses import dataclass
from typing import Callable, Literal

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError

log = logging.getLogger("auth")

Role = Literal["admin", "advertiser", "viewer"]
ALGORITHM = "HS256"
JWT_TTL_SECONDS = 7 * 24 * 3600  # 604800

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class UserClaims:
    sub: str  # email
    name: str
    role: Role


def get_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if secret:
        return secret
    env = os.environ.get("ENVIRONMENT", "dev").lower()
    if env in ("production", "prod"):
        raise RuntimeError(
            "JWT_SECRET must be set in production. Refusing to start."
        )
    secret = secrets_lib.token_urlsafe(32)
    log.warning(
        "JWT_SECRET unset — using random secret. "
        "All tokens invalidate on restart. "
        "Set JWT_SECRET in production."
    )
    return secret


_SECRET = get_secret()


def mint_token(sub: str, name: str, role: Role) -> str:
    now = int(time.time())
    payload = {
        "sub": sub,
        "name": name,
        "role": role,
        "iat": now,
        "exp": now + JWT_TTL_SECONDS,
    }
    return jwt.encode(payload, _SECRET, algorithm=ALGORITHM)


def _401(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": 'Bearer realm="api"'},
    )


def verify_token(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> UserClaims:
    if creds is None or creds.scheme.lower() != "bearer":
        log.warning("auth_failed", extra={"event_type": "auth_no_token"})
        raise _401("not_authenticated")
    try:
        payload = jwt.decode(creds.credentials, _SECRET, algorithms=[ALGORITHM])
    except ExpiredSignatureError:
        log.warning("auth_failed", extra={"event_type": "auth_token_expired"})
        raise _401("token_expired")
    except JWTError:
        log.warning("auth_failed", extra={"event_type": "auth_invalid_token"})
        raise _401("invalid_token")
    role = payload.get("role")
    if role not in ("admin", "advertiser", "viewer"):
        log.warning("auth_failed", extra={"event_type": "auth_invalid_role"})
        raise _401("invalid_token")
    sub = payload.get("sub")
    name = payload.get("name")
    if not sub or not name:
        log.warning("auth_failed", extra={"event_type": "auth_missing_claim"})
        raise _401("invalid_token")
    return UserClaims(sub=sub, name=name, role=role)


def require_role(allowed: list[Role]) -> Callable[..., UserClaims]:
    def dep(claims: UserClaims = Depends(verify_token)) -> UserClaims:
        if claims.role not in allowed:
            log.warning(
                "auth_forbidden",
                extra={"event_type": "auth_role_denied",
                       "user_role": claims.role,
                       "allowed": list(allowed)},
            )
            raise HTTPException(status_code=403, detail="forbidden")
        return claims
    return dep


# Demo accounts relocated from main.py — R5 slice replaces with bcrypt
DEMO_ACCOUNTS: dict[str, tuple[str, str, Role]] = {
    "admin@mktwifi.com": ("admin123", "Admin", "admin"),
    "anunciante@mktwifi.com": ("anuncio26", "Anunciante", "advertiser"),
    "viewer@mktwifi.com": ("viewer123", "Visualizador", "viewer"),
}
```

### Pattern 2 — `auth_routes.py` skeleton

```python
# backend/auth_routes.py
import logging
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from auth import DEMO_ACCOUNTS, mint_token

log = logging.getLogger("auth")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginUser(BaseModel):
    email: str
    name: str
    role: Literal["admin", "advertiser", "viewer"]


class LoginOk(BaseModel):
    ok: Literal[True] = True
    token: str
    user: LoginUser


class LoginFail(BaseModel):
    ok: Literal[False] = False
    message: str


@auth_router.post("/login", response_model=LoginOk | LoginFail)
def login(body: LoginRequest):
    record = DEMO_ACCOUNTS.get(body.email.lower().strip())
    if not record or record[0] != body.password:
        log.warning("auth_login_failed",
                    extra={"event_type": "auth_login_failed",
                           "email_prefix": body.email[:3]})
        return LoginFail(message="Email ou senha incorretos.")
    _, name, role = record
    token = mint_token(sub=body.email, name=name, role=role)
    log.info("auth_login_ok",
             extra={"event_type": "auth_login_ok",
                    "role": role})
    return LoginOk(
        token=token,
        user=LoginUser(email=body.email, name=name, role=role),
    )


@auth_router.post("/logout")
def logout():
    # Stateless tokens — client just drops it.
    # Future R5/audit slice may add token-blocklist.
    return {"ok": True}
```

### Pattern 3 — main.py per-endpoint signature edit

```python
# Read-all endpoint
@app.get("/api/kpis")
async def kpis(
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(verify_token),  # any authenticated role
):
    ...

# Read-admin-and-viewer
@app.get("/api/users")
async def list_users(
    zone: Optional[str] = None, q: Optional[str] = None,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin", "viewer"])),
):
    ...

# Write-admin-only
@app.post("/api/campaigns", response_model=Campaign, status_code=201)
async def create_campaign(
    body: CampaignCreate,
    s: AsyncSession = Depends(get_session),
    _: UserClaims = Depends(require_role(["admin"])),
):
    ...
```

### Pattern 4 — SPA `client.ts` 401 interceptor

```typescript
// mkt-wifi-admin/src/api/client.ts (delta only)
async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = useAuthStore.getState().token;

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401 && useAuthStore.getState().user) {
      useAuthStore.getState().logout();
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?reason=expired&next=${next}`;
    }
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
```

### Pattern 5 — LoginPage `?reason=expired` notice

```tsx
// mkt-wifi-admin/src/sections/login/LoginPage.tsx (delta — additions only)
const reason = params.get("reason");
// ...
return (
  <main className="login">
    <div className="login__panel">
      {/* ... existing header ... */}
      <form onSubmit={onSubmit} className="login__form">
        {reason === "expired" && (
          <p className="login__error" role="alert" data-testid="login-expired-notice">
            {STR.login.expired}
          </p>
        )}
        {/* ... existing fields ... */}
      </form>
    </div>
  </main>
);
```

### Pattern 6 — pytest auth fixtures

```python
# backend/tests/conftest.py (additions)
import os
import time

import pytest

@pytest.fixture(autouse=True, scope="session")
def jwt_secret_env():
    os.environ["JWT_SECRET"] = "test-secret-for-pytest-only"
    yield


@pytest.fixture
def admin_token() -> str:
    from auth import mint_token
    return mint_token(sub="admin@mktwifi.com", name="Admin", role="admin")


@pytest.fixture
def advertiser_token() -> str:
    from auth import mint_token
    return mint_token(sub="anunciante@mktwifi.com", name="Anunciante", role="advertiser")


@pytest.fixture
def viewer_token() -> str:
    from auth import mint_token
    return mint_token(sub="viewer@mktwifi.com", name="Visualizador", role="viewer")


@pytest.fixture
def expired_token() -> str:
    from jose import jwt
    from auth import _SECRET, ALGORITHM
    now = int(time.time())
    return jwt.encode(
        {"sub": "x", "name": "x", "role": "admin", "iat": now - 100, "exp": now - 1},
        _SECRET, algorithm=ALGORITHM,
    )


@pytest.fixture
def malformed_token() -> str:
    return "not-a-real-jwt"
```

### Pattern 7 — categorical role-gating integration test (collapses 16×3 cases)

```python
# backend/tests/test_auth_integration.py
import pytest

READ_ALL_ENDPOINTS = [
    ("GET", "/api/kpis"),
    ("GET", "/api/connections/weekly"),
    ("GET", "/api/demographics"),
    ("GET", "/api/campaigns"),
    ("GET", "/api/reports"),
]

ADMIN_AND_VIEWER_ENDPOINTS = [
    ("GET", "/api/users"),
    ("GET", "/api/users/live"),
    ("GET", "/api/devices"),
    ("GET", "/api/notifications/rules"),
    ("GET", "/api/notifications/groups"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", READ_ALL_ENDPOINTS)
@pytest.mark.parametrize("role_fixture", ["admin_token", "advertiser_token", "viewer_token"])
async def test_AT006_read_all_accepts_any_role(client, request, method, path, role_fixture):
    token = request.getfixturevalue(role_fixture)
    res = await client.request(method, path, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code in (200, 201)
```

---

## Data Flow

```text
Login flow:
1. Operator submits credentials → POST /api/auth/login (JSON body)
2. auth_routes.login looks up DEMO_ACCOUNTS, validates plaintext password
3. If valid: auth.mint_token(sub, name, role) → real JWT (HS256, 7-day TTL)
4. Returns LoginOk(ok=True, token=<jwt>, user={email, name, role})
5. SPA's authStore.setSession() persists to localStorage (remember=true) or sessionStorage

Authenticated request flow:
1. SPA's client.ts adds Authorization: Bearer <jwt> header
2. FastAPI's HTTPBearer dep extracts the token
3. verify_token decodes via python-jose; jose auto-validates exp claim
4. UserClaims dataclass returned to handler
5. For role-gated endpoints: require_role(allowed) wraps verify_token, raises 403 if role mismatch
6. Handler proceeds with the validated user

Token expiry flow (server-side):
1. Operator returns to browser after >7 days; SPA tries to call /api/anything
2. Backend's verify_token raises ExpiredSignatureError → HTTPException(401, "token_expired")
3. SPA's client.ts 401-interceptor fires:
   - useAuthStore.logout() clears state + storage
   - window.location.href = "/login?reason=expired&next=/<current-path>"
4. LoginPage renders STR.login.expired notice
5. Operator re-authenticates; LoginPage redirects to ?next path
```

---

## Integration Points

| External System | Integration | Notes |
|----------------|-------------|-------|
| `python-jose[cryptography]` | Library — JWT mint + verify | New dep added in this slice |
| `fastapi.security.HTTPBearer` | Auth scheme — extracts `Authorization: Bearer <jwt>` header | Already in fastapi; no new dep |
| Existing `DEMO_ACCOUNTS` | Credential store (plaintext) | Relocated from main.py to auth.py; R5 slice replaces with bcrypt |
| Slice-1 `portal_routes.py` | Stays public | This slice does NOT touch portal_routes.py; AT-011 verifies no regression |
| Slice-2 admin SPA `useAuthStore` + `STR.login.expired` | Pre-shipped infrastructure used by this slice | Zero new SPA dependencies |
| `JWT_SECRET` env var | Production secret | Documented in backend/README.md |
| `ENVIRONMENT` env var | Production fail-fast trigger | Documented in backend/README.md |

---

## Testing Strategy

| Test Type | Scope | Files | Maps to AT |
|-----------|-------|-------|-----------|
| **Unit (auth.py)** | mint_token, verify_token, require_role, UserClaims, get_secret edge cases | `tests/test_auth.py` | AT-001..AT-005, AT-020 |
| **Integration (categorical role gating)** | All 16 admin endpoints × 3 roles, parameterized | `tests/test_auth_integration.py` | AT-006..AT-010 |
| **Captive-portal regression** | All slice-1 portal tests continue to pass without Authorization header | (existing `tests/test_portal_*.py`) | AT-011, AT-015 |
| **main.py orphan-removal regression** | Existing `test_main_integration.py` updated to assert deletions | `tests/test_main_integration.py` (modify) | (regression guard) |
| **SPA 401 interceptor** | vitest mocks fetch + window.location | `tests/unit/api/client.test.ts` | AT-012 |
| **SPA expired notice** | Manual QA + e2e (deferred to /iterate) | (none new) | AT-013 |
| **SPA tsc strict** | `tsc --noEmit` after edits | (CI step) | AT-017 |
| **TODO marker absence** | `grep -rn "TODO(auth-hardening-slice)" mkt-wifi-admin/src` | (CI step) | AT-014 |
| **Slice-2 vitest regression** | All 20 slice-2 unit tests pass | (existing) | AT-016 |
| **PII grep regression** | `bash backend/scripts/grep_pii_check.sh` | (CI step) | AT-019 |
| **No raw token in logs** | `grep -rE '\.(info\|warning\|error)\(.*\btoken\b[^_]' backend/auth*.py` | (CI step) | AT-018 |
| **OpenAPI security drift** | `tests/contract/openapi_security.test.ts` (resolves OQ-8) | `tests/contract/openapi_security.test.ts` (new) | (drift guard) |

**ATs covered: 20/20** — every AT has at least one test or CI check.

---

## Error Handling

| Error | Source | Response | Logged |
|-------|--------|----------|--------|
| Missing `Authorization` header | `verify_token` | 401 `not_authenticated` + `WWW-Authenticate: Bearer` | `auth_no_token` |
| Malformed token / wrong signature | `jose.JWTError` | 401 `invalid_token` + `WWW-Authenticate: Bearer` | `auth_invalid_token` |
| Expired token (`exp < now`) | `jose.ExpiredSignatureError` | 401 `token_expired` + `WWW-Authenticate: Bearer` | `auth_token_expired` |
| Missing required claim (sub/name/role) | `verify_token` post-decode | 401 `invalid_token` + `WWW-Authenticate: Bearer` | `auth_missing_claim` |
| Role not allowed | `require_role` | 403 `forbidden` (no `WWW-Authenticate` — already authenticated) | `auth_role_denied` |
| Login wrong password | `auth_routes.login` | 200 `{ok: false, message: "Email ou senha incorretos."}` (existing convention) | `auth_login_failed` |
| Login success | `auth_routes.login` | 200 `{ok: true, token, user}` | `auth_login_ok` |

All log events follow the `extra={"event_type": "..."}` pattern — future audit-pipeline slice consumes by grepping logger name `"auth"`.

---

## Configuration

| Config Key | Type | Default | Where | Description |
|------------|------|---------|-------|-------------|
| `JWT_SECRET` | str | (none — fail-fast in prod, random+WARNING in dev) | env var, read in `auth.py:get_secret()` | HMAC secret for HS256 signing |
| `ENVIRONMENT` | str | `dev` | env var | If `production`/`prod` AND `JWT_SECRET` unset → RuntimeError at import |
| `JWT_TTL_SECONDS` | int | `604800` (7 days) | constant in `auth.py` | Token TTL — locked per BRAINSTORM Q2 |
| `ALGORITHM` | str | `"HS256"` | constant in `auth.py` | JWT signing algorithm |

**Pytest tests set `JWT_SECRET=test-secret-for-pytest-only` via session-scoped fixture** so token validity is deterministic across tests.

---

## Security Considerations

This slice **closes** the auth gap that slice-2 documented in its Security Considerations §. Posture after this slice ships:

| Layer | Status |
|---|---|
| **Authentication** | ✅ Server-side: every admin endpoint validates JWT signature + expiry + claim shape |
| **Authorization** | ✅ Server-side: per-endpoint `require_role([...])` mirrors slice-2's RoleGuard policy |
| **Token format** | ✅ Real JWT (HS256, 5 claims, 7-day TTL); `WWW-Authenticate: Bearer` on 401 (RFC 6750) |
| **Secret management** | ✅ `JWT_SECRET` env var; fail-fast in `production` if unset; random+WARNING in dev |
| **Token in logs** | ✅ Never logged (AT-018 grep guards); only `mac_hash[:8]`-style truncations or `event_type` enums |
| **CSRF protection** | ✅ Implicitly safe — header-based auth (not cookie-based); same-origin policy on Authorization header |
| **Password hashing** | ❌ Plaintext via `DEMO_ACCOUNTS` — **R5 slice's job**. Documented in Out of Scope. |
| **Refresh tokens** | ❌ Not in this slice — 7-day TTL is the simple flow. Future slice. |
| **Account lockout / MFA** | ❌ Not in this slice — security-hardening v2. |

**The slice closes Decision 8 (slice 2) entirely:** the two `// TODO(auth-hardening-slice)` markers in slice-2's code are removed by this slice's /build. Future security work is captured in dedicated slices (R5, audit-pipeline, etc.) with explicit motivation.

---

## Observability

| Aspect | Implementation This Slice | Future Slice |
|--------|---------------------------|--------------|
| **Auth event logs** | Structured `log.{info,warning}("auth_*", extra={"event_type": "..."})` calls in `auth.py` and `auth_routes.py`. Logger name `"auth"` (parallel to slice-1's `"portal"`). | Audit-pipeline slice (NFR-015) consumes by logger name + event_type. |
| **8 event types stubbed** | `auth_login_ok`, `auth_login_failed`, `auth_no_token`, `auth_token_expired`, `auth_invalid_token`, `auth_missing_claim`, `auth_role_denied`, `auth_forbidden` | Each becomes a metric/alert in audit-pipeline slice. |
| **Failed-login email visibility** | `email_prefix: body.email[:3]` (NOT full email) in `auth_login_failed` events | Sufficient for debugging without leaking PII; full-email logs are LGPD-risky. |

---

## Open Questions Resolution

| OQ | Resolution |
|----|-----------|
| **OQ-1** | `HTTPBearer(auto_error=False)` (Decision 1) — pre-design confirmed `OAuth2PasswordBearer` is wrong fit for our JSON login endpoint. |
| **OQ-2** | Fail-fast in production, random+WARNING in dev (Decision 6). `ENVIRONMENT` env var contract added. |
| **OQ-3** | No cookie fallback. Header-only. CSRF-safe by construction. |
| **OQ-4** | Logger name `"auth"` (Decision 1's `log = logging.getLogger("auth")`); parallel to slice-1's `"portal"`. |
| **OQ-5** | Yes — preserve `?next=<current-path>` (Decision 9). One extra line in client.ts. |
| **OQ-6** | LoginPage clears expired notice when user starts typing (standard form UX). Implementation: `?reason=expired` query-param-driven; on input change, optionally `setReason(null)` — `/build` decides. Default: leave the notice visible until form submit (simpler). |
| **OQ-7** | Yes — README §JWT_SECRET includes rotation note: "Rotating JWT_SECRET invalidates all in-flight tokens, forcing operators to re-login. Acceptable during scheduled maintenance; for incident-response key rotation, this is the intended behavior." |
| **OQ-8** | `mkt-wifi-admin/tests/contract/openapi_security.test.ts` — Decision 11. Catches future-slice drift mechanically. |

---

## Deferred Assumption Tracking

All 11 DEFINE assumptions are now resolved or stable:

| Assumption | Status After /design | Notes |
|------------|---------------------|-------|
| **A-001** python-jose 3.3+ availability | ✅ Pinned `>=3.3,<4` (latest 3.5.0 at /design time) | Verified via `pip index versions` |
| **A-002** HTTPBearer vs OAuth2PasswordBearer | ✅ Locked HTTPBearer (Decision 1) | Pre-design confirmed JSON-vs-form mismatch |
| **A-003** python-jose exception types | ✅ Confirmed `ExpiredSignatureError`, `JWTError` from `jose.exceptions` | Stable since 3.0 |
| **A-004** Plaintext DEMO_ACCOUNTS acceptable for slice 3 | ✅ Confirmed — R5 is separate slice | Out of scope locked |
| **A-005** Random-secret-on-startup posture | ✅ Locked: fail-fast in prod, random+WARNING in dev (Decision 6, OQ-2) | Best of both worlds |
| **A-006** Slice-1 portal tests don't touch admin routes | ✅ Verified by `grep` | AT-015 regression guard automatic |
| **A-007** Slice-2 frontend tests don't fire 401 | ✅ Confirmed by inspection | AT-016 regression guard automatic |
| **A-008** python-jose auto-validates `exp` | ✅ Confirmed in library docs | `verify_exp=True` is default |
| **A-009** Vite proxy forwards Authorization | ✅ Implicit (slice-2 was sending it; never validated, but proxy works) | No code change |
| **A-010** HS256 + 32-byte secret cryptographically sufficient | ✅ NIST recommendation = ≥256 bits | 32 bytes = 256 bits |
| **A-011** TanStack Query retry interaction with 401 | ✅ On 401, our interceptor logs out + redirects → page unmounts → retry never fires | Verified via slice-2 code inspection |

**No deferred risks carrying into /build.**

---

## Quality Gate

| Criterion | Status |
|---|---|
| Architecture diagram is clear | ✅ ASCII showing module boundaries, deletion targets, SPA delta, captive-portal isolation |
| All major decisions documented with rationale | ✅ **11 ADRs** (Decisions 1–11) with Context / Choice / Rationale / Alternatives / Consequences |
| File manifest is complete | ✅ **14 files** (5 Create + 9 Modify) with action, agent, dependencies |
| Code patterns are copy-paste ready | ✅ **7 patterns**: auth.py skeleton, auth_routes.py skeleton, main.py per-endpoint edit, SPA 401 interceptor, LoginPage notice, pytest fixtures, categorical integration test |
| Testing strategy covers requirements | ✅ All 20 ATs mapped to specific tests or CI checks |
| No circular dependencies | ✅ auth_routes.py → auth.py (one direction); main.py → auth.py + auth_routes.py (one direction); SPA edits depend on slice-2's existing modules only |
| Pre-build inspection found latent issues | ✅ EmailStr orphan import + zero-test-coverage on legacy login + `auth_routes.py` doesn't need lifespan — all surfaced and addressed |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-04 | design-agent | Initial design. Pre-design inspection resolved OQ-1 (HTTPBearer locked — OAuth2PasswordBearer mismatches our JSON login), validated A-001/A-002/A-005/A-006/A-009, and surfaced 4 bonus findings (orphan EmailStr, zero test coverage on legacy login, simpler-than-portal_routes lifespan, slice-2 LoginPage already wired for `?reason=expired`). 11 ADRs covering library version, FastAPI security scheme, dependency-pattern role guards, JWT claim shape, secret management with fail-fast, surgical main.py edits, pytest fixtures, ?next= preservation, RFC 6750 compliance, OpenAPI security contract test. 14-file manifest. 7 code patterns. All 20 ATs explicitly test-mapped. |

---

## Next Step

**Ready for:**
```
/build .claude/sdd/features/DESIGN_AUTH_HARDENING.md
```

This will dispatch the build agents per the file manifest:
- **@python-developer** for `auth.py`, `auth_routes.py`, surgical `main.py` edits, requirements.txt, README.md (5 files)
- **@test-generator** for `conftest.py` extension, `test_auth.py`, `test_auth_integration.py`, updated `test_main_integration.py`, `client.test.ts`, `openapi_security.test.ts` (6 files)
- **@react-specialist** for the 3 SPA file edits — `client.ts` interceptor, `RoleGuard.tsx` TODO removal, `LoginPage.tsx` expired notice (3 files)

**Estimated /build time** based on slice-1/slice-2 ratios:
- Slice 1: 48 files / ~2,700 LoC / 1 day of focused work
- Slice 2: 55 files / ~3,400 LoC / 2 days
- **Slice 3: 14 files / ~700-1000 LoC** projected / **~half-day to full-day** of focused work

The slice is small because slices 1+2 pre-wired so much (slice-2's `Authorization` header + TODO markers; slice-2's `STR.login.expired` already shipped; slice-1's `portal_routes.py` extraction pattern). This is the compounding payoff of the 5-phase workflow — each shipped slice raises the floor for the next one.
