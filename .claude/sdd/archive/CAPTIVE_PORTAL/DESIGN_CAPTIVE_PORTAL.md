# DESIGN: CAPTIVE_PORTAL

> Technical design for implementing the captive-portal vertical slice — a production-shaped Vite+React+TS SPA + 4 Pydantic-validated FastAPI endpoints + an in-memory session store. The Pydantic contract becomes the integration surface for every later slice (multi-tenancy, DB baseline, MikroTik POC).

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CAPTIVE_PORTAL |
| **Date** | 2026-05-03 |
| **Author** | design-agent (via /workflow:design) |
| **DEFINE** | [DEFINE_CAPTIVE_PORTAL.md](DEFINE_CAPTIVE_PORTAL.md) (15/15 clarity) |
| **BRAINSTORM** | [BRAINSTORM_CAPTIVE_PORTAL.md](BRAINSTORM_CAPTIVE_PORTAL.md) |
| **Status** | ✅ Shipped 2026-05-04 — archived |

---

## Pre-Design Repo Inspection (Assumption Validation)

> Per DEFINE §Assumptions, /design must validate A-001, A-007, A-008, A-009, A-011 against repo state. Findings:

| Assumption | Status | Finding |
|---|---|---|
| **A-011** (Python 3.11+ + Pydantic v2) | ✅ **VALIDATED** | [backend/Dockerfile](../../../backend/Dockerfile) uses `python:3.12-slim`; [backend/requirements.txt](../../../backend/requirements.txt) pins `pydantic[email]>=2.6`. Modern syntax (`Literal`, `X \| None`, `model_config = ConfigDict(...)`) works natively. |
| **A-009** (TTL constants) | ✅ **CONFIRMED via Decision 3 below** | `PENDING_AD_TTL = 600s`, `EXPIRED_GRACE_TTL = 300s`. Implemented as periodic asyncio GC task. |
| **A-001, A-007, A-008** (MikroTik redirect, video non-skip, upstream MAC hashing) | ⚠️ **DEFERRED** to /build manual QA + future MikroTik POC slice | All three depend on MikroTik POC (R2). For this slice they remain assumptions; the design accommodates either resolution. |
| **A-005** (in-memory dict, single worker) | ✅ **VALIDATED via Decision 3** | Single-uvicorn-worker mode documented in Configuration section. |
| **Bonus finding — R13 materialized in code** | ⚠️ **MUST FIX** | [backend/main.py:196-218](../../../backend/main.py#L196-L218) `POST /api/connect` already exists, violates NFR-005 (collects `phone`/`email`/last name, calls WhatsApp). [backend/main.py:288-304](../../../backend/main.py#L288-L304) `GET /api/connection/form` returns a forbidden-field form schema. Both must be **deleted** in this slice — see Decision 1. |
| **Bonus finding — existing main.py uses old idioms** | ✅ **DOCUMENTED** | `from __future__ import annotations`, `class Config: from_attributes = True`, `Optional[X]`. New files use Pydantic v2 + modern Python idioms. Style divergence is intentional (sets migration target). |

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          CAPTIVE PORTAL — VERTICAL SLICE                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  End-user device (mobile, cellular)                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐     │
│  │  GET  /portal?venue_id=…&device_id=…&mac_hash=…                        │     │
│  │  (URL appended by MikroTik captive-portal redirect — see A-001)        │     │
│  └────────────────────────────────────────────────────────────────────────┘     │
│                                       │                                          │
│                                       ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐     │
│  │  captive-portal-frontend/  (Vite dev :5173 → built static :443 prod)   │     │
│  │                                                                        │     │
│  │   ┌─────────┐    ┌─────────┐                                           │     │
│  │   │ main.tsx│ ─► │ App.tsx │ ◄─ useReducer(machine, initialState)      │     │
│  │   └─────────┘    └─────────┘                                           │     │
│  │                       │                                                │     │
│  │   ┌──────────────────┴──────────────────┐                              │     │
│  │   │  state/  ───── machine.ts (reducer) │                              │     │
│  │   │          ───── api.ts (typed fetch) │                              │     │
│  │   │          ───── types.ts (mirrors    │                              │     │
│  │   │                       Pydantic)     │                              │     │
│  │   └─────────────────────────────────────┘                              │     │
│  │                       │                                                │     │
│  │   ┌──────────────────┴──────────────────────────────────────────────┐  │     │
│  │   │  screens/   Connecting → Form → Ad → Connected → Renew         │  │     │
│  │   │  ui/        Pill / ChipGroup / Field / CheckboxConsent /       │  │     │
│  │   │             CountdownRing / Button                             │  │     │
│  │   │  strings.ts (frozen pt-BR copy — verbatim from prototype)      │  │     │
│  │   │  styles.css (CSS variables, no Tailwind, no CSS-in-JS)         │  │     │
│  │   └─────────────────────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────────────────────┘     │
│                                       │                                          │
│                  (CORS-allowed fetch, JSON, no cookies/JWT)                      │
│                                       ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐     │
│  │  FastAPI (:8000)                                                       │     │
│  │                                                                        │     │
│  │   main.py  ──── (existing admin routes, untouched except for…)         │     │
│  │            ┌── DELETED  POST /api/connect          (NFR-005 violation) │     │
│  │            └── DELETED  GET  /api/connection/form  (NFR-005 violation) │     │
│  │            ── ADDED   app.include_router(portal_router)                │     │
│  │                                                                        │     │
│  │   portal_routes.py  ───────────────────────────────────────────────┐   │     │
│  │     • portal_router = APIRouter(prefix="/api", tags=["portal"])    │   │     │
│  │     • GET  /api/portal/bootstrap                                   │   │     │
│  │     • POST /api/connect                                            │   │     │
│  │     • POST /api/sessions/{id}/ad-complete                          │   │     │
│  │     • POST /api/sessions/{id}/renew                                │   │     │
│  │     • In-memory SESSIONS: dict[UUID, SessionState]                 │   │     │
│  │     • Periodic GC task (PENDING_AD_TTL=600s, EXPIRED_GRACE=300s)   │   │     │
│  │     • Stub authorize_mac_stub(mac_hash, expires_at) → True         │   │     │
│  │     • log.info(event_type=…) on every state transition (OQ-5)      │   │     │
│  │                                       │                            │   │     │
│  │   schemas/portal.py  ◄────────────────┘                            │   │     │
│  │     • LeadIn (extra="forbid", Literal types)                       │   │     │
│  │     • ConnectRequest, ConnectResponse                              │   │     │
│  │     • BootstrapResponse, Branding, Venue, Organization,            │   │     │
│  │       FormConfig, FormField, CampaignAd                            │   │     │
│  │     • AdCompleteResponse, RenewResponse                            │   │     │
│  │                                       │                            │   │     │
│  │   fixtures/portal_fixtures.py  ◄──────┘                            │   │     │
│  │     • PRACA_CENTRAL_VENUE  (single fixture)                        │   │     │
│  │     • CAFE_IMPERIAL_CAMPAIGN  (single fixture)                     │   │     │
│  │     • FORM_CONFIG_LOCKED  (4 fields, frozen per FR-022/023)        │   │     │
│  │     • VENUE_SALT_PRACA_CENTRAL (placeholder, OQ-4)                 │   │     │
│  └────────────────────────────────────────────────────────────────────┘   │     │
│                                                                            │     │
│   NOT TOUCHED in this slice:                                               │     │
│   ─ backend/db.py  ─ backend/mikrotik_api.py  ─ backend/notifications.py   │     │
│   ─ mkt-wifi-frontend/ (admin SPA)                                         │     │
│                                                                            │     │
└────────────────────────────────────────────────────────────────────────────┘     │
                                                                                   │
```

---

## Components

| Component | Purpose | Technology | Location |
|-----------|---------|------------|----------|
| **Captive-Portal SPA** | 5-screen end-user flow (`connecting → form → ad → connected → renew`) | Vite 5 + React 18 + TypeScript 5 (strict) | `captive-portal-frontend/` (NEW) |
| **State machine** | Pure reducer + 5 action types; mirrors prototype's `step` variable | `useReducer` (no XState) | `captive-portal-frontend/src/state/machine.ts` |
| **Typed API client** | Hand-written fetch wrapper mirroring Pydantic schemas | `fetch` + TypeScript discriminated unions | `captive-portal-frontend/src/state/api.ts` |
| **Strings module** | Single source of truth for verbatim pt-BR copy (AT-018) | TS frozen object | `captive-portal-frontend/src/strings.ts` |
| **Portal Router** | 4 FastAPI endpoints isolated from admin routes | FastAPI `APIRouter` | `backend/portal_routes.py` (NEW) |
| **Portal Schemas** | Pydantic v2 models with `extra="forbid"` + `Literal` types enforcing NFR-005 | Pydantic 2.6+ | `backend/schemas/portal.py` (NEW) |
| **Portal Fixtures** | Single venue + campaign + form-config fixture | Plain Python module | `backend/fixtures/portal_fixtures.py` (NEW) |
| **Session Store** | `dict[UUID, SessionState]` with periodic asyncio GC | Std-lib only (no Redis) | inside `portal_routes.py` |
| **MikroTik Stub** | `authorize_mac_stub(mac_hash, expires_at) → bool` returning True | Plain function | inside `portal_routes.py` |
| **Tests (backend)** | pytest contract + integration tests for all 4 endpoints | `pytest`, `httpx.AsyncClient` | `backend/tests/test_portal_*.py` |
| **Tests (frontend e2e)** | Playwright tests covering AT-001..AT-014, AT-018 | `@playwright/test` | `captive-portal-frontend/tests/e2e/*.spec.ts` |
| **Tests (frontend unit)** | Reducer logic, string-formatting helpers | `vitest` | `captive-portal-frontend/tests/unit/*.test.ts` |
| **PII grep check** | Bash script run in CI implementing AT-015 | shell + grep | `backend/scripts/grep_pii_check.sh` (NEW) |

---

## Key Decisions

### Decision 1: Delete the existing `POST /api/connect` and `GET /api/connection/form` from `main.py`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |

**Context:** Pre-design repo inspection found that [backend/main.py:196-218](../../../backend/main.py#L196-L218) already implements `POST /api/connect` and [backend/main.py:288-304](../../../backend/main.py#L288-L304) implements `GET /api/connection/form`. Both **violate NFR-005** (the existing `ConnectionRequest` collects `phone`, `email`, last name; the existing form-config returns a forbidden-field schema with `phone`, `email` types). FastAPI cannot mount two routes at the same path.

**Choice:** Delete the existing implementations from `main.py`. The new `portal_router` registers the LGPD-compliant versions at the same paths. The `_age_from_band` helper, demo-account constants, and other unrelated code in `main.py` remain untouched.

**Rationale:**
1. Coexistence is impossible — FastAPI raises `RuntimeError` on duplicate path+method.
2. Renaming the legacy route to `/api/connect_legacy` is just deferred deletion, prolonging the LGPD violation.
3. `mkt-wifi-frontend/` (admin SPA) does **not** call `/api/connect` — verified by `grep -rn "/api/connect" mkt-wifi-frontend/`. The captive-portal SPA is the only consumer, and it doesn't exist yet, so no client breaks.
4. The DEFINE doc explicitly anticipated this: *"old monolithic route in `backend/main.py:line ~250` will be deprecated/removed when `portal_routes.py` lands."*

**Alternatives Rejected:**
1. **Keep both with feature flag** — no flagging infra exists; would require new dependency (e.g., `unleash`, `flagsmith`) for a one-time migration.
2. **Mount old route at `/api/connect_legacy`** — preserves LGPD violation indefinitely; signals "we know it's broken, we're keeping it broken."
3. **Skip the deletion, mount new router at `/api/portal/connect`** — breaks the contract locked in BRAINSTORM and DEFINE; introduces gratuitous path churn.

**Consequences:**
- One-time `main.py` cleanup commits ~25 LoC of deletions.
- The legacy `ConnectionRequest`, `_age_from_band` helper, and the WhatsApp send-on-connect become dead code and are removed in the same commit.
- The unused `notifications.py:send_whatsapp` function call site disappears — but the file itself stays (out of scope to delete; future notifications slice may use it).

---

### Decision 2: APIRouter pattern with `prefix="/api"` and `tags=["portal"]`

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |

**Context:** BRAINSTORM Validation 1 mandated isolation between admin routes (auth-gated, JWT-validated in future) and portal routes (unauthenticated by design). FR-039 requires the portal to be a separate React build; the same logical separation should exist on the backend so future security middleware can attach per-router.

**Choice:** `portal_router = APIRouter(prefix="/api", tags=["portal"])`. Routes within the router use the relative path (e.g., `@portal_router.get("/portal/bootstrap")` resolves to `/api/portal/bootstrap`). `main.py` mounts via `app.include_router(portal_router)`. OpenAPI docs (AT-016) will show all 4 endpoints under a "portal" tag group.

**Rationale:**
- Idiomatic FastAPI; zero learning curve.
- Tag groups satisfy AT-016 ("All 4 portal endpoints are listed under a tagged group").
- Future auth middleware can be added via `dependencies=[Depends(verify_admin_token)]` on the admin router without touching the portal router.

**Alternatives Rejected:**
1. **Inline routes in main.py** — explicitly rejected in BRAINSTORM Validation 1.
2. **Separate FastAPI sub-app via `app.mount("/portal", sub_app)`** — generates a *separate* OpenAPI doc, which would split the contract artifact at exactly the moment we want it unified.

**Consequences:**
- Adding new portal endpoints in future slices is `@portal_router.x(...)` — no `main.py` edit needed.
- The portal router can be unit-tested in isolation (instantiate a separate `FastAPI()`, include only the portal router, hit it with `httpx.AsyncClient`).

---

### Decision 3: In-memory session store with TTL — pure stdlib, no Redis

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |
| **Resolves** | OQ-1, OQ-2, A-009 |

**Context:** The vertical slice doesn't yet have DB persistence; sessions live in process memory. Without a TTL, the dict grows unboundedly under any non-trivial demo traffic.

**Choice:**
```python
SESSIONS: dict[UUID, SessionState] = {}
PENDING_AD_TTL = 600   # 10 min — pending_ad sessions never completing
EXPIRED_GRACE_TTL = 300  # 5 min — keep expired sessions to allow renewal
```
A periodic asyncio task (started in the FastAPI `lifespan`) wakes every 60 s and removes sessions matching the GC predicate. Single uvicorn worker (`--workers 1`) so the dict is shared.

**Rationale:**
- Stdlib only, no new deps.
- 10 min covers cellular users on slow first-form submission; longer than ad duration, shorter than typical attention span.
- 5 min post-expiry grace is enough to support the "Renew" flow (user sees the renew screen and decides) without holding state forever.
- GC every 60 s amortizes O(N) scan cost; with TTLs of minutes, the dict size in steady state is bounded by `traffic × TTL`.

**Alternatives Rejected:**
1. **Redis** — overkill for a vertical slice; new dep + new container; future DB-baseline slice supersedes anyway.
2. **`cachetools.TTLCache`** — adds an external dep for ~30 LoC of straightforward GC logic.
3. **No GC** — accepts unbounded memory growth; would fail any soak test.

**Consequences:**
- Sessions evaporate on FastAPI restart (acceptable per DEFINE Out-of-Scope).
- `--workers > 1` would break the demo because each worker gets its own dict (acceptable per OQ-2 default).
- The GC task is also a **forward-compat probe**: when DB persistence lands, this task disappears entirely; the schema design doesn't need to change.

---

### Decision 4: Frontend state — `useReducer` with discriminated-union actions

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |

**Context:** BRAINSTORM Decision #5 already locked `useReducer` over XState. /design needs to specify the state and action shapes.

**Choice:**
```typescript
type Step = "connecting" | "form" | "ad" | "connected" | "renew";

type State = {
  step: Step;
  bootstrap: BootstrapResponse | null;
  sessionId: UUID | null;
  firstName: string | null;
  expiresAt: string | null;          // ISO 8601 from backend
  adSeconds: number;                 // 30 first session, 60 on renewal
};

type Action =
  | { type: "BOOTSTRAP_LOADED"; payload: BootstrapResponse }
  | { type: "CONNECTING_DONE" }
  | { type: "FORM_SUBMITTED"; payload: { sessionId: UUID; firstName: string; adSeconds: number } }
  | { type: "AD_COMPLETED"; payload: { expiresAt: string } }
  | { type: "TIMER_EXPIRED" }
  | { type: "RENEW_REQUESTED"; payload: { adSeconds: number } };
```
Reducer is a pure switch on `action.type`. All side effects (fetch calls, timers) live in `useEffect` hooks inside the screens, dispatching actions on completion.

**Rationale:**
- Discriminated union → TypeScript proves exhaustiveness at compile time (`assertNever(action)` on the default branch).
- Pure reducer is trivially unit-testable (`vitest`): dispatch action sequences and assert state.
- Mirrors prototype's `step ∈ {…}` switch verbatim — minimum surprise for anyone reading the prototype source first.

**Alternatives Rejected:**
1. **`useState` with handler functions** — looser invariants; harder to enforce that all transitions go through the reducer.
2. **XState** — heavyweight for 5 states + 5 transitions; learning curve for future contributors.
3. **React Context for global state** — overkill; no other consumer of state outside `App.tsx`.

**Consequences:**
- `App.tsx` is the entire transition map — readable in one screen.
- Test plan: a `machine.test.ts` (vitest) hits 100% reducer coverage with ~30 lines of test.

---

### Decision 5: Verbatim pt-BR copy in `src/strings.ts` (frozen object)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |

**Context:** AT-018 is a verbatim DOM-snapshot diff against a fixture extracted from the prototype source. To make this trivially passable — and to set up future i18n cleanly — every UI string lives in one module.

**Choice:** `src/strings.ts` exports a frozen, deeply-nested const object organized by screen. Components import from it. No string literals appear in JSX.

```typescript
export const STR = {
  connecting: {
    seq1: { title: "Procurando rede…", subtitle: "Localizando sinal Wi-Fi disponível na praça." },
    seq2: { title: "Rede encontrada", subtitle: "{ssid} · sem senha" },
    seq3: { title: "Pronto para conectar", subtitle: "Redirecionando para o portal de acesso." },
  },
  form: {
    pillTemplate: "{venue} · WI-FI GRATUITO",
    headline: "Acesso liberado em 30 minutos.",
    sub: "Preencha rapidinho e assista a um vídeo de 30s para começar a navegar.",
    fields: {
      name: { label: "Nome", placeholder: "Seu primeiro nome" },
      age: { label: "Idade" },
      gender: { label: "Gênero" },
      neighborhood: { label: "Bairro" },
    },
    consent: "Aceito os {termsLinkOpen}termos de uso{termsLinkClose} e o tratamento dos meus dados conforme a LGPD.",
    privacyReassurance: "Seus dados ficam seguros e nunca são vendidos.",
    submit: "Continuar →",
  },
  ad: {
    badge: "ANÚNCIO",
    nonSkippable: "Não é possível pular o anúncio",
  },
  connected: {
    eyebrow: "CONECTADO",
    headlineTemplate: "Aproveite, {firstName}!",
    sub: "Já pode usar a internet livremente.",
    infoCardTitle: "Quando o tempo acabar",
    infoCardBody: "Assista a um vídeo de 1 minuto e ganhe mais 30 min.",
    foot: "Pode fechar esta aba e usar normalmente.",
  },
  renew: {
    headline: "Seu tempo acabou.",
    sub: "Assista a um vídeo de 1 minuto e ganhe mais 30 minutos de acesso.",
    statAd: "Anúncio: 60s",
    statAccess: "Acesso liberado: 30 min",
    cta: "Assistir e renovar",
  },
} as const;
```

**Rationale:**
- AT-018 is a one-step diff: serialize `STR` deterministically; assert byte-equal to `expected_strings_pt-BR.txt`.
- Future i18n is a one-file refactor — `STR` becomes a message catalog; values become catalog keys.
- TypeScript treats `as const` strings as literal types; typos in keys fail at compile time.

**Alternatives Rejected:**
1. **Inline string literals** — drift risk; AT-018 becomes fragile.
2. **JSON catalog file** — less DX-friendly than a typed module; no compile-time key checking.
3. **react-intl from day 1** — premature; we have one language and a tiny string set.

**Consequences:**
- New strings must go through `strings.ts` — slight friction is the point (forces deliberate copy decisions).
- Template strings (`{firstName}`, `{venue}`, `{termsLinkOpen}`) are tiny helper functions in `ui/format.ts`.

---

### Decision 6: TypeScript types hand-written in `state/types.ts` (not auto-generated yet)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |

**Context:** TypeScript types must mirror the Pydantic schemas. Two practical options: hand-write or auto-generate via `openapi-typescript`.

**Choice:** Hand-write `src/state/types.ts` for this slice. Future slice adopts `openapi-typescript` when type surface grows beyond ~200 LoC.

**Rationale:**
- Current type surface is ~150 LoC — hand-written is reviewable.
- Auto-generation pulls in `openapi-typescript` (build dep) + a CI step to regenerate when schemas change — overhead exceeds benefit at this size.
- A backend pytest test (`test_openapi_types_match_fixture`) loads `/openapi.json` and asserts the 13 model field sets equal a frozen fixture — catches drift between hand-written types and Pydantic schemas at CI time.

**Alternatives Rejected:**
1. **`openapi-typescript`** — premature tooling; can be adopted incrementally later.
2. **`zod` schemas client-side** — adds ~12 KB gzipped; not requested by any AT; runtime validation duplicates Pydantic's job.

**Consequences:**
- Two-file maintenance burden if Pydantic schemas change — mitigated by the OpenAPI fixture test.
- Adoption-path note: if the surface grows past ~200 LoC, switch to `openapi-typescript` in a dedicated PR.

---

### Decision 7: Vite config splits ad-player into a lazy chunk

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |

**Context:** COULD goal: initial JS bundle ≤ 100 KB gzipped. The user only sees the ad after ~3.1 s connecting + form completion — deferring the ad-player chunk saves bytes on first paint.

**Choice:** Vite `build.rollupOptions.output.manualChunks` splits `screens/AdScreen.tsx` (and any video utilities) into a separate chunk. `ConnectingScreen` and `FormScreen` use `React.lazy` only on the ad chunk; other screens load eagerly.

**Rationale:**
- The ad is the heaviest screen (video element + countdown ring + overlay).
- Connecting + Form are the time-sensitive screens — every ms before first paint matters on cellular.
- Rollup's `manualChunks` is a single config block; no app-code change.

**Alternatives Rejected:**
1. **Single bundle** — simpler but breaks the COULD budget on cellular.
2. **`React.lazy` everywhere** — overkill; connecting/form/connected/renew screens are ~3 KB each.

**Consequences:**
- Slight build-config complexity (~5 lines in `vite.config.ts`).
- Ad chunk loads while user is on form — by the time they submit, chunk is cached.

---

### Decision 8: Inline minimal CSS via CSS variables (no Tailwind, no CSS-in-JS)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |

**Context:** NFR-009 (mobile cellular fallback) makes every byte count. Tailwind even after purge ships ~10 KB CSS for a 5-screen app; CSS-in-JS adds runtime JS overhead.

**Choice:** Single `src/styles.css` using CSS custom properties (`--accent`, `--surface`, `--surface2`) for theming. Class names follow a flat BEM-ish convention (`.screen`, `.screen__header`, `.chip`, `.chip--selected`). Components reference classes via plain `className`.

**Rationale:**
- Smallest possible CSS payload.
- CSS variables make per-tenant branding (when multi-tenancy lands) a one-line `<style>` injection driven by `BootstrapResponse.venue.branding`.
- No runtime JS for styles → faster first paint.

**Alternatives Rejected:**
1. **Tailwind** — even purged, large for a 5-screen app; utility-class JSX hurts readability of locked-spec components.
2. **styled-components / emotion** — runtime overhead; serialization on hydration.
3. **CSS Modules** — Vite supports natively but adds class-name mangling; benefit is collision-prevention at a scope where collisions are extremely unlikely.

**Consequences:**
- Hand-managed class names; small enough that conflicts are unlikely.
- When per-tenant branding lands, `App.tsx` injects `--accent: ${branding.primary_color}` into a `<style>` element on bootstrap.

---

### Decision 9: Playwright over Cypress for e2e tests

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |

**Context:** AT-001..AT-014 + AT-018 require browser automation; AT-013 needs viewport emulation; AT-014 needs computed-style introspection.

**Choice:** `@playwright/test` with TypeScript. Config in `playwright.config.ts` defines a single project (`{ name: "iPhone 14 Pro", use: { ...devices["iPhone 14 Pro"] } }`) that runs all e2e specs at the locked viewport.

**Rationale:**
- Built-in `devices["iPhone 14 Pro"]` preset = exactly 390 × 844 — AT-013 free.
- `locator(".chip").first().boundingBox()` exposes computed sizing for AT-014.
- TypeScript-first; better IDE story than Cypress.
- Playwright runs all browsers (Chromium, WebKit, Firefox); WebKit covers iOS Safari (relevant to A-007).

**Alternatives Rejected:**
1. **Cypress** — also fine; team preference would be valid override.
2. **Selenium** — deprecated for new TS projects.

**Consequences:**
- One additional dev dep (~30 MB on disk).
- CI-time cost: ~1 min for the suite.

---

### Decision 10: Structured event logging at every state transition (OQ-5)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-03 |
| **Resolves** | OQ-5 |

**Context:** Future observability slice will want session lifecycle data; we want a forward-compat hook without adding any observability dep now.

**Choice:** Each state transition in `portal_routes.py` emits `log.info("portal_event", extra={...})` with structured fields:
- `event_type`: `"session_pending_ad" | "session_authorized" | "session_expired" | "session_renewed" | "session_gc_pending" | "session_gc_expired"`
- `session_id`: UUID string
- `venue_id`: UUID string
- `mac_hash_prefix`: first 8 chars of `mac_hash` (full hash never logged — LGPD safety)

**Rationale:**
- Stdlib `logging` only — no Cloud Logging / Langfuse dep.
- `extra={...}` is JSON-serializable; future observability slice attaches a `JsonFormatter` and pipes to whatever sink lands.
- LGPD-safe: no first_name, no full mac_hash, no consent_text — only IDs and event types.

**Alternatives Rejected:**
1. **Wire Langfuse / Cloud Logging now** — premature; future slice picks the sink.
2. **No logging** — leaves /build with nothing to grep; future slice has to instrument retroactively.

**Consequences:**
- 8 `log.info` calls in `portal_routes.py` (~16 LoC).
- Future observability slice is a config change (formatter + handler), not a code rewrite.

---

### Decision 11: AdScreen retry/error UX — bounded, observable, recoverable (added v1.1)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (v1.1, 2026-05-04) |
| **Date** | 2026-05-04 |
| **Trigger** | Post-ship `/iterate` after live-flow testing surfaced a silent retry loop in `AdScreen.tsx` when `postAdComplete` fails (e.g., backend restart between form-submit and ad-complete → 404 `session_not_found`). The original Error Handling table specified the right behavior ("retry up to 3 times with exponential backoff (1s, 2s, 4s); on 3rd failure show error overlay") but was too terse for an implementer to follow, so /build shipped an unbounded silent retry instead. |

**Context:** `AdScreen.tsx`'s original on-completion effect set `completing=false` after 2 seconds in the `catch` branch. Because `remaining` stayed at 0, the effect re-fired the POST forever with no UX feedback. Three failure modes hit this code path in practice:
1. Backend restart between form-submit and ad-complete (in-memory `SESSIONS` wiped, returns 404)
2. Network blip on cellular (transient connection error)
3. Backend down entirely (`ECONNREFUSED`)

All three deserve different UX, but the silent loop hides them all behind the same blank ad screen.

**Choice:** Implement a bounded retry state machine inside AdScreen with **3 attempts at delays [1 s, 2 s, 4 s]**. On attempts 1–3, show a small inline status banner (`"Liberando acesso…"` for first attempt, `"Tentando novamente em {n} s…"` between retries). On 3rd failure, transition to a **full-screen error overlay** with:
- Headline: `"Não foi possível liberar o acesso."`
- Sub: `"Verifique sua conexão ou recarregue a página."`
- Primary CTA: `"Tentar novamente"` → resets the retry state machine and re-fires `postAdComplete`
- Secondary text-link: `"Recarregar página"` → `window.location.reload()` (resets the entire flow if the session is permanently lost)

Encapsulate the retry sequencing in a **pure helper** `withRetries(fn, delays)` exported from `src/state/retry.ts` so it's unit-testable without rendering `AdScreen`. The helper returns a discriminated union: `{ok: T} | {err: Error, attempts: number}`. The unit test asserts: 0 retries on first success, exactly 3 attempts on permanent failure, delays observed via mock timers, no infinite loop.

**Rationale:**
- The retry pattern was already specified in §Error Handling but absent from the Code Patterns section — adding it as Decision 11 closes the gap so the pattern is unmissable next time.
- Pure helper isolated from React lets us test the timing logic with `vi.useFakeTimers()` without `@testing-library/react` (which we don't currently have as a dep).
- Three attempts × maximum 4 s delay = ~7 s worst case before the user sees a clear error — fast enough to feel responsive, slow enough that 1-second cellular blips don't trigger the overlay.
- Two CTAs cover both "this might be transient" (Tentar novamente) and "the session is gone" (Recarregar página). The latter is critical for the most-likely production failure mode: backend restart between form and ad-complete.

**Alternatives Rejected:**
1. **Indefinite retry with status indicator** — preserves the silent-loop's UX flaw; user can never recover when the session is permanently dead.
2. **Single attempt, immediate error** — too aggressive; cellular blips would surface as failures.
3. **`react-query` / `swr` for retry orchestration** — adds a 5+ KB dep for ~30 LoC of stdlib logic. Future slice may adopt one of these libraries, but premature here.
4. **Shared retry helper across the whole codebase** — only AdScreen needs it today; over-abstracting before the second use-case is YAGNI.

**Consequences:**
- New file: `src/state/retry.ts` (~25 LoC; `withRetries` helper + tiny `delay()` utility).
- `AdScreen.tsx` rewrite: ~25 LoC delta (replaces the in-effect retry loop with a `useEffect → withRetries → setError` pattern).
- New strings under `STR.errors.adComplete` in `strings.ts`.
- New CSS class `.error-overlay` (~30 LoC of styles, mostly already in `.error-banner` / `.btn`).
- New unit test `tests/unit/retry.test.ts` (~30 LoC; uses `vi.useFakeTimers()`).
- Bundle size delta: < 1 KB gzipped (helper + strings + CSS).
- Closes the silent-loop UX flaw without changing the API contract or the state machine in `machine.ts` (retry happens *within* the `ad` step; it doesn't add new actions or transitions).
- Forward-compat: future MikroTik POC slice's failures (real authorize-MAC errors) reuse the same retry helper unchanged.

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| **Backend (Python)** | | | | | |
| 1 | `backend/schemas/__init__.py` | Create | Package marker | @python-developer | — |
| 2 | `backend/schemas/portal.py` | Create | 13 Pydantic v2 models (Locked categorical types, BootstrapResponse, ConnectRequest, ConnectResponse, AdCompleteResponse, RenewResponse + nested Org/Venue/Branding/FormConfig/CampaignAd/LeadIn/ConsentIn) — `extra="forbid"` everywhere | @python-developer | 1 |
| 3 | `backend/fixtures/__init__.py` | Create | Package marker | @python-developer | — |
| 4 | `backend/fixtures/portal_fixtures.py` | Create | Single-venue fixture (`PRACA_CENTRAL_VENUE`, `CAFE_IMPERIAL_CAMPAIGN`, `FORM_CONFIG_LOCKED`, `VENUE_SALT_PRACA_CENTRAL` placeholder) returning Pydantic instances | @python-developer | 2 |
| 5 | `backend/portal_routes.py` | Create | `APIRouter` with 4 endpoints + `SESSIONS` dict + GC asyncio task + `authorize_mac_stub` + structured event logging | @python-developer | 2, 4 |
| 6 | `backend/main.py` | **Modify** | (a) DELETE `ConnectionRequest` class (lines 67-74), (b) DELETE `POST /api/connect` route (lines 196-218), (c) DELETE `_age_from_band` helper (lines 220-221), (d) DELETE `GET /api/connection/form` route (lines 288-304), (e) ADD `from portal_routes import portal_router` and `app.include_router(portal_router)` | @python-developer | 5 |
| 7 | `backend/scripts/grep_pii_check.sh` | Create | CI script implementing AT-015: grep for `phone\|email\|cpf\|last_name\|raw_mac` as field identifiers in `portal_routes.py`, `schemas/portal.py`, `captive-portal-frontend/src/`. Whitelist comment lines. Exit non-zero on match. | @python-developer | — |
| 8 | `backend/conftest.py` | Create | pytest fixtures: `client` (httpx.AsyncClient against a fresh app instance with only `portal_router`), `clean_sessions` (autouse, clears `SESSIONS` before each test) | @test-generator | 5 |
| 9 | `backend/tests/__init__.py` | Create | Package marker | @test-generator | — |
| 10 | `backend/tests/test_portal_schemas.py` | Create | Unit tests: AT-003 (parameterized over forbidden fields), Literal-type rejection, `consent.accepted=False` semantics, AgeBand/Gender/Neighborhood enumerations | @test-generator | 2, 8 |
| 11 | `backend/tests/test_portal_routes.py` | Create | Integration tests: AT-005 (bootstrap shape), AT-007 (submit-and-close), AT-008 (renew), AT-009 (404), GC behavior with monkey-patched time | @test-generator | 5, 8 |
| 12 | `backend/tests/test_openapi_contract.py` | Create | Loads `/openapi.json`, asserts the 13 model schemas have the locked field sets (drift detection per Decision 6) | @test-generator | 5, 8 |
| 13 | `backend/tests/test_main_integration.py` | Create | Smoke test: existing admin endpoints (`/api/kpis`, `/api/campaigns`) still respond after `main.py` edits in #6; portal endpoints respond at expected paths | @test-generator | 6, 8 |
| **Frontend (TypeScript / Vite / React)** | | | | | |
| 14 | `captive-portal-frontend/.gitignore` | Create | `node_modules`, `dist`, `.vite`, `playwright-report`, `test-results`, `*.log` | @react-specialist | — |
| 15 | `captive-portal-frontend/package.json` | Create | Pinned versions: `react@^18.3`, `react-dom@^18.3`, `vite@^5.4`, `typescript@^5.5`, `@playwright/test@^1.45`, `vitest@^2.0`, `eslint@^9` | @react-specialist | — |
| 16 | `captive-portal-frontend/tsconfig.json` | Create | `strict: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `isolatedModules: true` | @react-specialist | 15 |
| 17 | `captive-portal-frontend/vite.config.ts` | Create | React plugin; `manualChunks` splitting `AdScreen` into `ad-chunk` (Decision 7); dev proxy `/api → http://localhost:8000`; `server.port: 5173` | @react-specialist | 15 |
| 18 | `captive-portal-frontend/.eslintrc.cjs` | Create | `@typescript-eslint/recommended`, `react-hooks/recommended`, `no-restricted-syntax: [error, "Literal[value=/phone\|email\|cpf\|last_name/]"]` (belt-and-suspenders for AT-015 on the frontend) | @react-specialist | 15 |
| 19 | `captive-portal-frontend/index.html` | Create | Single `<div id="root">`; `<meta name="viewport" content="width=device-width, initial-scale=1">`; pt-BR `<html lang="pt-BR">` | @react-specialist | — |
| 20 | `captive-portal-frontend/src/main.tsx` | Create | `ReactDOM.createRoot(document.getElementById("root")!).render(<App />)`; reads URL search params (`venue_id`, `device_id`, `mac_hash`) and passes as props | @react-specialist | 21 |
| 21 | `captive-portal-frontend/src/App.tsx` | Create | `useReducer(machine, initialState)`; renders the screen matching `state.step`; bootstrap fetch in `useEffect` on mount; injects `--accent` CSS variable from `bootstrap.venue.branding.primary_color` | @react-specialist | 22, 23, 24, 25, 27, 28, 29, 30, 31 |
| 22 | `captive-portal-frontend/src/state/types.ts` | Create | Hand-written TS types mirroring all 13 Pydantic schemas (Decision 6) | @react-specialist | — |
| 23 | `captive-portal-frontend/src/state/machine.ts` | Create | Pure reducer + `Action` discriminated union + `assertNever` exhaustiveness check (Decision 4) | @react-specialist | 22 |
| 24 | `captive-portal-frontend/src/state/api.ts` | Create | Typed fetch wrappers: `getBootstrap(query)`, `postConnect(body)`, `postAdComplete(sessionId)`, `postRenew(sessionId)`. All return `Promise<TypeFromTypes>`. Throws on non-2xx with structured error | @react-specialist | 22 |
| 25 | `captive-portal-frontend/src/strings.ts` | Create | Frozen pt-BR copy object (Decision 5) — verbatim port from prototype | @react-specialist | — |
| 26 | `captive-portal-frontend/src/ui/format.ts` | Create | Tiny helpers: `formatTemplate(t, vars)`, `getFirstName(fullName)` (whitespace-split, take [0]) | @react-specialist | — |
| 27 | `captive-portal-frontend/src/screens/ConnectingScreen.tsx` | Create | 3 sequenced messages over 3.1 s (1.4 + 1.0 + 0.7); on completion dispatches `CONNECTING_DONE`. FR-021 verbatim | @react-specialist | 25, 26, 28, 29 |
| 28 | `captive-portal-frontend/src/screens/FormScreen.tsx` | Create | Pill + headline + 4 fields + consent checkbox + submit. Validates first_name >= 3 chars trimmed; submit disabled until consent && all fields valid; on submit calls `postConnect`, dispatches `FORM_SUBMITTED` | @react-specialist | 24, 25, 26, 30, 31, 32, 33 |
| 29 | `captive-portal-frontend/src/screens/AdScreen.tsx` | Create | Black `<div>` placeholder + `ANÚNCIO` badge + mute toggle + countdown (decreases via `setInterval(1000)`) + non-skippable copy. On 0 calls `postAdComplete`, dispatches `AD_COMPLETED`. **Lazy-loaded chunk per Decision 7.** | @react-specialist | 24, 25 |
| 30 | `captive-portal-frontend/src/screens/ConnectedScreen.tsx` | Create | ✓ badge + `CONECTADO` eyebrow + interpolated headline + 200×200 SVG circular ring (`strokeDashoffset`) + info card. On expiry dispatches `TIMER_EXPIRED` | @react-specialist | 25, 26, 34 |
| 31 | `captive-portal-frontend/src/screens/RenewScreen.tsx` | Create | Clock icon + headline + sub + stat grid + CTA. CTA calls `postRenew`, dispatches `RENEW_REQUESTED`, transitions to `ad` with `adSeconds=60` | @react-specialist | 24, 25 |
| 32 | `captive-portal-frontend/src/ui/Pill.tsx` | Create | Brand pill (FR-027) | @react-specialist | — |
| 33 | `captive-portal-frontend/src/ui/ChipGroup.tsx` | Create | Chip group with `aria-pressed`, ≥44 px touch target | @react-specialist | — |
| 34 | `captive-portal-frontend/src/ui/Field.tsx` | Create | Wrapped label + control (text input or select) | @react-specialist | — |
| 35 | `captive-portal-frontend/src/ui/CheckboxConsent.tsx` | Create | Checkbox + LGPD consent text with embedded link to placeholder `legal_terms_url` | @react-specialist | 25 |
| 36 | `captive-portal-frontend/src/ui/CountdownRing.tsx` | Create | 200×200 SVG ring with reactive `strokeDashoffset` (FR-033) | @react-specialist | — |
| 37 | `captive-portal-frontend/src/ui/Button.tsx` | Create | Primary button with disabled style; min-height 44 px (AT-014) | @react-specialist | — |
| 38 | `captive-portal-frontend/src/styles.css` | Create | CSS variables + flat class names (Decision 8); mobile-first; iPhone 14 Pro safe-area aware | @react-specialist | — |
| 39 | `captive-portal-frontend/playwright.config.ts` | Create | Single project `{ name: "iPhone 14 Pro", use: devices["iPhone 14 Pro"] }`; webServer runs `vite dev` and `uvicorn` | @test-generator | 17 |
| 40 | `captive-portal-frontend/vitest.config.ts` | Create | jsdom env for unit tests on machine.ts + format.ts | @test-generator | 15 |
| 41 | `captive-portal-frontend/tests/unit/machine.test.ts` | Create | Reducer-coverage tests: every Action transitions to expected state from every reachable Step | @test-generator | 23 |
| 42 | `captive-portal-frontend/tests/unit/format.test.ts` | Create | `getFirstName("João Pedro Silva Souza") === "João"` — AT-012 unit-level | @test-generator | 26 |
| 43 | `captive-portal-frontend/tests/e2e/happyPath.spec.ts` | Create | AT-001 (full 5-screen flow with backend stubbed via Playwright route() interception or live backend) | @test-generator | All |
| 44 | `captive-portal-frontend/tests/e2e/renewal.spec.ts` | Create | AT-002 | @test-generator | All |
| 45 | `captive-portal-frontend/tests/e2e/consent-gate.spec.ts` | Create | AT-004 | @test-generator | All |
| 46 | `captive-portal-frontend/tests/e2e/ad-non-skippable.spec.ts` | Create | AT-011 | @test-generator | All |
| 47 | `captive-portal-frontend/tests/e2e/connected-firstname.spec.ts` | Create | AT-012 (DOM assertion) | @test-generator | All |
| 48 | `captive-portal-frontend/tests/e2e/mobile-viewport.spec.ts` | Create | AT-013 + AT-014 (no horizontal scroll, all touch targets ≥ 44 px via boundingBox) | @test-generator | All |
| 49 | `captive-portal-frontend/tests/e2e/openapi-coverage.spec.ts` | Create | AT-016 (loads `/docs`, asserts 4 endpoints listed under "portal" tag) | @test-generator | All |
| 50 | `captive-portal-frontend/tests/e2e/strings-snapshot.spec.ts` | Create | AT-018 (DOM text harvest of every screen, diff against fixture) | @test-generator | All |
| 51 | `captive-portal-frontend/tests/fixtures/expected_strings_pt-BR.txt` | Create | Sorted, line-delimited canonical pt-BR strings extracted from `strings.ts` (committed alongside `strings.ts`; CI regenerates and asserts equality with the committed file as a guard) | @test-generator | 25 |
| 52 | `captive-portal-frontend/README.md` | Create | Quickstart, dev commands, AT-to-test mapping table | @react-specialist | All |
| **Top-level / docs** | | | | | |
| 53 | `backend/README.md` | **Modify** | Add a "Captive portal" section explaining the new router, single-worker requirement (OQ-2), TTL constants (OQ-1), and env vars | @python-developer | 5, 6 |

**Total Files:** **53** (49 Create + 2 Modify + 2 marker files counted separately)

---

## Agent Assignment Rationale

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| **@python-developer** | 1, 2, 3, 4, 5, 6, 7, 53 | FastAPI + Pydantic v2 + APIRouter idioms; clean async stdlib code; understands the `model_config = ConfigDict(extra="forbid")` pattern; can handle the surgical `main.py` edits in #6 without breaking unrelated code |
| **@react-specialist** | 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 52 | React 18 + Vite + TypeScript strict; `useReducer` + discriminated-union state machines; component composition; CSS variables for theming; Vite manual chunks |
| **@test-generator** | 8, 9, 10, 11, 12, 13, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51 | pytest + httpx.AsyncClient for backend; Playwright + vitest for frontend; AT-to-test mapping; parameterized tests for forbidden-field grids; OpenAPI fixture diffing |
| **@code-reviewer** | (final pass — all files) | Cross-cutting review for LGPD compliance (no PII strings), TypeScript strictness, no `Any` in OpenAPI, consistent error handling |

**Agent Discovery:**
- Scanned: `.claude/agents/code-quality/`, `.claude/agents/domain/`, `.claude/agents/dev/`
- Skipped (mismatch): `function-developer` (Cloud Run only — not applicable here), `infra-deployer` (no IaC in this slice), `extraction-specialist` (LLM extraction — not applicable), `ai-data-engineer` (data pipelines — not applicable)

---

## Code Patterns

### Pattern 1: Pydantic v2 schema with `extra="forbid"` and `Literal` types

```python
# backend/schemas/portal.py
from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

# Categorical Literals — encode FR-022/023 + NFR-005 directly into the type system.
AgeBand = Literal["18-24", "25-34", "35-50", "50+"]
Gender = Literal["Feminino", "Masculino", "Prefiro não informar"]
Neighborhood = Literal[
    "Centro", "Zona Norte", "Zona Sul",
    "Zona Leste", "Zona Oeste", "Praia",
]


class _ForbidExtra(BaseModel):
    """Base class — every portal schema rejects unknown fields (NFR-005 belt-and-suspenders)."""
    model_config = ConfigDict(extra="forbid")


class LeadIn(_ForbidExtra):
    first_name: str = Field(min_length=3, max_length=80)
    age_band: AgeBand
    gender: Gender
    neighborhood: Neighborhood
    # NOTE: NO phone, NO email, NO cpf, NO last_name, NO raw mac.
    # Pydantic rejects them via extra="forbid"; the AT-015 grep blocks
    # them from being added at commit time.


class ConsentIn(_ForbidExtra):
    accepted: bool
    consent_text_version: str


class ConnectRequest(_ForbidExtra):
    venue_id: UUID
    device_id: UUID
    mac_hash: str = Field(min_length=64, max_length=64)  # sha256 hex
    campaign_id: UUID
    lead: LeadIn
    consent: ConsentIn


class ConnectResponse(_ForbidExtra):
    session_id: UUID
    redirect_to_ad: bool = True
    ad_seconds: int = 30


class AdCompleteResponse(_ForbidExtra):
    expires_at: datetime
    remaining_seconds: int = 1800


# (Branding, Organization, Venue, FormField, FormConfig, CampaignAd,
#  BootstrapResponse, RenewResponse follow the same pattern.)
```

### Pattern 2: APIRouter with structured event logging

```python
# backend/portal_routes.py
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from dataclasses import dataclass
from typing import Literal

from fastapi import APIRouter, HTTPException

from schemas.portal import (
    BootstrapResponse, ConnectRequest, ConnectResponse,
    AdCompleteResponse, RenewResponse,
)
from fixtures.portal_fixtures import (
    PRACA_CENTRAL_VENUE, CAFE_IMPERIAL_CAMPAIGN, FORM_CONFIG_LOCKED,
    RENEWAL_AD_SECONDS,
)

log = logging.getLogger("portal")
portal_router = APIRouter(prefix="/api", tags=["portal"])

# ── Session store (Decision 3) ──────────────────────────────────────────────
PENDING_AD_TTL = 600          # 10 min
EXPIRED_GRACE_TTL = 300       # 5 min
GC_INTERVAL = 60              # 60 s

SessionStatus = Literal["pending_ad", "authorized", "expired"]

@dataclass
class SessionState:
    session_id: UUID
    venue_id: UUID
    mac_hash: str
    campaign_id: UUID
    first_name: str
    consent_text_version: str
    status: SessionStatus
    created_at: datetime
    expires_at: datetime | None = None  # set on ad-complete


SESSIONS: dict[UUID, SessionState] = {}


# ── MikroTik stub (forward-compat for R2) ───────────────────────────────────
def authorize_mac_stub(mac_hash: str, expires_at: datetime) -> bool:
    """Stub — real impl in MikroTik POC slice will call mikrotik_api.authorize_mac().
    Returns True so the route handler can proceed; never logs the full mac_hash."""
    log.info(
        "mikrotik_authorize_stub",
        extra={"event_type": "mikrotik_authorize_stub",
               "mac_hash_prefix": mac_hash[:8],
               "expires_at": expires_at.isoformat()},
    )
    return True


# ── Endpoints ───────────────────────────────────────────────────────────────
@portal_router.get("/portal/bootstrap", response_model=BootstrapResponse)
async def bootstrap(venue_id: UUID, device_id: UUID, mac_hash: str) -> BootstrapResponse:
    # Single-fixture lookup; future slice replaces with DB query.
    return BootstrapResponse(
        venue=PRACA_CENTRAL_VENUE,
        active_campaign=CAFE_IMPERIAL_CAMPAIGN,  # ad_seconds=30 baked in
        form_config=FORM_CONFIG_LOCKED,
    )


@portal_router.post("/connect", response_model=ConnectResponse, status_code=201)
async def connect(body: ConnectRequest) -> ConnectResponse:
    # Pydantic has already rejected forbidden fields (extra="forbid").
    if not body.consent.accepted:
        raise HTTPException(422, "consent_required")
    session = SessionState(
        session_id=uuid4(),
        venue_id=body.venue_id,
        mac_hash=body.mac_hash,
        campaign_id=body.campaign_id,
        first_name=body.lead.first_name,
        consent_text_version=body.consent.consent_text_version,
        status="pending_ad",
        created_at=datetime.now(timezone.utc),
    )
    SESSIONS[session.session_id] = session
    log.info(
        "session_pending_ad",
        extra={"event_type": "session_pending_ad",
               "session_id": str(session.session_id),
               "venue_id": str(session.venue_id),
               "mac_hash_prefix": session.mac_hash[:8]},
    )
    return ConnectResponse(session_id=session.session_id, ad_seconds=CAFE_IMPERIAL_CAMPAIGN.ad_seconds)


@portal_router.post("/sessions/{session_id}/ad-complete", response_model=AdCompleteResponse)
async def ad_complete(session_id: UUID) -> AdCompleteResponse:
    session = SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(404, "session_not_found")
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=1800)
    authorize_mac_stub(session.mac_hash, expires_at)
    session.status = "authorized"
    session.expires_at = expires_at
    log.info(
        "session_authorized",
        extra={"event_type": "session_authorized",
               "session_id": str(session_id),
               "venue_id": str(session.venue_id)},
    )
    return AdCompleteResponse(expires_at=expires_at, remaining_seconds=1800)


@portal_router.post("/sessions/{session_id}/renew", response_model=RenewResponse)
async def renew(session_id: UUID) -> RenewResponse:
    session = SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(404, "session_not_found")
    renewal_campaign = CAFE_IMPERIAL_CAMPAIGN.model_copy(update={"ad_seconds": RENEWAL_AD_SECONDS})
    log.info(
        "session_renew_requested",
        extra={"event_type": "session_renew_requested",
               "session_id": str(session_id),
               "venue_id": str(session.venue_id)},
    )
    return RenewResponse(campaign=renewal_campaign, pending_session_id=session_id)


# ── GC task (Decision 3) ────────────────────────────────────────────────────
async def _session_gc_loop() -> None:
    while True:
        await asyncio.sleep(GC_INTERVAL)
        now = datetime.now(timezone.utc)
        evicted_pending = 0
        evicted_expired = 0
        for sid, s in list(SESSIONS.items()):
            if s.status == "pending_ad" and (now - s.created_at).total_seconds() > PENDING_AD_TTL:
                del SESSIONS[sid]; evicted_pending += 1
            elif s.status == "authorized" and s.expires_at and (now - s.expires_at).total_seconds() > EXPIRED_GRACE_TTL:
                del SESSIONS[sid]; evicted_expired += 1
        if evicted_pending or evicted_expired:
            log.info("session_gc_swept",
                     extra={"event_type": "session_gc_swept",
                            "evicted_pending": evicted_pending,
                            "evicted_expired": evicted_expired,
                            "remaining": len(SESSIONS)})


# main.py registers the GC via lifespan; see Pattern 3.
async def start_gc_task() -> asyncio.Task:
    return asyncio.create_task(_session_gc_loop(), name="portal_session_gc")
```

### Pattern 3: `main.py` lifespan integration (the surgical edits)

```python
# backend/main.py — relevant edits only

# DELETE: lines 67-74 (ConnectionRequest)
# DELETE: lines 196-218 (POST /api/connect handler)
# DELETE: lines 220-221 (_age_from_band helper)
# DELETE: lines 288-304 (GET /api/connection/form handler)

# ADD at top:
from portal_routes import portal_router, start_gc_task

# MODIFY lifespan to spawn the GC task:
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_if_empty()
    gc_task = await start_gc_task()
    try:
        yield
    finally:
        gc_task.cancel()

# ADD after app definition:
app.include_router(portal_router)
```

### Pattern 4: TypeScript discriminated-union reducer

```typescript
// captive-portal-frontend/src/state/machine.ts
import type { BootstrapResponse } from "./types";

export type Step = "connecting" | "form" | "ad" | "connected" | "renew";

export type State = {
  step: Step;
  bootstrap: BootstrapResponse | null;
  sessionId: string | null;
  firstName: string | null;
  expiresAt: string | null;
  adSeconds: number;
};

export type Action =
  | { type: "BOOTSTRAP_LOADED"; payload: BootstrapResponse }
  | { type: "CONNECTING_DONE" }
  | { type: "FORM_SUBMITTED"; payload: { sessionId: string; firstName: string; adSeconds: number } }
  | { type: "AD_COMPLETED"; payload: { expiresAt: string } }
  | { type: "TIMER_EXPIRED" }
  | { type: "RENEW_REQUESTED"; payload: { adSeconds: number } };

export const initialState: State = {
  step: "connecting",
  bootstrap: null,
  sessionId: null,
  firstName: null,
  expiresAt: null,
  adSeconds: 30,
};

const assertNever = (x: never): never => {
  throw new Error(`Unhandled action: ${JSON.stringify(x)}`);
};

export function machine(state: State, action: Action): State {
  switch (action.type) {
    case "BOOTSTRAP_LOADED":
      return { ...state, bootstrap: action.payload, adSeconds: action.payload.active_campaign.ad_seconds };
    case "CONNECTING_DONE":
      return { ...state, step: "form" };
    case "FORM_SUBMITTED":
      return {
        ...state,
        step: "ad",
        sessionId: action.payload.sessionId,
        firstName: action.payload.firstName,
        adSeconds: action.payload.adSeconds,
      };
    case "AD_COMPLETED":
      return { ...state, step: "connected", expiresAt: action.payload.expiresAt };
    case "TIMER_EXPIRED":
      return { ...state, step: "renew" };
    case "RENEW_REQUESTED":
      return { ...state, step: "ad", adSeconds: action.payload.adSeconds };
    default:
      return assertNever(action);
  }
}
```

### Pattern 5: Vite config with manual chunks + dev proxy

```typescript
// captive-portal-frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          "ad-chunk": ["./src/screens/AdScreen.tsx"],
        },
      },
    },
  },
});
```

### Pattern 6: Playwright config — locked viewport

```typescript
// captive-portal-frontend/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:5173" },
  projects: [{ name: "iPhone 14 Pro", use: { ...devices["iPhone 14 Pro"] } }],
  webServer: [
    { command: "npm run dev", port: 5173, reuseExistingServer: true },
    { command: "uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1",
      cwd: "../backend", port: 8000, reuseExistingServer: true },
  ],
});
```

### Pattern 7: PII grep CI script (AT-015)

```bash
#!/usr/bin/env bash
# backend/scripts/grep_pii_check.sh
# Fails (exit 1) if forbidden field identifiers appear in portal source.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PATTERN='\b(phone|email|cpf|last_name|raw_mac)\b'

# Search portal-scope files only.
TARGETS=(
  "$ROOT/backend/portal_routes.py"
  "$ROOT/backend/schemas/portal.py"
  "$ROOT/backend/fixtures/portal_fixtures.py"
  "$ROOT/captive-portal-frontend/src"
)

# Exclude lines starting with comment markers (#, //) and the strings file
# (which legitimately contains "email" inside the privacy-reassurance copy).
matches=$(grep -rEn "$PATTERN" "${TARGETS[@]}" \
  | grep -vE '^[^:]+:[0-9]+:\s*(#|//)' \
  | grep -vE '/strings\.ts:' \
  || true)

if [[ -n "$matches" ]]; then
  echo "AT-015 FAIL: forbidden field identifiers found in portal source:" >&2
  echo "$matches" >&2
  exit 1
fi
echo "AT-015 OK: 0 matches"
```

---

## Data Flow

```text
1. End-user device associates to MikroTik open SSID `MKT_WiFi_Praca_Central`
   │
   ▼
2. MikroTik intercepts HTTP, redirects to
   `https://portal.mktwifi/?venue_id=…&device_id=…&mac_hash=…`
   (mac_hash assumed pre-computed by AP/redirect layer — A-008)
   │
   ▼
3. main.tsx parses URL params, mounts <App />.
   │
   ▼
4. App.tsx: useEffect fires `getBootstrap({ venue_id, device_id, mac_hash })`
   → backend portal_routes.bootstrap → returns fixture BootstrapResponse
   → dispatch BOOTSTRAP_LOADED → store + inject `--accent` CSS var.
   │
   ▼
5. ConnectingScreen plays 3 sequenced messages over 3.1s
   → on completion dispatch CONNECTING_DONE
   │
   ▼
6. FormScreen: user fills 4 fields + checks consent
   → submit calls postConnect({ venue_id, device_id, mac_hash, campaign_id,
                                  lead, consent })
   → backend validates with Pydantic (rejects any extra fields → 422)
   → mints session_id, stores SessionState{status="pending_ad"} in SESSIONS
   → returns ConnectResponse{session_id, ad_seconds=30}
   → dispatch FORM_SUBMITTED
   │
   ▼
7. AdScreen plays for 30s (countdown via setInterval)
   → on 0 calls postAdComplete(session_id)
   → backend transitions session to "authorized", sets expires_at = now + 30min
   → calls authorize_mac_stub(mac_hash, expires_at) — returns True
   → emits log.info("session_authorized")
   → returns AdCompleteResponse{expires_at, remaining_seconds: 1800}
   → dispatch AD_COMPLETED
   │
   ▼
8. ConnectedScreen renders "Aproveite, {firstName}!" + 30:00 countdown ring
   → ring depletes via SVG strokeDashoffset bound to remaining
   → on 0 dispatch TIMER_EXPIRED
   │
   ▼
9. RenewScreen: user clicks "Assistir e renovar"
   → postRenew(session_id) → backend returns RenewResponse{campaign(ad_seconds=60)}
   → dispatch RENEW_REQUESTED → loop back to AdScreen with adSeconds=60
   │
   ▼
10. After 60s ad completes, postAdComplete extends expires_at by 1800s
    → loop back to ConnectedScreen.

Background:
   - GC task wakes every 60s
   - Evicts pending_ad sessions older than PENDING_AD_TTL (600s)
   - Evicts authorized sessions older than expires_at + EXPIRED_GRACE_TTL (300s)
   - Logs evictions as "session_gc_swept"
```

---

## Integration Points

| External System | Integration Type | Authentication | Status This Slice |
|-----------------|------------------|----------------|-------------------|
| MikroTik RouterOS API | RouterOS API (port 8728) — via `mikrotik_api.MikrotikClient` in future slice | per-device API user/password | **Stubbed** (`authorize_mac_stub` returns True) |
| WhatsApp Business API | HTTP via `notifications.send_whatsapp` in future slice | API token | **Not called** (notifications dispatcher out of scope) |
| YouTube Data API | HTTP for video metadata | API key | **Not used** (placeholder ad only) |
| PostgreSQL | SQLAlchemy via `db.py` in future slice | env-var credentials | **Not used** (in-memory dict) |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal | Maps to AT |
|-----------|-------|-------|-------|---------------|------------|
| Backend Unit (schemas) | Pydantic validation, Literal types, `extra="forbid"` | `test_portal_schemas.py` | pytest, pytest.mark.parametrize | 100% schema branches | AT-003 |
| Backend Integration (routes) | All 4 endpoints + GC + happy/error paths | `test_portal_routes.py` | pytest + httpx.AsyncClient | ≥ 80% on `portal_routes.py` (COULD goal) | AT-005, AT-007, AT-008, AT-009 |
| Backend Contract (OpenAPI) | Hand-written TS types vs Pydantic schemas | `test_openapi_contract.py` | pytest + JSON diff | 100% model field-set match | AT-016, Decision 6 drift guard |
| Backend Smoke (legacy) | Existing admin endpoints still work after main.py edits | `test_main_integration.py` | pytest + httpx | Key paths green | (regression guard) |
| Backend CI Lint | PII grep | `grep_pii_check.sh` | bash + grep | 0 matches | AT-015 |
| Frontend Unit (reducer) | Every Action × every Step | `tests/unit/machine.test.ts` | vitest | 100% branch coverage | (reducer correctness) |
| Frontend Unit (helpers) | `getFirstName`, `formatTemplate` | `tests/unit/format.test.ts` | vitest | 100% | AT-012 |
| Frontend E2E (happy path) | Full 5-screen flow | `tests/e2e/happyPath.spec.ts` | Playwright | (1 test) | AT-001 |
| Frontend E2E (renewal) | Step 5 → loops to Step 3 with 60s | `tests/e2e/renewal.spec.ts` | Playwright | (1 test) | AT-002 |
| Frontend E2E (consent gate) | Submit button disabled until checked | `tests/e2e/consent-gate.spec.ts` | Playwright | (1 test) | AT-004 |
| Frontend E2E (non-skippable) | Ad cannot be skipped | `tests/e2e/ad-non-skippable.spec.ts` | Playwright | (1 test) | AT-011 |
| Frontend E2E (firstname) | "Aproveite, João!" interpolation | `tests/e2e/connected-firstname.spec.ts` | Playwright | (1 test) | AT-012 |
| Frontend E2E (mobile viewport) | No horizontal scroll, ≥44 px touch targets | `tests/e2e/mobile-viewport.spec.ts` | Playwright | (1 test, 5 screens) | AT-013, AT-014 |
| Frontend E2E (OpenAPI ↔ Swagger) | Swagger UI shows 4 portal endpoints | `tests/e2e/openapi-coverage.spec.ts` | Playwright | (1 test) | AT-016 |
| Frontend E2E (strings) | DOM text snapshot diff against fixture | `tests/e2e/strings-snapshot.spec.ts` | Playwright | byte-equal diff | AT-018 |
| Frontend Build | `tsc --noEmit && vite build` exit 0 | (CI step) | TypeScript + Vite | 0 errors / 0 warnings | AT-017 |

**ATs covered: 16 / 18.** AT-006 (mac_hash boundary) is enforced by Pattern 1 schema (mac_hash field is `str`, no MAC type) + AT-015 grep — the test is implicit. AT-010 (connecting auto-advance timing) is covered by AT-001's full-flow timing assertion.

---

## Error Handling

| Error Type | Where | Handling Strategy | Retry? | HTTP / UX |
|------------|-------|-------------------|--------|-----------|
| Pydantic validation failure (forbidden field, missing field, Literal mismatch) | Any portal endpoint | Default FastAPI handler | No | **422 Unprocessable Entity** with field path |
| Consent not accepted | `POST /api/connect` | `raise HTTPException(422, "consent_required")` | No | **422** |
| Session not found in SESSIONS | `POST /api/sessions/{id}/ad-complete`, `/renew` | `raise HTTPException(404, "session_not_found")` | No | **404**; SPA shows generic "Sessão expirada — recarregue a página" toast and resets state to `connecting` |
| Bootstrap fetch fails (network/5xx) | `App.tsx` `useEffect` | Catch in api.ts; dispatch `BOOTSTRAP_FAILED` (added action); show retry banner with "Tentar novamente" | Manual | retry-banner UX (FR-150 lite) |
| Ad-complete fetch fails | AdScreen `useEffect` on countdown==0 | Retry up to 3 times with exponential backoff (1s, 2s, 4s); on 3rd failure show **error overlay** with "Tentar novamente" CTA. Concrete retry-state machine specified in **Decision 11**. | Yes (bounded) | error overlay |
| Renew fetch fails | RenewScreen click handler | Single retry; show error toast | Yes | toast |
| Frontend asserts state invariant violated | machine.ts default branch | `assertNever(action)` throws → React error boundary | No | full-screen error fallback |

---

## Configuration

| Config Key | Type | Default | Where | Description |
|------------|------|---------|-------|-------------|
| `PENDING_AD_TTL` | int (s) | `600` | `portal_routes.py` constant | Max age for pending_ad sessions in SESSIONS |
| `EXPIRED_GRACE_TTL` | int (s) | `300` | `portal_routes.py` constant | Grace window after `expires_at` before GC sweeps |
| `GC_INTERVAL` | int (s) | `60` | `portal_routes.py` constant | How often the GC task wakes |
| `RENEWAL_AD_SECONDS` | int | `60` | `fixtures/portal_fixtures.py` | Ad length for renewal flow (FR-035) |
| `FIRST_SESSION_AD_SECONDS` | int | `30` | bound to `CAFE_IMPERIAL_CAMPAIGN.ad_seconds` | Ad length for first session (FR-029) |
| `FIRST_SESSION_GRANT_SECONDS` | int | `1800` | `portal_routes.py` constant | 30 min access |
| `CONSENT_TEXT_VERSION` | str | `"2026-05-03-v1"` | `fixtures/portal_fixtures.py` | Date-vN format per OQ-3 default |
| `VENUE_SALT_PRACA_CENTRAL` | str | `"<placeholder-32-bytes>"` | `fixtures/portal_fixtures.py` | OQ-4 default (not used in this slice; placeholder for future MikroTik POC) |
| `CORS_ALLOWED_ORIGINS` | list[str] | `["http://localhost:5173"]` | `main.py` | Already `["*"]` in main.py; tighten for portal in production |
| Vite proxy `/api → :8000` | URL | `http://localhost:8000` | `vite.config.ts` | Dev only; production serves both from same origin |
| uvicorn workers | int | `1` | docker-compose / README | OQ-2 — required for in-memory SESSIONS to be shared |

---

## Security Considerations

- **NFR-005 enforced at 4 layers (defense in depth):**
  1. *Type system* — `LeadIn` uses `Literal` for categoricals, `str` only for `first_name` (no `phone`/`email`/`cpf` types).
  2. *Runtime* — `model_config = ConfigDict(extra="forbid")` on every portal schema rejects unknown fields with 422.
  3. *Static check* — `grep_pii_check.sh` runs in CI (AT-015), fails the build if forbidden identifiers appear.
  4. *ESLint rule* — frontend `no-restricted-syntax` rejects literal strings matching the forbidden pattern.
- **Raw MAC never crosses the wire to backend** (NFR-005c). Schema field is `mac_hash: str` (sha256-hex, length 64 enforced). The **upstream MikroTik adapter** is responsible for hashing — this slice stubs that boundary (A-008 deferred).
- **Consent ledger** — every `ConnectRequest` carries `consent.consent_text_version`; SessionState retains it for future audit. Future DB-baseline slice persists into a `ConsentRecord` table.
- **CORS** — currently `["*"]` in main.py for dev convenience. Production must tighten to the deployed portal origin.
- **Logging hygiene** — only `mac_hash[:8]` ever appears in logs; first_name never appears in logs (LGPD principle of minimal data exposure beyond active session state).
- **No JWT / no cookies** — portal is unauthenticated by design (end-users are anonymous up until consent submission). The `session_id` is the bearer token implicitly; trade-off: anyone with the URL holds the session. Acceptable because (a) sessions are 30-min bounded, (b) the URL is only meaningful during the flow.
- **CSRF** — not applicable (no auth state to forge against; sessions are minted on the same request).

---

## Observability

| Aspect | Implementation This Slice | Future Slice |
|--------|---------------------------|--------------|
| Logging | Stdlib `logging.info(event_type=..., extra={...})` at every state transition (Decision 10) | Replace handler with `JsonFormatter` and ship to Cloud Logging / Langfuse |
| Metrics | None this slice | Future observability slice attaches to the same event stream and counts events by type |
| Tracing | None this slice | OpenTelemetry spans wrapping each route handler |
| Frontend RUM | None this slice | Future slice may add `web-vitals` reporting |

**The 8 logged event types** (`session_pending_ad`, `session_authorized`, `session_renew_requested`, `session_gc_swept`, `mikrotik_authorize_stub`, plus 3 reserved for future) form a stable schema that downstream slices can rely on.

---

## Open Questions Resolution (from DEFINE)

| OQ | Resolution |
|----|------------|
| **OQ-1** | TTLs locked: `PENDING_AD_TTL=600s`, `EXPIRED_GRACE_TTL=300s`, `GC_INTERVAL=60s` (Decision 3) |
| **OQ-2** | Single `--workers 1` mode locked; documented in `backend/README.md` modification (#53) |
| **OQ-3** | `consent_text_version` format: `YYYY-MM-DD-vN` — default value `"2026-05-03-v1"` |
| **OQ-4** | `VENUE_SALT_PRACA_CENTRAL` lives in `fixtures/portal_fixtures.py` as a placeholder string; out of scope to actually hash |
| **OQ-5** | Stdlib structured logging at every state transition with 8 event types (Decision 10) |
| **OQ-6** | "Bairro" select uses static list returned in `BootstrapResponse.form_config.fields[id="neighborhood"].options` (locked in fixture) |
| **OQ-7** | No Service Worker / no offline fallback — captive portal is online-only by definition |

---

## Deferred Assumption Tracking

| Assumption | Action in /build | Action After /build |
|------------|------------------|---------------------|
| **A-001** (MikroTik appends URL params) | Manual QA on a real MikroTik AP if available; otherwise document as a precondition the MikroTik POC slice must validate | Resolved by R2 POC slice; if violated, falls back to subdomain or path-based resolution — schema unchanged |
| **A-007** (browsers honor non-skip on `<video>`) | Manual QA on iOS Safari and Chrome Mobile during build; AT-011 is the automated counterpart but Playwright WebKit is not 100% iOS-faithful | If broken on iOS, replace `<video>` with a CSS-animated overlay over a `<canvas>` — fully non-interactive |
| **A-008** (upstream MAC hashing) | Document the boundary contract in `backend/README.md`: AP/redirect layer must compute `sha256(MAC + venue_salt)` before submitting | Locked in MikroTik POC slice; until then, demo can use any 64-char hex value |

---

## Quality Gate

| Criterion | Status |
|---|---|
| Architecture diagram is clear | ✅ Single comprehensive ASCII showing component boundaries, data flow, and what's untouched |
| All major decisions documented with rationale | ✅ 10 ADRs (Decisions 1–10) with Context / Choice / Rationale / Alternatives / Consequences |
| File manifest is complete | ✅ 53 files, all numbered, with action / agent / dependencies |
| Code patterns are copy-paste ready | ✅ 7 patterns (Pydantic schema, FastAPI router + GC, main.py edits, TS reducer, Vite config, Playwright config, PII grep script) |
| Testing strategy covers requirements | ✅ 16 / 18 ATs explicitly mapped; remaining 2 (AT-006, AT-010) covered implicitly |
| No circular dependencies in architecture | ✅ Backend depends on schemas + fixtures; frontend depends on types only; no module imports anything outward |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-03 | design-agent | Initial design. Validated A-011 (Python 3.12 + Pydantic 2.6 confirmed in repo). Discovered R13 in code (`main.py` /api/connect violates NFR-005); locked deletion in Decision 1. Resolved all 7 OQs. 10 ADRs. 53-file manifest with agent assignments. 7 code patterns. 16 of 18 ATs explicitly test-mapped. |
| 1.1 | 2026-05-04 | iterate-agent (post-ship) | Added **Decision 11** (AdScreen retry/error UX — bounded, observable, recoverable) closing the gap between the original Error Handling table and the shipped silent-retry-loop in `AdScreen.tsx`. Updated §Error Handling row for "Ad-complete fetch fails" to reference Decision 11 explicitly. Cascade: 1 file added (`src/state/retry.ts`), 1 file modified (`src/screens/AdScreen.tsx`), 1 unit test added (`tests/unit/retry.test.ts`), strings + CSS additions. No contract change, no schema change, no state-machine change. Bundle delta < 1 KB gzipped. |

---

## Next Step

**Ready for:**
```
/build .claude/sdd/features/DESIGN_CAPTIVE_PORTAL.md
```

This will dispatch the build agents (`@python-developer`, `@react-specialist`, `@test-generator`, `@code-reviewer`) per the agent-assignment table, create files in dependency order, and produce `.claude/sdd/reports/BUILD_REPORT_CAPTIVE_PORTAL.md` summarizing what shipped, which ATs pass, and the disposition of deferred assumptions A-001/A-007/A-008.
