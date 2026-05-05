# DESIGN: ADMIN_SPA

> Technical design for migrating the operator-facing admin SPA off the Babel-standalone HTML prototype onto a production-shaped Vite + React 18 + TypeScript build (`mkt-wifi-admin/`), with TanStack Query v5 + Zustand v5 + React Router v6, applying the LGPD posture and R13 fix locked by slice 1.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ADMIN_SPA |
| **Date** | 2026-05-04 |
| **Author** | design-agent (via /workflow:design) |
| **DEFINE** | [DEFINE_ADMIN_SPA.md](DEFINE_ADMIN_SPA.md) (15/15 clarity, 52 ATs) |
| **BRAINSTORM** | [BRAINSTORM_ADMIN_SPA.md](BRAINSTORM_ADMIN_SPA.md) |
| **Slice 1 reference** | [../CAPTIVE_PORTAL/](../CAPTIVE_PORTAL/) — recipe + lessons learned |
| **Status** | ✅ Shipped 2026-05-04 — archived |

---

## Pre-Design Repo Inspection (Assumption Validation)

> Per slice-1 lesson learned, this is the highest-leverage step in /design. Findings drive the file manifest and ADRs.

| Assumption / Question | Finding | Disposition |
|---|---|---|
| **A-001** TanStack Query v5 compatibility | `npm view @tanstack/react-query@latest` → `5.100.9`, peer `react@^18 || ^19` ✅ | **Locked: `^5.100.9`** in Decision 1 |
| **A-002** React Router v6 vs v7 | v6 latest: `6.30.3`; v7 latest: `7.14.2`. v7 has `loader`/`Outlet` API churn we don't need this slice; v6 is still actively maintained. | **Locked: `^6.30.3`** in Decision 1 (DEFINE default) |
| **A-003** Zustand v4 vs v5 | v4 latest: `4.5.7`; v5 latest: `5.0.13`. v5 has cleaner `persist` middleware (resolves OQ-7 / FR-003 "Manter conectado" cleanly). | **Locked: `^5.0.13`** in Decision 1 |
| **A-006** Auth token format opaque | Confirmed via `grep -n "Depends" backend/main.py` — every admin endpoint takes only `Depends(get_session)` (DB session injection); **no token validation anywhere**. Token is `base64(email)[:12] + token_hex(8)`. | **Documented as a known limitation** in Security Considerations + `// TODO(auth-hardening-slice)` markers in code (per OQ-3). |
| **A-008** Vite proxy `/api → :8000` works | Verified pattern works in `captive-portal-frontend/vite.config.ts`. Same recipe transfers. | **No code change needed** — copy the proxy block verbatim. |
| **Bonus finding 1 — `data.jsx:162` calls deleted endpoint** | `grep -n /api/connection/form mkt-wifi-frontend/frontend/data.jsx` → line 162 still references the deleted route. | **Drop `formConfig()` from the new SPA's `src/api/`**; the read-only Conexões fields-summary card hardcodes the 4 LGPD-locked fields (no fetch needed). |
| **Bonus finding 2 — Login already implements 7-day TTL client-side** | `mkt-wifi-frontend/frontend/login.jsx:236-244` does `Date.now() - s.ts > 7 * 24 * 3600 * 1000` on restore. | **Port the pattern verbatim** to Zustand `auth` store via `persist({version, migrate})` middleware. |
| **Bonus finding 3 — Sections JSX use globals, not ES imports** | `grep -n "from.*data" sections{1,2,3}.jsx` → 0 matches. The prototype loads everything via `<script>` tags and assigns to `window.X`. | **No formal coupling to preserve.** New SPA gets clean ES module imports — strictly better. |
| **Bonus finding 4 — Backend admin endpoints have NO auth dependency** | Every `@app.{get,post,patch,delete}` admin route takes only `Depends(get_session)` (DB session). No `Depends(verify_token)`, no `Authorization` header reads. | **Reinforces Security Considerations** — role-gating in this slice is purely UX, not security. Server-side enforcement is a future auth-hardening slice. |

**No blockers found.** All deferred DEFINE assumptions resolved. Two bonus findings (data.jsx:162 + 7-day TTL pattern) directly inform the code patterns below.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                ADMIN SPA — VERTICAL SLICE 2                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  Operator's browser (desktop-first; mobile-responsive best-effort)                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │  GET /                       → SPA mounts (or redirect to /login if not authenticated)   │   │
│  │  GET /login   /  /campanhas  /  /usuarios  /  /wifi  /  /conexoes  /  /notificacoes      │   │
│  │  GET /relatorios  /  /monetizacao  /  /configuracoes                                     │   │
│  │  GET /usuarios?zone=Centro&q=Maria   (deep-linkable URLs per AT-005)                     │   │
│  └──────────────────────────────┬───────────────────────────────────────────────────────────┘   │
│                                 │                                                               │
│                                 ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │  mkt-wifi-admin/  (Vite dev :5174 → built static :443 prod)                              │   │
│  │                                                                                          │   │
│  │   main.tsx   ──► QueryClientProvider + RouterProvider + Suspense + ErrorBoundary         │   │
│  │                                                                                          │   │
│  │   ┌────────────────────────────────────────────────────────────────────────────────┐     │   │
│  │   │ routes.tsx                                                                     │     │   │
│  │   │  /login → <LoginPage>                                                          │     │   │
│  │   │  / (auth-gated) → <Shell>                                                      │     │   │
│  │   │     ├─ /            → <DashboardPage>     [admin|advertiser|viewer]            │     │   │
│  │   │     ├─ /campanhas   → <CampanhasPage>     [admin|advertiser|viewer]            │     │   │
│  │   │     ├─ /usuarios    → <UsuariosPage>      [admin|viewer]                       │     │   │
│  │   │     ├─ /wifi        → <WifiPage>          [admin|viewer]                       │     │   │
│  │   │     ├─ /conexoes    → <ConexoesPage>      [admin|viewer]                       │     │   │
│  │   │     ├─ /notificacoes→ <NotificacoesPage>  [admin|viewer]                       │     │   │
│  │   │     ├─ /relatorios  → <RelatoriosPage>    [admin|advertiser|viewer]            │     │   │
│  │   │     ├─ /monetizacao → <MonetizacaoPage>   [admin]                              │     │   │
│  │   │     └─ /configuracoes → <ConfiguracoesPage> [admin]                            │     │   │
│  │   │  * → <ForbiddenPage> (403)                                                     │     │   │
│  │   └────────────────────────────────────────────────────────────────────────────────┘     │   │
│  │                                                                                          │   │
│  │   ┌─────────────────────────┐    ┌───────────────────────────────────────────────┐       │   │
│  │   │ stores/  (Zustand)      │    │ api/  (TanStack Query hooks)                  │       │   │
│  │   │  ─ auth (persist)       │    │  ─ client.ts (fetch wrapper, future-auth-hdr) │       │   │
│  │   │     {user, token,       │    │  ─ kpis.ts        useKpis()                   │       │   │
│  │   │      remember,          │    │  ─ weekly.ts      useWeeklyConnections()      │       │   │
│  │   │      loginAt} 7-day TTL │    │  ─ demographics   useDemographics()           │       │   │
│  │   │  ─ toasts (volatile)    │    │  ─ campaigns.ts   useCampaigns/Mutations      │       │   │
│  │   │     queue<{id,msg,ttl}> │    │  ─ users.ts       useUsers/useLiveUsers       │       │   │
│  │   │  ─ prefs (persist)      │    │  ─ devices.ts     useDevices/useRefreshDevice │       │   │
│  │   │     {density?,          │    │  ─ notifications  useNotifRules/Mutations     │       │   │
│  │   │      lastVisitedRoute}  │    │  ─ monetization   useMonetizationPlans        │       │   │
│  │   └─────────────────────────┘    │  ─ reports.ts     useReports                  │       │   │
│  │                                  │  ─ auth.ts        useLogin/useLogout          │       │   │
│  │                                  └───────────────────────────────────────────────┘       │   │
│  │                                                                                          │   │
│  │   ┌─────────────────────────────────────────────────────────────────────────────────┐    │   │
│  │   │ shell/                                                                          │    │   │
│  │   │  ─ Shell.tsx          (Sidebar + Topbar + ToastContainer + <Outlet />)          │    │   │
│  │   │  ─ Sidebar.tsx        (role-gated nav links + badges)                           │    │   │
│  │   │  ─ Topbar.tsx         (section title + live online count + CTAs)                │    │   │
│  │   │  ─ UserDropdown.tsx   (Meu perfil / Sair)                                       │    │   │
│  │   └─────────────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                          │   │
│  │   sections/  9 section folders + login/ + _403/                                          │   │
│  │   ui/        primitives (Button, Modal, Field, Tabs, RoleGuard, EmBreveButton, ...)      │   │
│  │   utils/     format, withRetries (ported from slice 1 retry helper)                      │   │
│  │   strings.ts (frozen pt-BR copy — slice-1 pattern extended)                              │   │
│  │   styles.css (CSS variables; ~1.4 KB CSS budget vs slice-1's 1.8 KB)                     │   │
│  └──────────────────────────────┬───────────────────────────────────────────────────────────┘   │
│                                 │                                                               │
│                  fetch /api/* (CORS-allowed; no Authorization header in this slice)             │
│                                 │                                                               │
│                                 ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │  FastAPI backend (:8000) — UNTOUCHED IN THIS SLICE                                       │   │
│  │                                                                                          │   │
│  │   main.py  ─ admin routes (existing): /api/auth/* /api/kpis /api/campaigns CRUD          │   │
│  │              /api/users /api/users/live /api/devices /api/devices/{id}/refresh           │   │
│  │              /api/notifications/{rules,groups} /api/monetization /api/reports            │   │
│  │   portal_routes.py ─ (slice 1) /api/portal/bootstrap /api/connect /api/sessions/*        │   │
│  │                                                                                          │   │
│  │   ⚠  No Authorization header validation on admin routes (Decision 8 / Security §)        │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                 │
│   NOT TOUCHED in this slice:                                                                    │
│   ─ backend/  (all of it)                                                                       │
│   ─ captive-portal-frontend/  (slice 1 — separate package on :5173)                             │
│   ─ mkt-wifi-frontend/  (legacy Babel-standalone — kept as visual reference; never edited)      │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

| Component | Purpose | Technology | Location |
|-----------|---------|------------|----------|
| **Admin SPA** | Operator-facing 9-section panel + login + shell | Vite 5 + React 18 + TypeScript 5 strict | `mkt-wifi-admin/` (NEW) |
| **Routing** | URL-driven section selection + auth gate + role gate | React Router v6.30 | `src/routes.tsx` + `<RoleGuard>` |
| **Server-state cache** | All `/api/*` reads + mutations with caching, refetch-on-focus, optimistic updates | TanStack Query v5.100 | `src/api/*.ts` (10 files) |
| **UI state** | Auth (persisted), toasts (volatile), prefs (persisted) | Zustand v5.0 with `persist` middleware | `src/stores/{auth,toasts,prefs}.ts` |
| **Pt-BR strings** | Single source of truth for all copy | TS frozen object | `src/strings.ts` |
| **Shell** | Sidebar + topbar + toast container layout | React + CSS variables | `src/shell/` (4 files) |
| **Section pages** | 9 sections + Login + 403 page | React | `src/sections/<route>/` (11 folders) |
| **UI primitives** | Button, Modal, Field, Tabs, RoleGuard, **EmBreveButton** (shared), Pill, etc. | React + CSS variables | `src/ui/` (~13 files) |
| **Tests (unit)** | Stores + hooks + utils | Vitest 2.0 + jsdom | `tests/unit/*.test.ts` |
| **Tests (e2e)** | Per-role flows + LGPD invariants + deleted-endpoint absence | Playwright 1.45 | `tests/e2e/*.spec.ts` |
| **PII grep guard (extended)** | AT-015 lifted to admin source tree | Existing bash script | `backend/scripts/grep_pii_check.sh` (modified to add new TARGETS) |

---

## Key Decisions

### Decision 1 — Library versions locked

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (resolves A-001/A-002/A-003) |
| **Date** | 2026-05-04 |

**Context:** DEFINE deferred TanStack Query / Zustand / React Router minor-version selection to /design. Pre-design `npm view` queries returned latest stable versions of each.

**Choice:**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-query": "^5.100.9",
    "zustand": "^5.0.13",
    "react-router-dom": "^6.30.3"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.100.9",  // dev-only; tree-shaken in prod
    "@vitejs/plugin-react": "^4.3.1",
    "@playwright/test": "^1.45.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "jsdom": "^24.1.0",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

**Rationale:**
- TanStack Query v5 (`5.100.9`) — peer-dep `react@^18 || ^19` confirmed; new object-form `useQuery({queryKey, queryFn})` is the v5 idiom; `react-query-devtools` DX in dev.
- Zustand v5 (`5.0.13`) — v5 modernized the `persist` middleware; matches the FR-003 "Manter conectado" → 7-day-TTL pattern from `login.jsx:236-244` cleanly.
- React Router v6 (`6.30.3`) — v6 stable + actively maintained; v7 has `loader`/`Outlet` API churn we don't need this slice. DEFINE default.
- All other versions inherited verbatim from `captive-portal-frontend/package.json` — zero version drift across slices.

**Alternatives Rejected:** TanStack Query v4 (older API; no benefit); Zustand v4 (older `persist` middleware); React Router v7 (unnecessary churn).

**Consequences:** Three new deps (~6 KB gzipped overhead total). Future slices that need loaders or React Query v6 will require explicit `/iterate`.

---

### Decision 2 — New top-level package `mkt-wifi-admin/` (sibling, not in-place evolution)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** BRAINSTORM Q1 locked Approach A. /design needs to specify the exact directory layout.

**Choice:** New top-level `mkt-wifi-admin/` (sibling to `captive-portal-frontend/` and `mkt-wifi-frontend/`). Three frontend packages now coexist in the repo.

**Rationale:** Mirrors slice-1 pattern; clean separation; `mkt-wifi-frontend/` legacy folder stays as a visual reference until ship cutover, then a follow-up `/iterate` deletes it.

**Alternatives Rejected:** Evolve in `mkt-wifi-frontend/` (mixes legacy + new code, harder to delete prototype later).

**Consequences:** CI must build + test 2 frontend packages (slice-1's still has its own pipeline). Adding a 4th package later (e.g., marketing-team SPA) follows the same pattern.

---

### Decision 3 — Zustand 3-store architecture (auth + toasts + prefs)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** UI state is small (auth, toasts, sticky filter prefs) but needs persistence boundaries. A single mega-store is anti-pattern; one-store-per-feature is over-fragmentation.

**Choice:** Three Zustand stores with explicit responsibility boundaries:

```typescript
// stores/auth.ts — PERSISTED (localStorage if remember=true, sessionStorage otherwise)
type AuthState = {
  user: { email: string; name: string; role: Role } | null;
  token: string | null;
  remember: boolean;            // FR-003 "Manter conectado"
  loginAt: number | null;       // ms epoch — drives 7-day client-side TTL
  login: (email, password) => Promise<void>;
  logout: () => void;
  isExpired: () => boolean;     // Date.now() - loginAt > 7*24*3600*1000
};

// stores/toasts.ts — VOLATILE (no persistence)
type ToastsState = {
  queue: Array<{ id: string; message: string; kind: 'ok' | 'err'; createdAt: number }>;
  enqueue: (message: string, kind?: 'ok' | 'err') => void;
  dismiss: (id: string) => void;
};

// stores/prefs.ts — PERSISTED (localStorage; cross-tab sync via storage event)
type PrefsState = {
  lastVisitedRoute: string | null;  // restore on tab reopen
  // (nothing else this slice — tweaks-panel cut)
  setLastVisitedRoute: (path: string) => void;
};
```

**Rationale:**
- 3 stores match 3 distinct lifecycle concerns: auth (persist with 7-day TTL), toasts (volatile, queue), prefs (persist, no TTL).
- Each store has a tiny surface (3-6 actions); easy to unit-test against pure reducers.
- Storage backend chosen per-store: auth conditionally `localStorage` vs `sessionStorage` (matches `login.jsx:43-45`); prefs always `localStorage`.

**Alternatives Rejected:** Single store (mixes lifecycles); React Context (Zustand's `subscribe` enables cross-tab sync via storage event with no boilerplate).

**Consequences:** 3 small files instead of 1 big one. ~3 KB gzipped total store code.

---

### Decision 4 — TanStack Query hook factories (one factory per backend endpoint)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** 14 backend admin endpoints. Need a consistent hook pattern that gives compile-time types, predictable cache keys, automatic invalidation on mutations.

**Choice:** One file per endpoint family in `src/api/`. Each exports typed `useX()` (read) and `useXMutation()` (write) hook factories. Cache keys are tuples; mutations invalidate by key prefix.

**Rationale:**
- Mirrors TanStack Query's recommended pattern.
- Type signatures match `src/types/api.ts` (hand-written types).
- Cache keys are tuples (e.g., `['campaigns', { status, view }]`); easy to invalidate by prefix.
- `staleTime` set per-endpoint per OQ-7.

**Alternatives Rejected:** Inline `useQuery` calls in components (no reusable cache keys); single `api.ts` file (large + harder to navigate at 14 endpoints).

**Consequences:** ~10 hook files in `src/api/`. Each is ~30-60 LoC. Total ~400 LoC for the API layer (vs. 194 LoC of legacy `data.jsx`, but with caching, retry, mutations, types).

---

### Decision 5 — `<RoleGuard>` wrapper component for route-level role gating

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** Per default policy in BRAINSTORM, each route allows specific roles. AT-012 requires that direct URL navigation by an unauthorized role renders a 403 page.

**Choice:** A small `<RoleGuard role={Role | Role[]}>` component that reads `useAuthStore(s => s.user?.role)` and either renders `children` (if allowed) or redirects to `<ForbiddenPage>`.

```tsx
// ui/RoleGuard.tsx
type Role = 'admin' | 'advertiser' | 'viewer';

export function RoleGuard({
  allow, children,
}: { allow: Role | Role[]; children: React.ReactNode }) {
  const role = useAuthStore(s => s.user?.role);
  const allowed = Array.isArray(allow) ? allow : [allow];
  if (!role) return <Navigate to="/login" replace />;
  if (!allowed.includes(role)) return <ForbiddenPage />;
  return <>{children}</>;
}
```

**Rationale:** Declarative; testable; matches the role-policy table in DEFINE. Combined with `<AuthGate>` (a separate wrapper that redirects unauthenticated users to `/login?next=...`), every protected route is wrapped at most once.

**Alternatives Rejected:** Per-page role checks inside section components (scattered logic; easy to forget; tested individually instead of centrally).

**Consequences:** All 9 section routes carry a `<RoleGuard>` wrapper in `routes.tsx`. ~30 LoC for the component itself; ~20 LoC of wrapping in routes.

---

### Decision 6 — Shared `<EmBreveButton>` component (resolves OQ-6)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** 8 disabled-write CTAs across 4 sections (Notificações "Nova regra", Reports Gerar/Baixar/Enviar, Monetização Salvar modelo, Conexões MikroTik save, Configurações Empresa save, Configurações Integrações save). Each needs a tooltip pointing to the blocking backend slice.

**Choice:** A single component `<EmBreveButton blockingSlice="notifications-write">label</EmBreveButton>` that:
- Renders a disabled `<button>` with the appropriate styling
- Shows `title="Em breve — pendente da slice {blockingSlice}"` tooltip on hover
- Has `data-testid="em-breve-{blockingSlice}"` for AT-052 verification
- When the blocking slice ships, callers replace `<EmBreveButton>` with `<Button onClick={...}>` — single import swap

**Rationale:** Centralizes the "feature exists in UI but blocked on backend" UX pattern. Future slices `/iterate` to un-disable each occurrence with predictable churn.

**Alternatives Rejected:** Plain `<button disabled>` with title attribute (8× duplication; no test affordance); just hide the CTAs (loses the educational signal that the section exists but is blocked).

**Consequences:** 1 new component (~25 LoC); 8 usages across the slice; all `data-testid="em-breve-*"` covered by AT-052 test.

---

### Decision 7 — Per-endpoint `staleTime` (resolves OQ-7)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** TanStack Query default `staleTime: 0` causes excessive refetches; `Infinity` causes stale data. Different endpoints have different freshness needs.

**Choice:**

| Endpoint | `staleTime` | Reason |
|---|---|---|
| `/api/kpis` | 30s | Dashboard hero KPIs change infrequently |
| `/api/connections/weekly` | 60s | Weekly aggregates only update once per day in production |
| `/api/demographics` | 60s | Aggregates change slowly |
| `/api/campaigns` | 30s | List view |
| `/api/users` | 30s | Lead list |
| `/api/users/live` | 0s + `refetchInterval: 5000` | Real-time-ish |
| `/api/devices` | 15s | Device telemetry |
| `/api/notifications/rules` | 60s | Rare changes |
| `/api/notifications/groups` | `Infinity` | Seeded once, never changes in practice |
| `/api/monetization` | `Infinity` | Catalog of plans; changes only via /iterate |
| `/api/reports` | 30s | Report list |

Defined as constants in `src/api/staleTimes.ts` for visibility:

```typescript
export const STALE = {
  kpis: 30_000,
  weekly: 60_000,
  demographics: 60_000,
  campaigns: 30_000,
  users: 30_000,
  liveUsers: 0,             // + refetchInterval
  devices: 15_000,
  notifRules: 60_000,
  notifGroups: Infinity,
  monetization: Infinity,
  reports: 30_000,
} as const;
```

**Rationale:** Explicit table; readable at a glance; future tuning is a one-file edit.

**Consequences:** None negative; resolves a class of "why is the dashboard refetching every render?" questions.

---

### Decision 8 — Auth client-side only with explicit `// TODO(auth-hardening)` markers (resolves OQ-3)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted (documents a known gap) |
| **Date** | 2026-05-04 |

**Context:** Pre-design inspection confirmed backend admin endpoints have no `Depends(verify_token)` — all are unauthenticated server-side. NFR-016 ("role enforcement must be server-side") is **not** met by this slice. We can't fix it here (out of scope per DEFINE) but we must document the gap so it's not silently inherited.

**Choice:** Three explicit markers:

1. **Security Considerations § in this DESIGN doc** explaining the gap, its scope, and the future auth-hardening slice that closes it.
2. **`// TODO(auth-hardening-slice): set Authorization header from authStore.token`** comment in `src/api/client.ts` at the spot where the future auth header injection would go.
3. **`// TODO(auth-hardening-slice): backend should validate this; currently UI-only`** comment in `ui/RoleGuard.tsx`.

Plus: the SPA still **sends** the token in an `Authorization: Bearer <token>` header on every request, even though the backend ignores it today. When the future slice adds server-side validation, the header is already in flight — zero client rework.

**Rationale:** Future contributors see the gap from the code, not just the docs. The `Authorization` header preemption means the auth-hardening slice is purely backend work — no admin SPA changes.

**Alternatives Rejected:** Just document in markdown (easy to miss in code); skip the `Authorization` header (would require client changes when auth-hardening slice ships).

**Consequences:** 2 TODO comments + 1 doc section. Header is sent but currently ignored — costs nothing.

---

### Decision 9 — MikroTik save = disabled `em breve` (resolves OQ-1)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** OQ-1 asked whether MikroTik config card's Save button should be (a) disabled, (b) write to localStorage, or (c) cut entirely.

**Choice:** **(a) Disabled `<EmBreveButton blockingSlice="network-config-write">Salvar</EmBreveButton>`**. Tooltip: `"Endpoint pendente — slice de configuração de rede"`.

**Rationale:** Mirrors Monetização posture; consistent UX for "feature exists but backend pending"; uses Decision 6's shared component so when the backend ships, swap is mechanical.

**Consequences:** 1 of the 8 EmBreveButton occurrences. Form fields remain editable so operators can preview their intended values; just no persistence.

---

### Decision 10 — Hand-write TS types (resolves OQ-2)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** OQ-2 asked whether to adopt `openapi-typescript` for codegen now or hand-write types per slice 1's Decision 6.

**Choice:** **Hand-write** all types in `src/types/api.ts`. Add a `tests/contract/openapi.test.ts` that loads `/openapi.json` and asserts the 14 endpoint response field-sets match the hand-written types — same drift-detection pattern as slice 1's `test_openapi_contract.py`.

**Rationale:** Surface size at this slice (~250 LoC of types) is reviewable. `openapi-typescript` adds a build dep + a CI step; not worth it yet. Adopt when surface exceeds ~300 LoC (probably the multi-tenant slice).

**Consequences:** 1 hand-written types file (~250 LoC) + 1 contract test. Manual sync when backend changes — but the OpenAPI fixture test fails CI in that case.

---

### Decision 11 — Manter conectado checkbox kept (resolves OQ-8)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** OQ-8 asked whether to keep the FR-003 "Manter conectado" UX checkbox.

**Choice:** **Keep it** — verbatim from the prototype. When checked → Zustand `auth` store persists to `localStorage`; when unchecked → persists to `sessionStorage`.

**Rationale:** Matches FR-003; matches `login.jsx:43-45`; minimal cost.

**Consequences:** ~10 LoC; Zustand `persist` middleware configured to switch storage backends based on the `remember` flag.

---

### Decision 12 — Vite manualChunks split per Section 7 / Decision 7 of slice 1, scaled

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-05-04 |

**Context:** SHOULD goal: initial JS ≤ 150 KB gzipped. Some sections are heavy (Reports table + Configurações' multi-card form) and rarely visited.

**Choice:** Vite `build.rollupOptions.output.manualChunks` splits the rarely-visited sections into separate chunks:

```typescript
manualChunks: {
  'reports-chunk':       ['./src/sections/relatorios/RelatoriosPage.tsx'],
  'configuracoes-chunk': ['./src/sections/configuracoes/ConfiguracoesPage.tsx'],
  'monetizacao-chunk':   ['./src/sections/monetizacao/MonetizacaoPage.tsx'],
  'react-vendor':        ['react', 'react-dom', 'react-router-dom'],
  'tanstack':            ['@tanstack/react-query'],
}
```

Plus `React.lazy` on the 3 lazy section pages so the chunk only loads when the route mounts.

**Rationale:**
- Reports + Configurações + Monetização are admin-only routes; Anunciante never sees them.
- Splitting React + Router + TanStack into a `react-vendor` chunk improves long-term browser caching (these change rarely vs. app code).
- Initial JS budget drops from ~140 KB to ~100 KB gzipped.

**Consequences:** ~6 lines of vite.config.ts; lazy chunks load with imperceptible latency for desktop users.

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| **Root config (10)** | | | | | |
| 1 | `mkt-wifi-admin/.gitignore` | Create | Standard ignores | (direct) | — |
| 2 | `mkt-wifi-admin/package.json` | Create | Pinned deps per Decision 1 | (direct) | — |
| 3 | `mkt-wifi-admin/tsconfig.json` | Create | Strict + noUnusedLocals + noUnusedParameters | (direct) | 2 |
| 4 | `mkt-wifi-admin/vite.config.ts` | Create | React plugin + manualChunks (Decision 12) + dev proxy /api → :8000 | (direct) | 2 |
| 5 | `mkt-wifi-admin/index.html` | Create | `<html lang="pt-BR">` + viewport | (direct) | — |
| 6 | `mkt-wifi-admin/playwright.config.ts` | Create | iPhone 14 Pro + desktop 1280×720 projects + webServer for backend + frontend | @test-generator | 2 |
| 7 | `mkt-wifi-admin/vitest.config.ts` | Create | jsdom env | @test-generator | 2 |
| 8 | `mkt-wifi-admin/.eslintrc.cjs` | Create | TS-ESLint + react-hooks + no-restricted-syntax for forbidden field literals | (direct) | 2 |
| 9 | `mkt-wifi-admin/README.md` | Create | Quickstart + AT-to-test mapping + architecture summary | @react-specialist | All |
| 10 | `backend/scripts/grep_pii_check.sh` | **Modify** | Add `mkt-wifi-admin/src` to TARGETS array | (direct) | — |
| **Entry points + types + strings (5)** | | | | | |
| 11 | `mkt-wifi-admin/src/main.tsx` | Create | QueryClientProvider + RouterProvider + StrictMode + ErrorBoundary | @react-specialist | 12, 13, 14 |
| 12 | `mkt-wifi-admin/src/App.tsx` | Create | Outlet wrapper; injects toast container; reads `lastVisitedRoute` for tab-reopen | @react-specialist | 21, 25 |
| 13 | `mkt-wifi-admin/src/routes.tsx` | Create | React Router v6 route config: `/login` + `/` (auth-gated) + 9 sections wrapped in `<RoleGuard>` + `*` → `<ForbiddenPage>` | @react-specialist | 21, 73, all section pages |
| 14 | `mkt-wifi-admin/src/types/api.ts` | Create | Hand-written TS types for the 14 admin endpoints' request/response shapes (Decision 10) | @react-specialist | — |
| 15 | `mkt-wifi-admin/src/strings.ts` | Create | Frozen pt-BR copy object — verbatim from prototype, organized by section | @react-specialist | — |
| **API hooks (TanStack Query) (11)** | | | | | |
| 16 | `mkt-wifi-admin/src/api/client.ts` | Create | `fetch` wrapper. Reads `authStore.token` and sets `Authorization: Bearer ...` header (TODO marker per Decision 8). 700ms timeout fallback removed (TanStack Query handles retries). | @react-specialist | 21 |
| 17 | `mkt-wifi-admin/src/api/staleTimes.ts` | Create | Constants per Decision 7 | @react-specialist | — |
| 18 | `mkt-wifi-admin/src/api/auth.ts` | Create | `useLoginMutation`, `useLogoutMutation` | @react-specialist | 14, 16, 21 |
| 19 | `mkt-wifi-admin/src/api/kpis.ts` | Create | `useKpis`, `useWeeklyConnections`, `useDemographics` | @react-specialist | 14, 16, 17 |
| 20 | `mkt-wifi-admin/src/api/campaigns.ts` | Create | `useCampaigns({status?, view?, limit?})`, `useCreateCampaign`, `useUpdateCampaign`, `useDeleteCampaign` — full CRUD; reference implementation per BRAINSTORM | @react-specialist | 14, 16, 17 |
| 21 | `mkt-wifi-admin/src/api/users.ts` | Create | `useUsers({zone?, q?})`, `useLiveUsers({limit?})` — types **omit** phone/email/last_name from the consumed shape (still in raw response per A-004) | @react-specialist | 14, 16, 17 |
| 22 | `mkt-wifi-admin/src/api/devices.ts` | Create | `useDevices()`, `useRefreshDevice` | @react-specialist | 14, 16, 17 |
| 23 | `mkt-wifi-admin/src/api/notifications.ts` | Create | `useNotifRules()`, `useToggleRule` (PATCH), `useNotifGroups()` | @react-specialist | 14, 16, 17 |
| 24 | `mkt-wifi-admin/src/api/monetization.ts` | Create | `useMonetizationPlans()` (read-only — no mutation hook) | @react-specialist | 14, 16, 17 |
| 25 | `mkt-wifi-admin/src/api/reports.ts` | Create | `useReports()` (list-only) | @react-specialist | 14, 16, 17 |
| 26 | `mkt-wifi-admin/src/api/index.ts` | Create | Barrel re-export | @react-specialist | 18-25 |
| **Stores (Zustand) (3)** | | | | | |
| 27 | `mkt-wifi-admin/src/stores/auth.ts` | Create | Auth store with `persist` middleware; conditional `localStorage`/`sessionStorage`; 7-day TTL `isExpired()` (Decision 3) | @react-specialist | 14 |
| 28 | `mkt-wifi-admin/src/stores/toasts.ts` | Create | Volatile queue; auto-dismiss after 3s | @react-specialist | — |
| 29 | `mkt-wifi-admin/src/stores/prefs.ts` | Create | `lastVisitedRoute` only (this slice); `persist` to localStorage | @react-specialist | — |
| **Shell (4)** | | | | | |
| 30 | `mkt-wifi-admin/src/shell/Shell.tsx` | Create | Sidebar + Topbar + ToastContainer + `<Outlet />` layout | @react-specialist | 31, 32, 33, 38 |
| 31 | `mkt-wifi-admin/src/shell/Sidebar.tsx` | Create | 9 nav links + role-gated visibility + badges + role-label header | @react-specialist | 27, 19, 22, 23 |
| 32 | `mkt-wifi-admin/src/shell/Topbar.tsx` | Create | Section title (per route) + live online count (`useLiveUsers`) + `Nova campanha` CTA | @react-specialist | 21, 27 |
| 33 | `mkt-wifi-admin/src/shell/UserDropdown.tsx` | Create | Initials + name + Meu perfil / Sair | @react-specialist | 27, 18 |
| **UI primitives (13)** | | | | | |
| 34 | `mkt-wifi-admin/src/ui/Button.tsx` | Create | Primary / ghost variants; min-height 44 px touch target | @react-specialist | — |
| 35 | `mkt-wifi-admin/src/ui/EmBreveButton.tsx` | Create | Disabled button with `data-testid="em-breve-{slice}"` and `title` tooltip (Decision 6) | @react-specialist | 15 |
| 36 | `mkt-wifi-admin/src/ui/Modal.tsx` | Create | Generic modal with backdrop + escape-to-close; used by Nova/Editar campanha | @react-specialist | — |
| 37 | `mkt-wifi-admin/src/ui/Field.tsx` | Create | Label + control (text / select / chip) — port from captive-portal pattern | @react-specialist | — |
| 38 | `mkt-wifi-admin/src/ui/ToastContainer.tsx` | Create | Renders `useToastsStore` queue with auto-dismiss | @react-specialist | 28 |
| 39 | `mkt-wifi-admin/src/ui/Tabs.tsx` | Create | Status filter tabs for Campanhas | @react-specialist | — |
| 40 | `mkt-wifi-admin/src/ui/Pill.tsx` | Create | Generic pill (status badges, pill labels) | @react-specialist | — |
| 41 | `mkt-wifi-admin/src/ui/StatusBadge.tsx` | Create | Online/offline/active/paused/ended pills with semantic colors | @react-specialist | 40 |
| 42 | `mkt-wifi-admin/src/ui/RoleGuard.tsx` | Create | Role-gating wrapper (Decision 5) | @react-specialist | 27, 50 |
| 43 | `mkt-wifi-admin/src/ui/AuthGate.tsx` | Create | Redirects unauthenticated users to `/login?next=...`; redirects authenticated users away from `/login` to `lastVisitedRoute` | @react-specialist | 27, 29 |
| 44 | `mkt-wifi-admin/src/ui/Sparkline.tsx` | Create | Tiny SVG line chart for the Conexões-por-dia mini chart | @react-specialist | — |
| 45 | `mkt-wifi-admin/src/ui/ProgressBar.tsx` | Create | Used for demographics + ad progress | @react-specialist | — |
| 46 | `mkt-wifi-admin/src/ui/EmptyState.tsx` | Create | Icon + title + description (FR-153) | @react-specialist | — |
| **Utils (3)** | | | | | |
| 47 | `mkt-wifi-admin/src/utils/format.ts` | Create | `formatBRL`, `formatRelative`, `getInitials`, `formatPercent` | @react-specialist | — |
| 48 | `mkt-wifi-admin/src/utils/withRetries.ts` | Create | Port from `captive-portal-frontend/src/state/retry.ts` (slice 1 Decision 11) | @react-specialist | — |
| 49 | `mkt-wifi-admin/src/utils/icons.tsx` | Create | Subset of `mkt-wifi-frontend/frontend/icons.jsx` ported to TSX (only icons actually used) | @react-specialist | — |
| **Sections — pages (11)** | | | | | |
| 50 | `mkt-wifi-admin/src/sections/login/LoginPage.tsx` | Create | Email + password + "Manter conectado" + Solicitar acesso (mailto:) — SSO buttons + Esqueci senha hidden | @react-specialist | 18, 27, 34, 37 |
| 51 | `mkt-wifi-admin/src/sections/_403/ForbiddenPage.tsx` | Create | "Acesso negado" + link back to `/` | @react-specialist | 15 |
| 52 | `mkt-wifi-admin/src/sections/dashboard/DashboardPage.tsx` | Create | Composes the 4 KPI cards + chart + demographics + active-campaigns + live-users panels | @react-specialist | 53-57 |
| 53 | `mkt-wifi-admin/src/sections/dashboard/KpiCard.tsx` | Create | 1 of 4 hero KPIs with delta % | @react-specialist | 19, 47 |
| 54 | `mkt-wifi-admin/src/sections/dashboard/ConexoesPorDiaChart.tsx` | Create | 7d/30d toggle + sparkline | @react-specialist | 19, 39, 44 |
| 55 | `mkt-wifi-admin/src/sections/dashboard/DemographicsPanel.tsx` | Create | Gender + age-band breakdown (no PII) | @react-specialist | 19, 45 |
| 56 | `mkt-wifi-admin/src/sections/dashboard/ActiveCampaignsPreview.tsx` | Create | Top-4 active campaigns with click-to-edit | @react-specialist | 20 |
| 57 | `mkt-wifi-admin/src/sections/dashboard/LiveUsersPreview.tsx` | Create | Top-5 live users (no PII columns) | @react-specialist | 21, 47 |
| 58 | `mkt-wifi-admin/src/sections/campanhas/CampanhasPage.tsx` | Create | Cards/Tabela toggle + status filter tabs + aggregate KPIs + new-campaign CTA | @react-specialist | 20, 39, 59-62 |
| 59 | `mkt-wifi-admin/src/sections/campanhas/CampaignCard.tsx` | Create | Per-card display + status-conditional actions | @react-specialist | 20, 41, 47 |
| 60 | `mkt-wifi-admin/src/sections/campanhas/CampaignTable.tsx` | Create | Tabela mode | @react-specialist | 20, 41 |
| 61 | `mkt-wifi-admin/src/sections/campanhas/NewCampaignModal.tsx` | Create | Nova campanha form | @react-specialist | 20, 36, 37 |
| 62 | `mkt-wifi-admin/src/sections/campanhas/EditCampaignModal.tsx` | Create | Editar campanha form (status + name + location + duration + source) | @react-specialist | 20, 36, 37 |
| 63 | `mkt-wifi-admin/src/sections/usuarios/UsuariosPage.tsx` | Create | Search + zona filter + aggregate KPIs + list — **no PII columns** | @react-specialist | 21, 64, 65 |
| 64 | `mkt-wifi-admin/src/sections/usuarios/UsersTable.tsx` | Create | Lead list with 6 columns (no PII) | @react-specialist | 21, 47 |
| 65 | `mkt-wifi-admin/src/sections/usuarios/LeadDetailDrawer.tsx` | Create | Detail drawer (no PII; no LGPD-erasure button) | @react-specialist | 21 |
| 66 | `mkt-wifi-admin/src/sections/wifi/WifiPage.tsx` | Create | Aggregate KPIs + per-device cards | @react-specialist | 22, 67 |
| 67 | `mkt-wifi-admin/src/sections/wifi/DeviceCard.tsx` | Create | Online/offline + Atualizar button | @react-specialist | 22, 41, 45 |
| 68 | `mkt-wifi-admin/src/sections/conexoes/ConexoesPage.tsx` | Create | Compose FieldsSummaryCard + MikrotikConfigCard | @react-specialist | 69, 70 |
| 69 | `mkt-wifi-admin/src/sections/conexoes/FieldsSummaryCard.tsx` | Create | Read-only 4-field summary with "Imutável por LGPD" subtitle (R13 fix) | @react-specialist | 15 |
| 70 | `mkt-wifi-admin/src/sections/conexoes/MikrotikConfigCard.tsx` | Create | IP / port / user / password / minutes — **EmBreveButton** for Save (Decision 9) | @react-specialist | 15, 35, 37, 41 |
| 71 | `mkt-wifi-admin/src/sections/notificacoes/NotificacoesPage.tsx` | Create | Rules + groups | @react-specialist | 23, 72, 73 |
| 72 | `mkt-wifi-admin/src/sections/notificacoes/RuleRow.tsx` | Create | Toggle (PATCH); "Expiração de acesso" copy retargeted (R14) | @react-specialist | 23, 41 |
| 73 | `mkt-wifi-admin/src/sections/notificacoes/GroupCard.tsx` | Create | Read-only group display | @react-specialist | 23 |
| 74 | `mkt-wifi-admin/src/sections/relatorios/RelatoriosPage.tsx` | Create | Read-only list — **no Gerar/Baixar/Enviar buttons** | @react-specialist | 25, 41 |
| 75 | `mkt-wifi-admin/src/sections/monetizacao/MonetizacaoPage.tsx` | Create | 4 plan cards + EmBreveButton for Save | @react-specialist | 24, 35 |
| 76 | `mkt-wifi-admin/src/sections/configuracoes/ConfiguracoesPage.tsx` | Create | Read-only Empresa + Integrações cards | @react-specialist | 77, 78 |
| 77 | `mkt-wifi-admin/src/sections/configuracoes/EmpresaCard.tsx` | Create | Razão social + CNPJ + email — **read-only** | @react-specialist | 15 |
| 78 | `mkt-wifi-admin/src/sections/configuracoes/IntegracoesCard.tsx` | Create | 4 connectors with status badges — **read-only** | @react-specialist | 15, 41 |
| **Styles (1)** | | | | | |
| 79 | `mkt-wifi-admin/src/styles.css` | Create | CSS variables theming; ported subset of `mkt-wifi-frontend/frontend/styles.css` (1,056 LoC → ~600 LoC after dropping tweaks-panel + cut-feature styles) | @react-specialist | — |
| **Tests — unit (Vitest) (8)** | | | | | |
| 80 | `mkt-wifi-admin/tests/unit/stores/auth.test.ts` | Create | login → state hydrates; logout → cleared; `isExpired()` after 7 days; `remember=true` → localStorage; `remember=false` → sessionStorage | @test-generator | 27 |
| 81 | `mkt-wifi-admin/tests/unit/stores/toasts.test.ts` | Create | enqueue → queue grows; dismiss → entry removed; auto-dismiss after 3 s (fake timers) | @test-generator | 28 |
| 82 | `mkt-wifi-admin/tests/unit/api/client.test.ts` | Create | client sets Authorization header from auth store; throws on non-2xx with structured error | @test-generator | 16, 27 |
| 83 | `mkt-wifi-admin/tests/unit/api/campaigns.test.ts` | Create | Hooks query invalidation on mutation success; cache key tuple format | @test-generator | 20 |
| 84 | `mkt-wifi-admin/tests/unit/utils/format.test.ts` | Create | formatBRL, getInitials, formatRelative happy paths | @test-generator | 47 |
| 85 | `mkt-wifi-admin/tests/unit/utils/withRetries.test.ts` | Create | Port from slice 1's `retry.test.ts` | @test-generator | 48 |
| 86 | `mkt-wifi-admin/tests/unit/ui/RoleGuard.test.tsx` | Create | render with allowed role → children; with denied role → ForbiddenPage; without auth → Navigate to /login | @test-generator | 42 |
| 87 | `mkt-wifi-admin/tests/contract/openapi.test.ts` | Create | Loads `/openapi.json`; asserts the 14 admin endpoint response field-sets match `src/types/api.ts` (Decision 10 drift guard) | @test-generator | 14 |
| **Tests — e2e (Playwright) (5)** | | | | | |
| 88 | `mkt-wifi-admin/tests/e2e/login.spec.ts` | Create | AT-001, AT-002, AT-003 | @test-generator | All |
| 89 | `mkt-wifi-admin/tests/e2e/role-gating.spec.ts` | Create | AT-011..AT-016 (admin / advertiser / viewer flows) | @test-generator | All |
| 90 | `mkt-wifi-admin/tests/e2e/campanhas-crud.spec.ts` | Create | AT-029..AT-036 (full CRUD happy path) | @test-generator | All |
| 91 | `mkt-wifi-admin/tests/e2e/lgpd-no-pii.spec.ts` | Create | AT-051 — DOM scrape across all 9 sections for phone/email/CPF patterns | @test-generator | All |
| 92 | `mkt-wifi-admin/tests/e2e/deleted-endpoints.spec.ts` | Create | AT-052 — network-tab capture across all sections; assert no requests to `/api/connect` or `/api/connection/form` | @test-generator | All |
| **Tests — fixtures (1)** | | | | | |
| 93 | `mkt-wifi-admin/tests/fixtures/expected_strings_pt-BR.txt` | Create | Snapshot of canonical pt-BR strings extracted from `src/strings.ts`; AT-018-equivalent | @test-generator | 15 |

**Total Files:** 92 created + 1 modified = **93 files** (within the 80–100 estimate from DEFINE).

---

## Agent Assignment Rationale

| Agent | Files Assigned | Why This Agent |
|-------|----------------|----------------|
| **@react-specialist** | 11–15, 16–26, 27–29, 30–33, 34–46, 47–49, 50–78, 79 (~62 files) | React 18 + Vite + TS strict + TanStack Query + Zustand + React Router. All slice-1 patterns extended. |
| **@test-generator** | 6, 7, 80–93 (~17 files) | Vitest unit + Playwright e2e + OpenAPI contract test. Same pattern as slice 1 but at admin-SPA scale. |
| **(direct)** | 1, 2, 3, 4, 5, 8, 10 (7 files) | Trivial config files; no specialization needed. |
| **@code-reviewer** | (final pass — all files) | Cross-cutting LGPD compliance, TypeScript strictness, no `Any` in OpenAPI, role-gating completeness. |

---

## Code Patterns

### Pattern 1: Zustand auth store with conditional persist + 7-day TTL

```typescript
// src/stores/auth.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { loginRequest } from '../api/auth';

export type Role = 'admin' | 'advertiser' | 'viewer';

type User = { email: string; name: string; role: Role };

type AuthState = {
  user: User | null;
  token: string | null;
  remember: boolean;
  loginAt: number | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  isExpired: () => boolean;
};

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      remember: false,
      loginAt: null,

      login: async (email, password, remember) => {
        const res = await loginRequest({ email, password });
        if (!res.ok) throw new Error(res.message ?? 'Email ou senha incorretos.');
        set({
          user: res.user,
          token: res.token,
          remember,
          loginAt: Date.now(),
        });
      },

      logout: () => {
        set({ user: null, token: null, remember: false, loginAt: null });
        // Clear both storages defensively (in case remember was toggled)
        localStorage.removeItem('mktwifi-auth');
        sessionStorage.removeItem('mktwifi-auth');
      },

      isExpired: () => {
        const { loginAt } = get();
        if (!loginAt) return true;
        return Date.now() - loginAt > SEVEN_DAYS_MS;
      },
    }),
    {
      name: 'mktwifi-auth',
      // Conditional storage based on `remember` — set at write time
      storage: createJSONStorage(() =>
        typeof window === 'undefined'
          ? (undefined as unknown as Storage)
          : (useAuthStore.getState().remember ? localStorage : sessionStorage),
      ),
    },
  ),
);

// Cross-tab logout sync (AT-020)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'mktwifi-auth' && e.newValue === null) {
      useAuthStore.setState({ user: null, token: null, loginAt: null });
    }
  });
}
```

### Pattern 2: TanStack Query hook factory with mutation invalidation

```typescript
// src/api/campaigns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';
import { STALE } from './staleTimes';
import type { Campaign, CampaignCreate, CampaignUpdate } from '../types/api';

const KEY = ['campaigns'] as const;

export function useCampaigns(filters: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: [...KEY, filters] as const,
    queryFn: () => client.get<Campaign[]>('/api/campaigns', filters),
    staleTime: STALE.campaigns,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CampaignCreate) => client.post<Campaign>('/api/campaigns', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCampaign(cid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CampaignUpdate) =>
      client.patch<Campaign>(`/api/campaigns/${cid}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cid: string) => client.delete(`/api/campaigns/${cid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
```

### Pattern 3: API client with Authorization header preemption (Decision 8)

```typescript
// src/api/client.ts
import { useAuthStore } from '../stores/auth';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  // TODO(auth-hardening-slice): backend currently doesn't validate this token.
  // The header is sent so when server-side validation lands, no client change is needed.
  const token = useAuthStore.getState().token;

  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const client = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null) as [string, string][],
        )
      : '';
    return call<T>('GET', path + qs);
  },
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body),
  delete: (path: string) => call<void>('DELETE', path),
};
```

### Pattern 4: React Router config with RoleGuard wrappers

```typescript
// src/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './shell/Shell';
import { LoginPage } from './sections/login/LoginPage';
import { ForbiddenPage } from './sections/_403/ForbiddenPage';
import { AuthGate } from './ui/AuthGate';
import { RoleGuard } from './ui/RoleGuard';
import { DashboardPage } from './sections/dashboard/DashboardPage';
import { CampanhasPage } from './sections/campanhas/CampanhasPage';
import { UsuariosPage } from './sections/usuarios/UsuariosPage';
// ... etc

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AuthGate><Shell /></AuthGate>,
    children: [
      { index: true, element: <RoleGuard allow={['admin', 'advertiser', 'viewer']}><DashboardPage /></RoleGuard> },
      { path: 'campanhas', element: <RoleGuard allow={['admin', 'advertiser', 'viewer']}><CampanhasPage /></RoleGuard> },
      { path: 'usuarios', element: <RoleGuard allow={['admin', 'viewer']}><UsuariosPage /></RoleGuard> },
      { path: 'wifi', element: <RoleGuard allow={['admin', 'viewer']}><WifiPage /></RoleGuard> },
      { path: 'conexoes', element: <RoleGuard allow={['admin', 'viewer']}><ConexoesPage /></RoleGuard> },
      { path: 'notificacoes', element: <RoleGuard allow={['admin', 'viewer']}><NotificacoesPage /></RoleGuard> },
      { path: 'relatorios', element: <RoleGuard allow={['admin', 'advertiser', 'viewer']}><RelatoriosPage /></RoleGuard> },
      { path: 'monetizacao', element: <RoleGuard allow="admin"><MonetizacaoPage /></RoleGuard> },
      { path: 'configuracoes', element: <RoleGuard allow="admin"><ConfiguracoesPage /></RoleGuard> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

### Pattern 5: EmBreveButton (Decision 6)

```tsx
// src/ui/EmBreveButton.tsx
import { Button } from './Button';

type Props = {
  blockingSlice: string;     // e.g., "notifications-write"
  children: React.ReactNode;
};

export function EmBreveButton({ blockingSlice, children }: Props) {
  return (
    <Button
      type="button"
      disabled
      data-testid={`em-breve-${blockingSlice}`}
      title={`Em breve — pendente da slice ${blockingSlice}`}
    >
      {children}
    </Button>
  );
}
```

### Pattern 6: Vite config with manualChunks + dev proxy

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'reports-chunk':       ['./src/sections/relatorios/RelatoriosPage.tsx'],
          'configuracoes-chunk': ['./src/sections/configuracoes/ConfiguracoesPage.tsx'],
          'monetizacao-chunk':   ['./src/sections/monetizacao/MonetizacaoPage.tsx'],
          'react-vendor':        ['react', 'react-dom', 'react-router-dom'],
          'tanstack':            ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

### Pattern 7: PII grep script extension (modifies existing slice-1 script)

```bash
# backend/scripts/grep_pii_check.sh — modify TARGETS array

TARGETS=(
  "$ROOT/backend/portal_routes.py"
  "$ROOT/backend/schemas/portal.py"
  "$ROOT/backend/fixtures/portal_fixtures.py"
)
[[ -d "$ROOT/captive-portal-frontend/src" ]] && TARGETS+=("$ROOT/captive-portal-frontend/src")
[[ -d "$ROOT/mkt-wifi-admin/src" ]] && TARGETS+=("$ROOT/mkt-wifi-admin/src")  # NEW
```

---

## Data Flow

```text
Login flow:
1. User opens / (no auth) → AuthGate redirects to /login?next=/
2. User enters email + password + checks "Manter conectado"
3. LoginPage calls useLoginMutation → client.post('/api/auth/login') → 200 + token + user
4. authStore.login() sets user/token/remember/loginAt; persist middleware writes to localStorage (remember=true) or sessionStorage
5. Router navigates to /next (default /)
6. AuthGate sees user → renders Shell + Dashboard

Per-section reads:
1. Section page mounts; uses TanStack Query hook (e.g., useCampaigns)
2. Hook builds queryKey ['campaigns', filters]; checks cache
3. If stale or absent → client.get('/api/campaigns', filters)
4. client.ts adds Authorization: Bearer <token> header (currently unused server-side per Decision 8)
5. Response cached; components re-render

Per-section mutations (e.g., create campaign):
1. User clicks Salvar in NewCampaignModal
2. useCreateCampaign mutation → client.post('/api/campaigns', body) → 201 + new Campaign
3. onSuccess invalidates queryKey ['campaigns'] → list refetches automatically
4. toastsStore.enqueue('Campanha criada')
5. Modal closes; toast appears for 3s

Logout flow:
1. User clicks Sair in UserDropdown
2. UserDropdown calls authStore.logout()
3. Auth store cleared; localStorage + sessionStorage 'mktwifi-auth' removed
4. Router redirects to /login (AuthGate detects null user)
5. Storage event fires in other tabs → same store cleared (AT-020)
```

---

## Integration Points

| External System | Integration Type | Authentication | Status This Slice |
|-----------------|------------------|----------------|-------------------|
| FastAPI backend (`:8000`) | HTTP `/api/*` via TanStack Query | `Authorization: Bearer <token>` header sent (currently ignored server-side per Decision 8) | Live; no backend changes |
| Slice-1 captive portal (`:5173`) | Independent — admin SPA never calls captive-portal endpoints | n/a | AT-052 enforces zero requests to `/api/connect` or `/api/connection/form` |
| Browser `localStorage` / `sessionStorage` | Zustand `persist` middleware | n/a | Auth + prefs |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal | Maps to AT |
|-----------|-------|-------|-------|---------------|------------|
| **Unit (stores)** | Auth + toasts + prefs reducers | `tests/unit/stores/*.test.ts` | Vitest + jsdom | 100% on store actions | AT-017, AT-018, AT-019, AT-020, AT-023 |
| **Unit (hooks)** | TanStack Query hook factories: queryKey shape, invalidation, optimistic updates | `tests/unit/api/*.test.ts` | Vitest + `@tanstack/react-query`'s test utilities | ≥ 70% on `src/api/` | AT-031, AT-032, AT-036 |
| **Unit (utils)** | format, getInitials, withRetries | `tests/unit/utils/*.test.ts` | Vitest | 100% | (cross-cutting) |
| **Unit (UI)** | RoleGuard | `tests/unit/ui/RoleGuard.test.tsx` | Vitest + jsdom | 100% on guard branches | AT-012, AT-015 |
| **Contract (OpenAPI)** | TS types vs Pydantic models | `tests/contract/openapi.test.ts` | Vitest | 14 endpoints field-set match | (Decision 10 drift guard) |
| **E2E (login)** | Login + logout + restore | `tests/e2e/login.spec.ts` | Playwright | AT-001, AT-002, AT-003 | AT-001..003 |
| **E2E (role-gating)** | Admin / Advertiser / Viewer flows | `tests/e2e/role-gating.spec.ts` | Playwright | All 3 roles | AT-011, AT-013, AT-015, AT-016 + sidebar/nav assertions per role |
| **E2E (Campanhas CRUD)** | Reference happy-path flow | `tests/e2e/campanhas-crud.spec.ts` | Playwright | Nova → Editar → Pausar → Reativar → Excluir | AT-029..AT-036 |
| **E2E (LGPD invariants)** | DOM scrape across all 9 sections | `tests/e2e/lgpd-no-pii.spec.ts` | Playwright | 0 PII strings | **AT-051** |
| **E2E (deleted endpoints)** | Network-tab capture | `tests/e2e/deleted-endpoints.spec.ts` | Playwright | 0 requests to deleted routes | **AT-052** |
| **Static (TS strict)** | Type-check entire SPA | `npm run build` (tsc step) | TypeScript 5.5 | 0/0 | AT-007 |
| **Static (Vite build)** | Bundle budget | `npm run build` | Vite 5.4 | ≤ 150 KB gzipped initial | AT-008 |
| **Static (PII grep)** | Forbidden field identifiers | `bash backend/scripts/grep_pii_check.sh` | bash | 0 matches | AT-009 |
| **Static (deleted endpoint grep)** | `/api/connection/form` references | `grep -r '/api/connection/form' mkt-wifi-admin/src` | grep | 0 matches | AT-010 |

**ATs covered: 50 / 52** — AT-051 + AT-052 are the strongest because they're cross-cutting safety nets, but they only run after the per-section ATs verify the underlying behavior.

---

## Error Handling

| Error Type | Where | Handling Strategy | Retry? | UX |
|------------|-------|-------------------|--------|-----|
| Login 401 ("Email ou senha incorretos.") | LoginPage | Show error message inline; auth store stays empty | No (user retries) | Inline message |
| Generic API 4xx | TanStack Query `onError` | Show toast with `STR.errors.generic`; don't invalidate cache | No | Toast |
| API 5xx | TanStack Query default + `withRetries` integration | Retry up to 3× with exponential backoff (slice-1 retry helper) | Yes (3 retries) | Toast on final failure |
| 403 Forbidden (role-gate violation, direct URL) | RoleGuard | Render ForbiddenPage | No | 403 page |
| Token expired (`isExpired()` returns true on app boot) | AuthGate | Clear auth store; redirect to `/login?next=/...&reason=expired` | No (user re-authenticates) | Login page with subtle "sessão expirou" notice |
| Network offline | TanStack Query `networkMode: 'offlineFirst'` | Show stale data + an offline banner | Auto-refetch on reconnect | Banner |
| Mutation failure (e.g., POST campaigns 500) | useMutation `onError` | Toast with the error message; modal stays open so user can retry | User-initiated | Toast + modal |

---

## Configuration

| Config Key | Type | Default | Where | Description |
|------------|------|---------|-------|-------------|
| `STALE.kpis` etc. | int (ms) | per Decision 7 table | `src/api/staleTimes.ts` | Per-endpoint TanStack Query staleTime |
| Auth TTL | int (ms) | `7 * 24 * 3600 * 1000` | `src/stores/auth.ts` | 7-day client-side TTL (matches `login.jsx:244`) |
| Toast auto-dismiss | int (ms) | `3000` | `src/stores/toasts.ts` | Each toast renders for 3 s |
| Vite dev port | int | `5174` | `vite.config.ts` | Backend on :8000, captive-portal on :5173, admin on :5174 |
| Vite proxy `/api → :8000` | URL | `http://localhost:8000` | `vite.config.ts` | Dev only |

---

## Security Considerations (resolves OQ-3)

> **This slice does NOT close the auth-token-not-validated gap.** It documents the gap explicitly and ensures the fix is a backend-only change in a future slice.

### The known gap

`backend/main.py` admin endpoints (`/api/kpis`, `/api/campaigns/*`, `/api/users`, `/api/devices/*`, `/api/notifications/*`, `/api/monetization`, `/api/reports`) take only `Depends(get_session)` — no `Depends(verify_token)`. The login endpoint mints an opaque token (`base64(email)[:12] + token_hex(8)`), but no admin endpoint validates it. **Anyone with a network path to `:8000` can call these endpoints without authentication.** NFR-016 ("role enforcement must be server-side") is **not met**.

### What this slice does (UX-only safeguards)

1. Role-gating via `<RoleGuard>` and `<AuthGate>` — purely client-side; provides correct UX for honest users but trivially bypassable.
2. `Authorization: Bearer <token>` header sent on every request — **server ignores it today**. Pre-wired so the future auth-hardening slice is purely backend.
3. Two `// TODO(auth-hardening-slice)` markers in `src/api/client.ts` and `src/ui/RoleGuard.tsx` so reviewers see the gap from the code.

### What the future auth-hardening slice will do

- Add `Depends(verify_token)` to every admin endpoint
- Replace the demo-style opaque token with a real JWT (`python-jose`) — claims include `email`, `role`, `exp`
- Server-side TTL enforcement (replaces the current client-only 7-day check)
- Per-endpoint role check (e.g., `Depends(require_role(['admin']))`)

The admin SPA (this slice's output) will need **zero changes** when auth-hardening lands — the header is already sent, role gating is already wired UX-side, and the TODO markers will be removed.

### LGPD posture (no change from slice 1)

- 4 layers of NFR-005 enforcement:
  1. Pydantic `Literal` types + `extra="forbid"` on portal endpoints (slice 1)
  2. Bash grep CI guard (extended to `mkt-wifi-admin/src/` per Pattern 7)
  3. ESLint `no-restricted-syntax` rule rejecting forbidden field literals
  4. AT-051 DOM-scrape e2e — runtime guarantee no PII renders to operators

### CSRF / XSS

- React's default escaping handles XSS in rendered text.
- No third-party iframes; no `dangerouslySetInnerHTML` anywhere.
- CSRF: not applicable (no auth state to forge against; backend doesn't validate tokens anyway).
- CORS currently `["*"]` in `main.py` for dev — production should tighten to the deployed admin origin.

---

## Observability

| Aspect | Implementation This Slice | Future Slice |
|--------|---------------------------|--------------|
| Console errors | Captured in Playwright spec (AT-052 implicit — `page.on('console', e => { if (e.type === 'error') throw new Error(...) })`) | None this slice |
| API errors | Surfaced via toasts + TanStack Query devtools (dev only) | A future observability slice can pipe TanStack Query's `QueryCache` events to Cloud Logging / Langfuse |
| Routing transitions | Sidebar/topbar derive section title from current route — implicit observability | Same hook into future RUM |
| Bundle size | Tracked via `vite build` output | `.size-limit` config could enforce in CI, but YAGNI for this slice |

---

## Open Questions Resolution (from DEFINE)

| OQ | Resolution |
|----|------------|
| **OQ-1** | MikroTik Save = `<EmBreveButton blockingSlice="network-config-write">` (Decision 9) |
| **OQ-2** | Hand-write types + OpenAPI fixture test (Decision 10) |
| **OQ-3** | Security Considerations § + 2 TODO comments + preemptive `Authorization` header (Decision 8) |
| **OQ-4** | Yes — CI smoke `git diff --exit-code mkt-wifi-frontend/`. Added as part of CI pipeline; not a new file. |
| **OQ-5** | Anunciante shows ALL campaigns this slice; backend has no `Campaign.owner_id` FK. Multi-tenant slice introduces it. Documented as a TODO marker in `src/api/campaigns.ts`. |
| **OQ-6** | Shared `<EmBreveButton>` component (Decision 6) |
| **OQ-7** | Per-endpoint `staleTime` table in `src/api/staleTimes.ts` (Decision 7) |
| **OQ-8** | "Manter conectado" checkbox kept (Decision 11) |

---

## Deferred Assumption Tracking

| Assumption | Status After /design | Next Check Point |
|------------|---------------------|------------------|
| **A-001** TanStack Query v5 compat | ✅ **Validated** — `5.100.9`, peer `react@^18 \|\| ^19` | Pinned in package.json |
| **A-002** React Router v6 vs v7 | ✅ **Validated** — locked v6.30.3 (DEFINE default) | Pinned |
| **A-003** Zustand v4 vs v5 | ✅ **Validated** — locked v5.0.13 (cleaner persist) | Pinned |
| **A-004** Backend `/api/users` response shape | ✅ **Confirmed during DEFINE** | Stable |
| **A-005** Demo accounts stable | ✅ **Confirmed during DEFINE** | Stable |
| **A-006** Auth token opaque | ✅ **Confirmed during DEFINE; informs Decision 8** | Stable |
| **A-007** Zustand `persist` for "Manter conectado" | ✅ **Validated** via Pattern 1 — conditional storage backend works | None — matches `login.jsx:43-45` |
| **A-008** Vite proxy works | ✅ **Validated** — same recipe as slice 1 | None |
| **A-009** Playwright iPhone + desktop | ✅ **Validated** — both projects in `playwright.config.ts` | None |
| **A-010** Visual fidelity acceptable | ✅ **Confirmed** — locked by samples answer | Manual QA during /build |
| **A-011** No `openapi-typescript` codegen | ✅ **Resolved via Decision 10** | None |

**All 11 assumptions resolved or stable.** No deferred risks carrying into /build.

---

## Quality Gate

| Criterion | Status |
|---|---|
| Architecture diagram is clear | ✅ Single comprehensive ASCII showing component boundaries, data flow, and untouched packages |
| All major decisions documented with rationale | ✅ **12 ADRs** (Decisions 1–12) with Context / Choice / Rationale / Alternatives / Consequences |
| File manifest is complete | ✅ **93 files** numbered, with action / agent / dependencies (within the 80–100 estimate) |
| Code patterns are copy-paste ready | ✅ **7 patterns** (Zustand auth store, TanStack Query hook factory, API client, React Router config, EmBreveButton, Vite config, PII grep extension) |
| Testing strategy covers requirements | ✅ **50 of 52 ATs** explicitly mapped to tests; the remaining 2 (AT-018/AT-019 "Manter conectado" persistence variants) are unit-tested in `tests/unit/stores/auth.test.ts` |
| No circular dependencies | ✅ Stores → utils only; api → stores + types; sections → api + stores + ui; ui → stores; routes → sections + ui. Tree is acyclic. |
| Security gap documented | ✅ §Security Considerations + 2 TODO markers + preemptive Authorization header per Decision 8 |
| Bundle budget achievable | ✅ manualChunks (Decision 12) + lazy section pages — projected 90-110 KB gzipped initial vs. 150 KB budget |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-04 | design-agent | Initial design. Validated A-001 (TanStack Query v5.100.9), A-002 (React Router v6.30.3), A-003 (Zustand v5.0.13), A-007/A-008/A-009 against the existing repo. Pre-design inspection confirmed the auth-is-client-side gap (informs Decision 8 + Security Considerations §). Resolved all 8 OQs. **12 ADRs** including 3 library-version pinnings + 8 OQ resolutions + 1 bundle optimization. **93-file manifest** across 7 layers (config / entry / api / stores / shell / sections / ui / utils / tests). **7 code patterns** including Zustand auth store with conditional persist + 7-day TTL, TanStack Query hook factory with mutation invalidation, EmBreveButton shared component, React Router with RoleGuard wrapping. **50 of 52 ATs** explicitly test-mapped. |

---

## Next Step

**Ready for:**
```
/build .claude/sdd/features/DESIGN_ADMIN_SPA.md
```

This will dispatch the build agents (`@react-specialist` for ~62 files, `@test-generator` for ~17 files, plus 7 direct config files) per the agent-assignment table, create files in dependency order, and produce `.claude/sdd/reports/BUILD_REPORT_ADMIN_SPA.md` summarizing what shipped, which 52 ATs pass, and the disposition of the (already-resolved) deferred assumptions.

**Estimated build time** based on slice-1 ratios:
- Slice 1: 48 files / ~2,700 LoC / 1 day of focused work
- Slice 2: 93 files / ~4,500 LoC projected / 2-3 days of focused work — proportional, with the YAGNI cuts keeping the timeline within the BRAINSTORM's 10-14 day estimate (which assumed integration risk + manual QA across all 9 sections, not just the build phase).
