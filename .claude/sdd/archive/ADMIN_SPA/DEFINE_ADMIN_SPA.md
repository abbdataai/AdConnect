# DEFINE: ADMIN_SPA

> Migrate the operator-facing admin SPA off the Babel-standalone HTML prototype onto a production-shaped Vite + React 18 + TypeScript build (`mkt-wifi-admin/`), applying the LGPD posture and R13 fix locked by slice 1, with TanStack Query + Zustand + React Router v6 for state and routing.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ADMIN_SPA |
| **Date** | 2026-05-04 |
| **Author** | define-agent (via /workflow:define) |
| **Status** | ✅ Shipped 2026-05-04 — archived |
| **Clarity Score** | 15/15 |
| **Source Input** | [BRAINSTORM_ADMIN_SPA.md](BRAINSTORM_ADMIN_SPA.md) — pre-validated, 5 questions, 11 decisions, 14 YAGNI cuts, 2 validations passed |

---

## Problem Statement

The MKT WiFi platform's operator-facing admin panel ships today only as a 1.7 MB Babel-standalone HTML prototype (`notes/MKT WiFi - Full App.html`) with no production build pipeline — operators cannot be onboarded against an unproduced asset, R8 in the summary doc remains unresolved, and the prototype's `data.jsx:162` still calls the deleted `/api/connection/form` endpoint that slice 1 removed for LGPD compliance (silently falling through to mocks). Compounding this, the prototype's UI displays `phone`/`email`/`last_name` columns for leads — fields the captive-portal slice explicitly removed from collection per Legal's anonymization mandate (NFR-005, Legal sign-off 2026-05-03) — creating a compliance regression that grows the longer the prototype remains the canonical admin surface. Slice 2 migrates the admin SPA onto the same production-shaped Vite + React 18 + TypeScript recipe slice 1 proved, while applying the LGPD cleanup and R13 fix in the same cycle so both surfaces ship policy-consistent.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| **Administrador** (operator owner — e.g., Praça Central operations team) | Full CRUD on campaigns, devices, leads, monetization, settings | Today, can only access via `file://` URL on a 1.7 MB HTML file — not realistic for production onboarding; no shareable URL, no role isolation (everyone is admin in the prototype). |
| **Anunciante** (advertiser self-service) | Sees own campaigns + KPIs + reports | Has no operator-facing entry point at all today; depends on commercial-team handoff. The summary doc's BD-03 calls out this role but the prototype gives all roles identical UX. |
| **Visualizador** (read-only stakeholder, e.g., partner / auditor) | Reads dashboards + reports without mutation rights | No production-grade entry point; cannot be invited to an audit-style read-only view today. |
| **Operator's Legal/DPO contact** | Owns LGPD compliance posture | Sees the prototype displaying phone/email/last_name and flags it as a regression vs. the just-shipped portal slice — both surfaces should be policy-consistent or neither audit-defensible. |
| **Future backend developers** (multi-tenant, reports-pipeline, LGPD-erasure, monetization-write, notifications-write slices) | Plug new endpoints into a working frontend | Need a production admin SPA whose hooks they can extend. Today they'd be extending Babel-standalone JSX, which has no type safety and no test harness. |

---

## Goals

What success looks like (prioritized):

| Priority | Goal |
|----------|------|
| **MUST** | Migrate the admin SPA off Babel-standalone onto Vite + React 18 + TypeScript strict in a new top-level `mkt-wifi-admin/` package |
| **MUST** | Ship all **9 admin sections** (Dashboard, Campanhas, Usuários, Wi-Fi, Conexões, Notificações, Relatórios, Monetização, Configurações) plus Login + Shell, per the Section-Scope table |
| **MUST** | Apply the LGPD cleanup: hard-drop `phone`/`email`/`last_name` columns from Users + Lead Detail; search-by-phone/email removed; Lead-erasure button cut |
| **MUST** | Apply the R13 fix: Conexões section is read-only fields summary + (locally-displayed) MikroTik config card |
| **MUST** | Implement role-gating via React Router `<RoleGuard>` per the default policy (Administrador all, Anunciante Dashboard + own Campanhas + own Relatórios, Visualizador read-only) |
| **MUST** | TanStack Query for all server state; Zustand for auth/toasts/user-prefs; React Router v6 with real URLs per section |
| **MUST** | All UI strings in pt-BR, verbatim against prototype; frozen in `src/strings.ts` per slice-1 pattern |
| **MUST** | TypeScript strict mode passes with 0 errors / 0 warnings (`tsc --noEmit`) |
| **MUST** | AT-015-equivalent grep extended to `mkt-wifi-admin/src/` returns 0 forbidden-field-identifier matches |
| **MUST** | 0 references to the deleted `/api/connection/form` endpoint in the new SPA source tree |
| **SHOULD** | Vitest unit-test coverage ≥ 70 % on TanStack Query hook factories + Zustand store reducers |
| **SHOULD** | Three Playwright e2e specs minimum: full-login happy path + sidebar role-gating per role + Campanhas CRUD happy path |
| **SHOULD** | Bundle initial JS ≤ 150 KB gzipped (3× the 47 KB captive-portal budget — the surface is 3× larger) |
| **SHOULD** | Every disabled "em breve" CTA has a tooltip naming the blocking backend slice |
| **SHOULD** | Per-section Vite `manualChunks` lazy-load Reports + Configurações (heavy + rarely-visited) |
| **COULD** | TanStack Query `react-query-devtools` enabled in dev but tree-shaken from prod build |
| **COULD** | Persist Zustand auth store to `localStorage` via `persist` middleware (tab refresh keeps session) |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

Measurable outcomes (numeric and testable):

- [ ] All **11 sections** render and behave per the Section Scope table — verified by manual QA against the prototype HTML side-by-side **and** by per-section Playwright happy-path specs.
- [ ] Login + role-gating: 3 demo accounts (`admin@mktwifi.com`, `anunciante@mktwifi.com`, `viewer@mktwifi.com`) each see exactly the navigation + routes their role policy permits — verified by Playwright e2e per role (3 specs).
- [ ] `tsc --noEmit` exits with **0 errors / 0 warnings** under `strict: true` + `noUnusedLocals` + `noUnusedParameters`.
- [ ] **0 matches** for `\b(phone|email|cpf|last_name|mac_address)\b` (as field identifiers) in `mkt-wifi-admin/src/` — verified by extending [backend/scripts/grep_pii_check.sh](../../../backend/scripts/grep_pii_check.sh) with the new directory in `TARGETS`.
- [ ] **0 references** to `/api/connection/form` in `mkt-wifi-admin/src/` — verified by `grep -r 'connection/form' mkt-wifi-admin/src` returning 0 lines.
- [ ] **0 references** to `/api/connect` (the captive-portal endpoint) in `mkt-wifi-admin/src/` — verified by `grep -rE '"/api/connect"' mkt-wifi-admin/src` returning 0 lines (admin SPA never calls portal endpoints).
- [ ] FastAPI OpenAPI `/openapi.json` consumed at `npm run build` time produces TypeScript types for the 13 admin-relevant endpoints — verified by build-time codegen step (or hand-typed with a contract test if codegen not added in this slice; choice locked in /design).
- [ ] Initial JS bundle ≤ **150 KB gzipped**, verified by `vite build` output. Lazy chunks (Relatórios, Configurações) ≤ 50 KB gzipped each.
- [ ] Vitest unit coverage ≥ **70 %** on `src/api/` hooks + `src/stores/` modules — verified by `vitest run --coverage`.
- [ ] Playwright e2e count ≥ **3**: `login.spec.ts`, `role-gating.spec.ts`, `campanhas-crud.spec.ts`. All pass at iPhone 14 Pro **and** desktop 1280×720 viewports.
- [ ] All UI strings in **pt-BR** verbatim — verified by `expected_strings_pt-BR.txt` snapshot diff against `src/strings.ts` (slice-1 pattern extended).
- [ ] Every disabled CTA in the slice (8 total — see Section Scope) has a `title` attribute or tooltip pointing to the blocking backend slice — verified by a Playwright spec asserting `title` attributes on all elements with `data-testid="em-breve-*"`.
- [ ] Backend admin endpoints respond from the new SPA's TanStack Query layer with **0 console errors** during a full-flow happy-path session — verified by Playwright capturing `console.on('error')` and asserting empty.

---

## Acceptance Tests

> 50 ATs grouped into 4 sections: cross-cutting (auth/routing/build), per-role gating, per-section behavior, and post-LGPD/R13 invariants.

### Cross-cutting (AT-001 .. AT-010)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-001** | Login happy path (admin) | The new SPA running at `:5174` and backend at `:8000` | Operator submits `admin@mktwifi.com` / `admin123` | `POST /api/auth/login` returns 200 + token + user; Zustand auth store hydrates; React Router redirects to `/`; Dashboard renders. |
| **AT-002** | Login wrong password | Same as AT-001 | Operator submits `admin@mktwifi.com` / `wrong` | Backend returns `{ ok: false, message: "Email ou senha incorretos." }`; SPA renders the message; auth store remains empty; no route change. |
| **AT-003** | Logout clears session | Logged in as admin | Operator clicks "Sair" in user dropdown | `POST /api/auth/logout` is called; `authStore.logout()` clears state and `localStorage`; React Router redirects to `/login`. |
| **AT-004** | Browser back button works between sections | Logged in as admin, navigated `/` → `/campanhas` → `/usuarios` | User presses browser Back twice | URL becomes `/`; Dashboard re-renders with cached TanStack Query data (no refetch needed within `staleTime`). |
| **AT-005** | Deep-link with query params is preserved | User has bookmarked `/usuarios?zone=Centro` | User opens the URL in a fresh tab while logged in | Usuários section renders with the Zona filter pre-set to `Centro`; URL is unchanged after render. |
| **AT-006** | Unauthenticated deep-link redirects to login then back | Not logged in | User visits `/campanhas` directly | Route guard redirects to `/login?next=/campanhas`; on successful login, redirects back to `/campanhas`. |
| **AT-007** | TypeScript strict pass | `mkt-wifi-admin/` repo with all source | Run `npx tsc --noEmit` | Exit code 0; stdout has no errors and no warnings. |
| **AT-008** | Vite production build succeeds with bundle budget | Same | Run `npx vite build` | Exit code 0; initial JS bundle ≤ 150 KB gzipped; CSS ≤ 20 KB gzipped; lazy chunks ≤ 50 KB gzipped each. |
| **AT-009** | PII grep clean across new admin source | Source tree | `bash backend/scripts/grep_pii_check.sh` (with `mkt-wifi-admin/src` added to TARGETS) | Exit 0; "AT-015 OK: 0 matches across N target(s)" where N includes the new directory. |
| **AT-010** | Deleted endpoint references absent | Source tree | `grep -r '/api/connection/form' mkt-wifi-admin/src` | Exit 1 (zero matches — grep convention). |

### Role-gating (AT-011 .. AT-020)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-011** | Anunciante sidebar gating | Logged in as `anunciante@mktwifi.com` | Sidebar renders | Visible nav: `Início (dashboard) / Campanhas / Relatórios`. Hidden: `Usuários / Wi-Fi / Conexões / Notificações / Monetização / Configurações`. |
| **AT-012** | Anunciante direct-URL access denial | Anunciante logged in | User pastes `/usuarios` into URL bar | `<RoleGuard role="admin\|viewer">` rejects; SPA renders `403 — Acesso negado` page with link back to `/`. |
| **AT-013** | Visualizador sidebar gating | Logged in as `viewer@mktwifi.com` | Sidebar renders | All 9 sections visible (read-allowed); mutation CTAs (Nova campanha, toggle rule, Atualizar device, etc.) are hidden or disabled. |
| **AT-014** | Visualizador cannot mutate even with direct API call attempt | Visualizador logged in | User opens DevTools and triggers `POST /api/campaigns` via `useCreateCampaign` | Mutation hook is wrapped with `enabled: hasRole('admin')`; throws before fetch. (Note: backend does not currently enforce roles — see Open Question OQ-3 about server-side enforcement.) |
| **AT-015** | Administrador full nav access | `admin@mktwifi.com` logged in | Sidebar renders | All 9 sections visible; all CTAs enabled; no `403` reachable from any link. |
| **AT-016** | Role label shown in sidebar | Each of the 3 demo accounts | Sidebar header renders | Initials + name + role label (`Administrador` / `Anunciante` / `Visualizador`) — verbatim per FR-009. |
| **AT-017** | Login persists across page refresh (COULD goal) | Admin logged in via Zustand `persist` middleware | User refreshes the page | Auth state restored from `localStorage`; SPA lands on the previously-visited route, not `/login`. |
| **AT-018** | Tab close + reopen behavior | Admin logged in; "Manter conectado" unchecked | User closes the browser tab and reopens to `/` | Auth state expired (sessionStorage was cleared); SPA redirects to `/login`. |
| **AT-019** | "Manter conectado" → localStorage persistence | Admin logged in with "Manter conectado" checked | User closes browser entirely and reopens | Session restored from `localStorage`; SPA lands on `/`. |
| **AT-020** | Concurrent tab logout sync | Admin logged in across 2 tabs | User clicks Sair in tab 1 | Tab 2 detects auth-store change (Zustand `subscribe` or storage event); navigates to `/login` within 1s. |

### Per-section behavior (AT-021 .. AT-046)

#### Section 1 — Login (covered by AT-001/002/003/017/018/019)

#### Section 2 — Shell (sidebar + topbar + toasts)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-021** | Sidebar badges reflect server state | Admin logged in; backend has 3 active campaigns + 12 online devices | Sidebar renders | `Campanhas` badge shows `3`; `Wi-Fi` badge shows `12` (warn-styled if any device is offline per FR-085). |
| **AT-022** | Topbar live online-count updates | Admin on Dashboard | A new lead connects (mocked or real) so `/api/users/live` count increments | Topbar count refreshes within `staleTime + refetchInterval` (TanStack Query background refetch). |
| **AT-023** | Toast appears on action and dismisses | Admin creates a campaign | `POST /api/campaigns` returns 201 | Zustand toast store enqueues `Campanha criada`; toast renders for 3s then auto-dismisses. |

#### Section 3 — Dashboard

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-024** | 4 hero KPIs render | Admin on `/` | TanStack Query `useKpis()` resolves | 4 cards visible: `Pessoas atingidas` (with delta %), `Campanhas ativas` (with delta count), `Investimento total` (R$ formatted), `Dispositivos online`. |
| **AT-025** | Conexões-por-dia chart with 7d/30d toggle | Same | User toggles between 7d / 30d | Chart re-renders; X-axis label changes; data refetches via TanStack Query if the new range key isn't cached. |
| **AT-026** | Demographics by age + gender (no PII) | Same | `useDemographics()` resolves | Two stacked-bar panels: gender split (Feminino %, Masculino %) + age bracket split (4 brackets). **No phone/email/cpf data anywhere on the dashboard.** |
| **AT-027** | Top-4 active campaigns preview | Same | `useCampaigns({status: 'active', limit: 4})` resolves | 4 campaign cards with click-to-edit; "Criar" button visible. |
| **AT-028** | Top-5 live users (no PII) | Same | `useLiveUsers({limit: 5})` resolves | 5 rows: initials avatar + first-name + age-band + gender + neighborhood + countdown. **Visibly NO phone/email columns** (DOM scrape asserts no `+55` or `@` substrings in the rows). |

#### Section 4 — Campanhas (reference implementation)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-029** | Cards/Tabela toggle | Admin on `/campanhas` in Cards mode | Click "Tabela" toggle | Same data re-renders as a table; URL gains `?view=table`. |
| **AT-030** | Status filter tabs | Admin on `/campanhas` | Click `Pausadas` tab | List filters to `status === 'paused'`; URL gains `?status=paused`; aggregate KPIs update. |
| **AT-031** | Nova campanha modal happy path | Admin clicks "Nova campanha" | Fills name, location, duration, source; clicks Salvar | `POST /api/campaigns` returns 201; modal closes; new card appears in list (TanStack Query invalidates `campaigns` query); toast "Campanha criada". |
| **AT-032** | Editar campanha → PATCH | Admin clicks Editar on a campaign card | Changes status to `paused`; clicks Salvar | `PATCH /api/campaigns/{id}` returns 200; card updates in place; toast "Campanha pausada". |
| **AT-033** | Status-conditional actions per FR-054 | Admin viewing a campaign card | (a) status=active | Available actions: `Editar / Pausar`. |
| **AT-034** | Status-conditional actions cont. | Same | (b) status=paused | Available actions: `Reativar / Dados`. |
| **AT-035** | Status-conditional actions cont. | Same | (c) status=ended | Available actions: `Duplicar / Relatório`. |
| **AT-036** | DELETE campaign | Admin clicks Excluir confirms | `DELETE /api/campaigns/{id}` returns 204; list refreshes; toast "Campanha removida". |

#### Section 5 — Usuários (LGPD-clean)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-037** | Lead list shows ONLY allowed columns | Admin on `/usuarios` | `useUsers()` resolves | Table columns: `first_name + age_band + gender + neighborhood + last_connection + connections_count`. **No phone/email/last_name columns** (verified by Playwright `getByRole('columnheader')` returning exactly the 6 names). |
| **AT-038** | Search by name only | Admin on `/usuarios` | Types `"Maria"` in search box | URL gains `?q=Maria`; `useUsers({q: 'Maria'})` refetches; rows filter to first-name matches. **No "Search by phone/email" affordance in the UI** (verified by absence of `placeholder*=email` / `placeholder*=telefone`). |
| **AT-039** | Filter by Zona | Admin on `/usuarios` | Selects `Centro` from Zona dropdown | URL gains `?zone=Centro`; rows filter; aggregate KPIs update. |
| **AT-040** | Lead Detail drawer (no PII) | Admin clicks chevron on a lead row | Drawer opens | Drawer shows: `first_name`, `age_band`, `gender`, `neighborhood`, `last_connection`, `connections_count`, `consent_text_version` (read-only). **No phone/email/last_name fields anywhere in the drawer.** **No "Excluir lead" / LGPD-erasure button** (cut per YAGNI). |
| **AT-041** | CSV export button is hidden | Admin on `/usuarios` | Look for "Exportar CSV" button | Element is absent from the DOM (not just hidden — actually not rendered). |

#### Section 6 — Wi-Fi Online

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-042** | Per-device cards online vs. offline | Admin on `/wifi`; backend has 2 online + 1 offline device | `useDevices()` resolves | 2 cards show `verde` status pill + CPU/RAM/Mb/s; 1 card shows `vermelho` status pill + "Última vez visto: {relative}" + "Sem conexão". |
| **AT-043** | Atualizar button works | Admin clicks `Atualizar` on a device card | `POST /api/devices/{id}/refresh` returns 200 | Card data updates with returned values; toast "Dispositivo atualizado". |

#### Section 7 — Conexões (R13 fix)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-044** | Read-only fields summary card | Admin on `/conexoes` | Page renders | Card titled "Campos coletados pelo portal" with subtitle "Imutável por LGPD"; lists `Nome / Idade (faixa) / Gênero / Bairro` as 4 read-only rows. **No "+ Adicionar campo" button** anywhere on the page. |
| **AT-045** | MikroTik config card | Same | Page renders | Card titled "Configuração de rede" with editable fields: IP (default 192.168.88.1), API Port (default 8728), API user, API password (masked), Session minutes (default 30). Status badges: "Hotspot ativo" + "Redirect: {ip}" + "{N}min/sessão". **Save button posture per OQ-1 (likely disabled "em breve").** |

#### Section 8 — Notificações

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-046** | Rules list with toggle | Admin on `/notificacoes` | `useNotifRules()` resolves | List of rules; each has channel icon + title + desc + active toggle. Click toggle → `PATCH /api/notifications/rules/{id}` returns 200; UI updates. |
| **AT-047** | "Nova regra" button is hidden | Admin on `/notificacoes` | Look for `+ Nova regra` button | Element is absent from DOM. |
| **AT-048** | Default "Expiração de acesso" rule retargets to operator group (R14) | Admin on `/notificacoes`; backend default-seeds "Expiração de acesso" | Rule renders | Description text reads "Notifica grupo {Operação} 5 minutos antes" (or similar) — **NOT** "Notifica usuário via WhatsApp". Verified by string match against the rule's `desc` field. |
| **AT-049** | Groups read-only | Admin on `/notificacoes` | Groups card renders | 3 groups (Anunciantes / Operação / Comercial) shown with name + member count + desc. **No edit/delete affordance** per the locked scope. |

#### Section 9 — Relatórios (read-only)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-050** | List of reports | Admin on `/relatorios` | `useReports()` resolves | Table with `name / date / type / size`. **No "Gerar relatório" button**, **no per-row "Baixar / Enviar" actions** (cut per YAGNI). |

#### Section 10 — Monetização (disabled-write)

| (covered by AT scope; details in /design code patterns)

#### Section 11 — Configurações (read-only)

| (covered by AT scope; details in /design code patterns)

### Post-LGPD/R13 invariants (cross-cutting safety nets)

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-051** | DOM scrape: no PII strings render anywhere in admin SPA | Admin walks through all 9 sections | After full flow | A Playwright `page.content()` on each section is checked for `\b\d{2}\s?\d{4,5}-?\d{4}\b` (BR phone format), `@` followed by a TLD (rough email check), `\d{3}\.\d{3}\.\d{3}-\d{2}` (CPF format). **0 matches across all sections.** |
| **AT-052** | Network tab: no requests to deleted/forbidden endpoints | Admin walks through all 9 sections | Playwright captures `page.on('request')` | No request URL matches `/api/connect[?$]` (the deleted captive-portal route — admin never calls it) or `/api/connection/form` (deleted in slice 1). |

**52 ATs total**, 32 of them auto-verifiable by Playwright/Vitest, 20 by static checks (grep, tsc, build, coverage report).

---

## Out of Scope

Explicitly NOT included in this feature:

- ❌ **Multi-tenant data isolation** — `organization_id` filtering, RLS, tenant resolution. API hooks accept optional `organizationId` param but it's always undefined in this slice. Multi-tenant slice ships separately.
- ❌ **Real DB persistence migrations / Alembic baseline** — the backend still uses `init_db()` + `seed_if_empty()` with the legacy schema. DB-baseline slice handles this.
- ❌ **Server-side role enforcement** — the backend currently does NOT validate the auth token on admin endpoints (verified in [main.py](../../../backend/main.py); no `Depends(verify_token)` on `/api/kpis`, `/api/campaigns`, etc.). Role-gating in this slice is **client-side only** — sufficient for the demo, NOT sufficient for production. NFR-016 says "role enforcement must be server-side"; that's a future auth-hardening slice.
- ❌ **Real JWT** — the backend's auth token is opaque random bytes (`base64(email)[:12] + token_hex(8)`), not a JWT with claims. No 7-day TTL is enforced server-side. The "session expires in 7 days" is a client-side `localStorage` timestamp check only.
- ❌ **MikroTik POC against real hardware** — R2 POC slice.
- ❌ **Real video creative for ad uploads** — real-creative slice.
- ❌ **Real LGPD legal text content** — placeholder Lorem only; Legal-supplied later.
- ❌ **Notifications dispatcher / WhatsApp + email send** — notifications-write slice.
- ❌ **Reports generation pipeline** — reports-pipeline slice.
- ❌ **LGPD erasure (`DELETE /api/users/{lead_id}`)** — LGPD-erasure slice.
- ❌ **SSO Google + Microsoft buttons** — hidden; SSO slice.
- ❌ **"Esqueci minha senha" / password reset** — hidden; auth-recovery slice.
- ❌ **Tweaks panel** (theme switcher, density, mobile-nav, accent picker — 425 LoC) — design-tools slice.
- ❌ **Browser-notifications toggle** — UI-prefs slice.
- ❌ **Audit log viewer** — audit-pipeline slice.
- ❌ **Empresa + Integrações editing** in Configurações — multi-tenant + per-tenant integrations slices.
- ❌ **Per-tenant configurability** of monetization plan / pricing — multi-tenant slice.
- ❌ **CSV export from Users** — backend `/api/users/export` doesn't exist; export slice.
- ❌ **Reports actions** (Gerar / Baixar / Enviar) — backend gaps.
- ❌ **"Nova regra" notification creation** — backend gap.
- ❌ **Monetização "Salvar modelo" mutation** — backend gap; disabled with `em breve` tooltip.
- ❌ **Backend modernization** — legacy `class Config:` → `model_config = ConfigDict(...)` is a separate `/iterate`, not part of this slice.
- ❌ **`mkt-wifi-frontend/` (legacy folder)** — kept as a reference; NOT modified or deleted.

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| **Compliance (LGPD)** | Slice 1 locked: portal collects only `first_name + age_band + gender + neighborhood`. Admin must mirror this in display. | Hard-drop PII columns from Users + Lead Detail; search-by-phone/email removed; LGPD-erasure button cut. **Non-negotiable.** |
| **R13 fix (inherited)** | Conexões: read-only fields summary + MikroTik config card. | Editable form-builder removed. **Non-negotiable.** |
| **Architecture (FR-039 analog)** | New top-level `mkt-wifi-admin/` package, separate from `mkt-wifi-frontend/` (legacy) and `captive-portal-frontend/` (slice 1). | Three frontends in the repo. CI must run typecheck + tests + build for both new packages. |
| **State management** | TanStack Query (server) + Zustand (UI) + React Router v6 (URLs). Locked in BRAINSTORM Q4. | All hooks land in `src/api/`; all UI state in `src/stores/`; routing in `src/routes.tsx`. |
| **TypeScript strict** | `strict: true` + `noUnusedLocals` + `noUnusedParameters`. | No `any`; explicit return types on hook factories. |
| **Localization** | Every UI string in pt-BR verbatim. | Frozen in `src/strings.ts`; AT-018-equivalent snapshot test guards drift. |
| **No backend changes** | All 9 section pages must work against the existing `main.py` endpoints. Backend gaps → `em breve` UI. | Read-only or disabled-write sections for Reports + Monetização + Configurações + parts of Notificações + Conexões MikroTik save. |
| **Single-tenant** | API hooks accept optional `organizationId` (currently undefined). | Forward-compat with multi-tenant slice; no rewriting hook signatures later. |
| **Auth is client-side only** | Backend doesn't validate tokens; role-gating is UI-only. | This slice does NOT close the security gap; it ships with the same trust model the prototype had. Documented as an explicit out-of-scope item. |
| **Bundle budget scales with surface** | Initial JS ≤ 150 KB gzipped (vs. 47 KB for slice 1). | manualChunks split on Reports + Configurações. |
| **`mkt-wifi-frontend/` legacy folder untouched** | The Babel-standalone JSX stays in place during this slice. | Reference for visual fidelity; deleted in a follow-up after admin SPA proves stable. |

---

## Technical Context

> Essential context for Design phase.

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location (frontend)** | NEW `mkt-wifi-admin/` (top-level, sibling to `captive-portal-frontend/` and `mkt-wifi-frontend/`) | Honors slice-1 pattern; clean separation. |
| **Deployment Location (backend)** | NO new files; NO `main.py` edits | All endpoints already exist. The slice is purely a frontend rewrite. |
| **Untouched in this slice** | `backend/`, `captive-portal-frontend/`, `mkt-wifi-frontend/` | Modifying any is a scope violation. |
| **KB Domains** | `react`, `pydantic` (read-only — for Lead-display-shape verification at the boundary) | React patterns + the captive-portal recipe carry forward. |
| **IaC Impact** | None this slice | No new infrastructure. |
| **Build & dev** | `cd mkt-wifi-admin && npm run dev` (Vite on `:5174`); proxy `/api → http://localhost:8000` | Backend runs on `:8000` as before. **Three frontend ports during dev**: `:5173` (captive portal), `:5174` (admin), backend on `:8000`. |
| **Test runners** | Vitest (unit) + Playwright (e2e) | Same recipe as slice 1; new project in `playwright.config.ts` for `mkt-wifi-admin/`. |
| **Library versions to inherit (slice-1 verified)** | `react@^18.3.1`, `react-dom@^18.3.1`, `vite@^5.4.0`, `typescript@^5.5.3`, `vitest@^2.0.0`, `@playwright/test@^1.45.0` | No version drift between slices. |
| **NEW library deps** | `@tanstack/react-query@^5.x`, `zustand@^4.x` (or `^5.x` — confirm in /design), `react-router-dom@^6.x` (or `^7.x` — confirm in /design) | 3 new deps. |
| **Backend admin endpoints (all GET-or-PATCH; no auth)** | `/api/auth/login`, `/api/auth/logout`, `/api/kpis`, `/api/connections/weekly`, `/api/demographics`, full `/api/campaigns` CRUD, `/api/users`, `/api/users/live`, `/api/devices`, `/api/devices/{id}/refresh`, `/api/notifications/rules` (GET/PATCH), `/api/notifications/groups`, `/api/monetization`, `/api/reports` | 14 endpoints; no `Authorization` header validation server-side. |

**Why This Matters:**

- **Three frontend packages now in the repo.** CI must build + test all three. If a future slice adds a fourth (e.g., a marketing-team campaign-creator surface), this pattern scales.
- **The auth boundary is client-trusted.** /design must call this out in the security section so reviewers understand role-gating is a UX-only safeguard. Future auth-hardening slice closes the gap.
- **`em breve` is now a first-class UX pattern.** 8 disabled CTAs across 4 sections mean the slice ships with a recognized vocabulary for "feature exists in UI but blocked on backend." /design should locate this as a reusable component.

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| **A-001** | TanStack Query v5 is compatible with React 18.3 + TypeScript 5.5 | If v5 has a peer-dep conflict, fall back to v4. Hook API differs slightly (`useQuery({queryKey, queryFn})` vs. `useQuery(key, fn)`) but the pattern is the same. | [ ] /design verifies via `npm install --dry-run @tanstack/react-query@5` |
| **A-002** | React Router v6 is the right version (not v7 which was released late 2024 with API churn) | v7 has `Outlet` + `loader` API changes; if we want loaders this slice, v7 is needed; otherwise v6 is the conservative pick matching the BRAINSTORM choice. | [ ] /design picks; default v6 unless loaders are required |
| **A-003** | Zustand v4 is sufficient (or v5 if released stable) | v5 dropped some legacy APIs. Either is fine; pick whichever has the cleanest `persist` middleware story. | [ ] /design picks |
| **A-004** | Backend `/api/users` continues to return `{phone, email, last_name, ...}` for legacy leads even though the SPA won't display them | If the backend stops returning these fields (e.g., DB-baseline slice drops the columns), the TanStack Query response shape changes. We type the hook to ignore them — forward-compat. | [x] Confirmed via inspection of [main.py:170-184](../../../backend/main.py#L170-L184) |
| **A-005** | The 3 demo accounts (`admin@`, `anunciante@`, `viewer@`) are stable and won't be reseeded with different passwords during the slice | Demo creds are hardcoded in `main.py:DEMO_ACCOUNTS`. No rotation logic. Stable. | [x] Confirmed |
| **A-006** | The auth token format is opaque random bytes; client doesn't try to decode/validate it | If a future slice adds JWT, the client should handle both formats gracefully. We treat the token as opaque — works for both. | [x] Confirmed via [main.py:299](../../../backend/main.py#L299) |
| **A-007** | "Manter conectado" → `localStorage` persistence works with Zustand's `persist` middleware | Should be straightforward; verify in /design. | [ ] /design verifies |
| **A-008** | The Vite dev proxy `/api → http://localhost:8000` works the same way in `mkt-wifi-admin/` as it did in `captive-portal-frontend/` | Identical config; should work. | [ ] /design verifies by running `npm run dev` |
| **A-009** | Playwright iPhone 14 Pro device profile + a 1280×720 desktop profile both work for admin SPA tests | Admin SPA is desktop-first; mobile-responsive is best-effort, NOT a MUST. | [ ] /design picks viewport mix |
| **A-010** | The bundled HTML prototype's visual fidelity (colors, spacing, copy) is the canonical reference; minor pixel-level deviations during port are acceptable | Visual fidelity at "indistinguishable to operator" level, not "pixel-perfect". | [x] Confirmed by samples answer |
| **A-011** | OpenAPI codegen (e.g., `openapi-typescript`) is acceptable as a build-time step but not required this slice | Same as slice 1 (Decision 6) — hand-write types, OpenAPI fixture test catches drift. | [ ] /design picks |

**Note:** A-001/A-002/A-003/A-007/A-008/A-009/A-011 must be resolved during /design. None block /define.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| **Problem** | **3** | Specific, sourced (slice-1 lockdown + R8 + LGPD compliance); two structural pains (no production build + no role isolation) with concrete consequences |
| **Users** | **3** | 5 personas with explicit pain points; spans 3 platform roles + Legal/DPO + future devs |
| **Goals** | **3** | 10 MUSTs, 5 SHOULDs, 2 COULDs; all backed by FR-IDs from summary doc + slice-1 patterns |
| **Success** | **3** | 13 measurable criteria with explicit numbers (9 sections, 3 e2e specs, 0 grep matches, 70% coverage, 150 KB gzipped, 0 errors, 0 console errors, etc.) |
| **Scope** | **3** | 24 explicit out-of-scope items + 11 typed constraints + roadmap of slice dependencies; 14 YAGNI cuts inherited from BRAINSTORM |
| **Total** | **15/15** | Exceeds the 12 minimum; ready for Design |

**Minimum to proceed: 12/15** ✅

---

## Open Questions

These do not block `/design`; each has a sensible default that /design either accepts or overrides.

| # | Question | Owner | Default if unanswered |
|---|----------|-------|-----------------------|
| **OQ-1** | The MikroTik config card in Conexões — is the "Save" button (a) disabled `em breve` (no `PATCH /api/devices/{id}/config` endpoint), (b) enabled but writes to localStorage only (fake save with toast feedback), or (c) cut entirely (read-only display)? | tech-lead | **(a) Disabled `em breve`** with tooltip "Endpoint pendente — slice de configuração de rede". Mirrors the Monetização posture. |
| **OQ-2** | OpenAPI codegen step — adopt `openapi-typescript` now or hand-write types per slice 1's Decision 6? | tech-lead | **Hand-write** (slice-1 default). The 14 admin endpoints are stable; an OpenAPI fixture test (port from slice 1) catches drift. Adopt `openapi-typescript` when the type surface exceeds ~300 LoC. |
| **OQ-3** | Should this slice add a Defense-in-Depth note (similar to slice-1's NFR-005 4-layer enforcement) for the auth-is-client-side gap? | security + tech-lead | **Yes — add a "Security Considerations" section to /design's output explicitly noting the gap, plus a `// TODO(auth-hardening-slice)` comment in `src/api/client.ts` where the missing `Authorization` header check would go.** Documentation, not code. |
| **OQ-4** | Should the slice ship a smoke test that `mkt-wifi-frontend/` legacy folder is truly untouched (i.e., a CI check)? | tech-lead | **Yes — small bash assertion in CI: `git diff --exit-code mkt-wifi-frontend/`.** Catches accidental scope creep. |
| **OQ-5** | Anunciante-role data scope — does it filter campaigns by ownership (e.g., `?owner=me`) or show all campaigns the SPA has access to? Backend has no ownership filter today (the user model doesn't have a campaign-ownership FK). | product + tech-lead | **Show all campaigns this slice; document as an Open Question for Product. The future multi-tenant slice introduces `Campaign.owner_id` and re-scopes Anunciante.** |
| **OQ-6** | Should "em breve" tooltips be a shared `<EmBreveButton>` component or just a `data-testid` + `title` attribute on plain buttons? | tech-lead | **Shared component** — 8 occurrences across 4 sections. Reusable, easier to extend later (e.g., link to the blocking slice's GitHub issue). |
| **OQ-7** | TanStack Query default `staleTime` — what value? | tech-lead | **30 seconds for read endpoints (kpis, demographics, weekly, users, devices, monetization, reports), 0 for `/api/users/live` (real-time-ish), `Infinity` for `/api/notifications/groups` (never changes after seed).** |
| **OQ-8** | Should the Login screen have a "Manter conectado" UX checkbox per FR-003, or default to `localStorage` always (less ceremony)? | product | **Yes — keep the checkbox** (matches prototype FR-003). Adds ~10 LoC; no real cost. |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-04 | define-agent | Initial version. Extracted from `BRAINSTORM_ADMIN_SPA.md` (5 questions, 11 decisions, 14 YAGNI cuts, 2 validations passed). 15/15 clarity. **52 acceptance tests** across cross-cutting + per-role + per-section + LGPD/R13 invariants. **11 assumptions** documented (5 validated, 6 deferred to /design). **8 open questions** with defaults — none blocking. Out-of-scope explicitly extended with 4 new items vs. BRAINSTORM (notably: server-side role enforcement, real JWT, backend modernization, `mkt-wifi-frontend/` legacy folder untouched). |

---

## Next Step

**Ready for:**
```
/design .claude/sdd/features/DEFINE_ADMIN_SPA.md
```

This will produce `.claude/sdd/features/DESIGN_ADMIN_SPA.md` — the implementation plan turning these requirements into:
- File-by-file build order across the 9 sections (~80–100 file manifest)
- Component tree per section + Zustand store schemas + TanStack Query hook signatures
- Test plan implementing AT-001..AT-052
- Resolution of OQ-1..OQ-8
- Validation of A-001/A-002/A-003/A-007/A-008/A-009/A-011 against the existing repo state
- Pre-design repo inspection (slice-1 pattern) to catch any latent contract drift in `mkt-wifi-frontend/` that would carry forward
- A new **Decision** documenting the chosen TanStack Query / Zustand / React Router minor versions
