# BRAINSTORM: ADMIN_SPA

> Exploratory session for Slice 2 of the MKT WiFi platform: migrate the operator-facing admin SPA off the Babel-standalone HTML prototype onto a production-shaped Vite + React 18 + TypeScript build, applying the LGPD posture and R13 fix that were locked for the captive-portal slice.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | ADMIN_SPA |
| **Date** | 2026-05-04 |
| **Author** | brainstorm-agent (via /workflow:brainstorm) |
| **Status** | ✅ Shipped 2026-05-04 — archived |
| **Source Input** | Conversation request "Option B — Properly develop the administration SPA for Surface 2 — Administration Panel"; consolidated requirements at [notes/summary-requiments.md](../../../notes/summary-requiments.md) v1.2 (0.98 confidence); shipped slice 1 patterns at [.claude/sdd/archive/CAPTIVE_PORTAL/](../archive/CAPTIVE_PORTAL/) |

---

## Initial Idea

**Raw Input:** User invoked `/workflow:brainstorm "Option B — Properly develop the administration SPA for Surface 2 — Administration Panel"` after walking the running platform end-to-end and reaching the "How do I access the admin panel?" question. Today the only way is the bundled HTML prototype at `notes/MKT WiFi - Full App.html` (1.7 MB, Babel-standalone). This slice lifts the prototype onto the same production-shaped recipe the captive-portal slice proved.

**Context Gathered:**
- **Slice 1 shipped 2026-05-04** ([CAPTIVE_PORTAL archive](../archive/CAPTIVE_PORTAL/)). The Vite + React 18 + TypeScript strict + manualChunks recipe is proven.
- **The admin SPA prototype is large**: 2,830 LoC of JSX across 10 files + 1,056 LoC CSS + 425 LoC tweaks-panel. Total ~4,300 LoC of source, ~3× the captive-portal slice's source surface.
- **Backend admin endpoints already live** in [backend/main.py](../../../backend/main.py): `/api/auth/login`, `/api/kpis`, `/api/connections/weekly`, `/api/demographics`, full `/api/campaigns` CRUD, `/api/users`, `/api/users/live`, `/api/devices`, `/api/devices/{id}/refresh`, `/api/notifications/rules` (GET + PATCH), `/api/notifications/groups`, `/api/monetization`, `/api/reports`. **No backend changes required** for this slice.
- **Two latent issues from slice 1 must be cleaned up here:**
  - `mkt-wifi-frontend/frontend/data.jsx:162` still calls the deleted `/api/connection/form` (slice 1's Decision 1 deleted that backend route). Currently silently falls through to mocks. The new admin SPA must rewire or drop this call.
  - The admin Users screen displays `phone`, `email`, `last_name` — these were the LGPD violations the captive portal *removed*. Carrying them into the new admin would create a compliance gap *worse* than current state.
- **Multiple §8 backend gaps** mean some admin features have no working write path: `POST /api/notifications/rules`, `POST /api/users/export`, `POST /api/reports/generate`, `GET /api/reports/{id}/download`, `POST /api/reports/{id}/send`, `PATCH /api/monetization`, `GET/PATCH /api/organization`, `POST /api/auth/sso/*`, `POST /api/auth/forgot`/`/reset`, `DELETE /api/users/{lead_id}`. Read-only or hidden in this slice.

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | NEW `mkt-wifi-admin/` (top-level, sibling to `captive-portal-frontend/`) | Honors the slice-1 pattern. Keeps `mkt-wifi-frontend/` legacy folder untouched as a reference until ship cutover. |
| Relevant KB Domains | `react`, `pydantic` (Pydantic only for Lead-display-shape verification at the boundary; no backend changes) | `react` patterns + the captive-portal recipe carry forward. |
| IaC Impact | None this slice | No new infrastructure; backend already serves both audiences from `:8000`. |
| Critical Backend Decisions Already Locked | Slice 1 deleted `/api/connect` and `/api/connection/form` from `main.py`. Slice 2 must NOT call those endpoints. | `data.jsx:162` is the canonical drift point — must be rewired. |
| LGPD Continuity | Slice 1 locked: portal collects only `first_name + age_band + gender + neighborhood`. Admin must mirror this in display. | Hard-drop PII columns in Users + Lead Detail (Q2 lockdown). |
| Multi-tenancy posture | Not yet built. This slice ships single-tenant admin (one organization, no `organization_id` filter). | Forward-compat: API hooks accept an optional `organizationId` param that's currently always undefined; multi-tenant slice flips it on without rewriting hook signatures. |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | What's the right slice size for the admin SPA migration off Babel-standalone? | **Full port + cleanup pass** — all 9 sections + LGPD/R13 fixes inline. Estimated 14–21 days; reduced to 10–14 by aggressive YAGNI. | Largest scope chosen; YAGNI is now the lever for keeping the slice realistic. |
| 2 | How should the admin "Usuários" screen display lead data, given the portal no longer collects phone/email/last_name? | **Hard-drop PII columns** — match portal posture. UI shows only `first_name + age_band + gender + neighborhood + last_connection + connections_count`. Lead Detail drawer drops the same columns. | LGPD posture mirrored across both surfaces. CSV export, search-by-phone/email, LGPD-erasure button all cut (downstream consequences). |
| 3 | How should the admin "Conexões" section be shaped? | **Read-only fields summary + MikroTik config** — replace the editable form-builder with a read-only card showing the 4 LGPD-locked fields (`Imutável por LGPD` subtitle); keep MikroTik network config editable. | R13 closed. The admin no longer offers false agency over the portal's collected fields. |
| 4 | Which state management + routing approach? | **TanStack Query + Zustand + React Router v6** — server state via TanStack Query, UI state via tiny Zustand stores, real URLs + route guards. | Standard 2026 admin-panel stack. ~6 KB gzipped overhead vs. the rolled-our-own option. Real URLs unlock deep-linking + back-button. |
| 5 (samples) | What samples / reference assets are available? | **Admin HTML prototype + 10 source JSX files** + **captive-portal slice as recipe template**. No screenshots; no Product role-policy table — ship a sensible default and confirm with Product later. | UX is locked by the prototype (visual + copy fidelity). Recipe risk is low because slice 1 proved it. |

**Minimum Questions:** 3 ✅ — exceeded with 5 (4 discovery + 1 sample collection)

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Bundled HTML prototype (canonical UX) | [notes/MKT WiFi - Full App.html](../../../notes/MKT%20WiFi%20-%20Full%20App.html) | 1 (1.7 MB) | Self-extracting bundled React. Decoded equivalent is the 10 JSX files below. |
| Source JSX files (canonical UX detail) | [mkt-wifi-frontend/frontend/](../../../mkt-wifi-frontend/frontend/) + [tweaks-panel.jsx](../../../mkt-wifi-frontend/tweaks-panel.jsx) | 10 + 1 = 11 files, 2,830 LoC | `app.jsx`, `login.jsx`, `shell.jsx`, `sections1.jsx` (Dashboard + Campanhas), `sections2.jsx` (Usuários + WiFi + Conexões + Notificações), `sections3.jsx` (Monetização + Reports + Config + modals), `data.jsx`, `ui.jsx`, `icons.jsx`, plus `tweaks-panel.jsx`. |
| Styles | [styles.css](../../../mkt-wifi-frontend/frontend/styles.css) | 1,056 LoC | CSS variables + flat class names. Port subset; rewrite for new component structure. |
| Captive-portal slice (recipe template) | [captive-portal-frontend/](../../../captive-portal-frontend/) + [archive/CAPTIVE_PORTAL/](../archive/CAPTIVE_PORTAL/) | Full SDD set | Reuse: vite.config.ts pattern, tsconfig.json, retry helper (Decision 11), AT-015 grep, strings.ts pattern, Vite manualChunks pattern. |
| Backend OpenAPI spec | http://localhost:8000/openapi.json (live) | 1 | Authoritative source for response shapes the admin SPA must consume. Captive-portal endpoints + admin endpoints all in one document. |
| Slice 1 lessons learned | [SHIPPED_2026-05-04.md](../archive/CAPTIVE_PORTAL/SHIPPED_2026-05-04.md) §Lessons Learned | 4 categories | Especially the "DESIGN's Error Handling table needs Code Patterns alongside" lesson (added in v1.1 iterate) — apply to this slice's DESIGN. |

**How samples will be used:**
- The bundled HTML prototype + 10 JSX files act as a **running visual spec**. Every screen, copy string, and component is implemented in the prototype — port 1:1 with TypeScript types added on top.
- The captive-portal slice's pattern (frozen `strings.ts`, useReducer-or-equivalent for local state, AT-015 grep guard) carries forward directly.
- The OpenAPI spec is the **contract source** that TanStack Query hooks bind to — no hand-typed response shapes for endpoints that already exist.

---

## Approaches Explored

### Approach A — Big-bang migration with disciplined YAGNI ⭐ Recommended (SELECTED)

**Description:** Create new top-level package `mkt-wifi-admin/` (sibling to `captive-portal-frontend/`) using the captive portal's exact recipe at scale — Vite + React 18 + TypeScript strict, with TanStack Query + Zustand + React Router v6 for the state-management layer locked in Q4. Port login + shell + 9 sections in one slice, applying the LGPD cleanup (hard-drop PII columns from Users) and R13 fix (read-only Conexões) inline. Cut 14 features under YAGNI (see "Features Removed" below). When the slice ships, the prototype HTML stays accessible by `file://` URL as a reference, but the new SPA becomes the operator's entry point.

**Pros:**
- Matches the captive-portal slice's proven migration recipe at scale — low recipe risk.
- Single cutover; no dual-maintenance window.
- Locked architectural decisions get applied uniformly across all 9 sections — no inconsistency between "early" and "late" sections.
- LGPD cleanup happens once, in one slice, instead of being scattered across multiple migrations.
- Bundle optimization works at full surface from day 1 (manualChunks for Reports + Configurações + Notificações).
- Reuses the captive-portal slice's `vitest` + `playwright` test pattern — no new test infra to invent.

**Cons:**
- Long-running branch; integration risk concentrates at the end of the slice.
- 10–14 day estimate is fragile — if any one section blows up, the whole slice slips.
- Requires discipline on YAGNI cuts; otherwise scope creeps to 14–21 days.

**Why Recommended (and selected):** This is the only approach that delivers the user's locked Q1 scope ("Full port + cleanup") in one slice. The captive portal proved the migration recipe; this just applies it at 2× scale.

---

### Approach B — Dual-mount conservative migration

**Description:** New SPA at `mkt-wifi-admin/` running at `:5174`, prototype HTML stays accessible. Migrate sections one at a time, each as a small PR. Once all 9 sections are ported, swap default and retire the prototype.

**Pros:**
- Small PRs, easy review and rollback per section.
- Lower integration risk per merge.

**Cons:**
- Dual-maintenance during the multi-week migration: bug fixes have to be replicated.
- Operators bounce between two stylistically different admin UIs.
- LGPD cleanup applied unevenly during migration — still-prototype sections show PII while migrated sections don't, which is *worse* than current state.
- Total wall-clock is longer (~21+ days) due to dual-maintenance overhead.

**Rejected because:** The prototype is dev-only HTML with no production users to protect, so dual-maintenance has no benefit. The interim compliance gap is a real regression vs. current state.

---

### Approach C — Foundation-only slice, defer 8 sections to follow-ups

**Description:** Drop back to a smaller scope — login + shell + Dashboard only. Each subsequent section becomes its own brainstorm cycle.

**Pros:**
- Smallest first deliverable (~700–1000 LoC).
- Each section gets its own design treatment.

**Cons:**
- Contradicts the user's locked Q1 answer ("Full port + cleanup").
- 9 separate brainstorm + define + design + build + ship cycles is significant workflow overhead.
- LGPD cleanup gets fragmented across 9 slices instead of done once.
- The prototype HTML has to coexist with the new SPA for months.

**Rejected because:** The user explicitly chose the largest scope in Q1; this would walk that back.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A — Big-bang migration with disciplined YAGNI |
| **User Confirmation** | 2026-05-04 (during /workflow:brainstorm session, Validation 1 + Validation 2 both ✅) |
| **Reasoning** | Only approach that delivers the locked Q1 scope ("Full port + cleanup") in one slice. Captive portal proved the recipe; this applies it at 2× scale with disciplined YAGNI to keep the timeline realistic. |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Slice scope: full port + cleanup pass (all 9 sections + LGPD fix + R13 fix in one cycle) | Avoids fragmenting compliance work across multiple slices; single cutover from prototype HTML. | Foundation-only (contradicts Q1); section-by-section (workflow overhead); LGPD-deferred (compliance regression). |
| 2 | LGPD posture for admin Users: hard-drop `phone`/`email`/`last_name` columns | Mirrors the portal posture (Q2). Cleanest, most defensible at audit. New leads have nothing to display; legacy leads' PII is hidden by the UI even if still in DB. | Mask legacy PII (introduces masking logic + 'legacy lead' UI distinction); defer to follow-up (compliance regression). |
| 3 | R13 fix: Conexões becomes read-only fields summary + MikroTik config | Closes the admin↔portal divergence flagged in summary doc. Communicates the LGPD constraint without false agency. | Editable builder with Legal/DPO gating (workflow system not built); remove form card entirely (loses educational signal). |
| 4 | State management: TanStack Query (server) + Zustand (UI) + React Router v6 (URLs + role guards) | Industry-standard 2026 admin-panel stack. ~6 KB gzipped overhead. Real URLs enable deep-linking + back button. Zustand is tiny (~3 KB) and minimizes Context boilerplate. | Plain Context (more boilerplate); lift-everything-to-App (re-implements caching/refetch by hand at 9-section scale); Redux Toolkit (~25 KB, overkill). |
| 5 | New top-level package `mkt-wifi-admin/` (not evolved-in-place in `mkt-wifi-frontend/`) | Mirrors the captive-portal slice's pattern. Keeps legacy folder untouched as a reference until ship cutover. | Evolve in place (mixes legacy JSX with new TS code; harder to delete prototype later). |
| 6 | Strict TypeScript from day 1 (`strict: true` + `noUnusedLocals` + `noUnusedParameters`) | Same recipe slice 1 used. Catches contract drift between hand-written types and OpenAPI. | Progressive TS adoption (perpetual half-typed state). |
| 7 | Default role policy: Administrador (all), Anunciante (Dashboard + own Campanhas + own Relatórios), Visualizador (read-only Dashboard + Relatórios + read on most sections) | Sensible default that covers the prototype's labeled behavior; Product can override during /design. | Admin-only (loses the role-distinction the summary doc identified as BD-03); aggressive Anunciante (Campanhas-only, loses overview UX). |
| 8 | Single-tenant for this slice (no `organization_id` filter) | Multi-tenant foundation is a separate slice. API hooks accept optional `organizationId` param that's currently undefined; multi-tenant slice flips it on without rewriting hook signatures. | Multi-tenant from day 1 (blocks on a 1–2 week prerequisite slice). |
| 9 | Backend untouched in this slice | All required endpoints exist in `main.py`; this slice is purely a frontend rewrite. | Bundle backend modernization (legacy `class Config:` → `model_config = ConfigDict(...)`) into this slice — that's a separate /iterate, not part of admin SPA migration. |
| 10 | Read-only "disabled-write" sections for Reports + Monetização + Configurações | Backend gaps prevent writes; UI shows the read view + disabled "em breve" CTAs to preserve the visual UX. When backends ship, buttons un-disable with no UI rework. | Hide entire sections (loses 3 sidebar items operators expect to see); ship fake writes to localStorage (worthless). |
| 11 | Cut tweaks-panel (425 LoC, 15% of slice complexity) | FR-140..143 are P2/P3; summary doc explicitly says "ship-or-strip TBD"; zero operator value (it's design-tools). Single biggest YAGNI cut. | Keep full tweaks-panel (~2–3 days extra); keep theme-switcher only (still complex without other tweaks for context). |

---

## Features Removed (YAGNI Pass)

| Feature in Spec | Source | Status This Slice | Reason | Re-add When |
|---|---|---|---|---|
| **Tweaks panel** (theme switcher, density toggle, mobile-nav switcher, accent color picker) | `tweaks-panel.jsx` (425 LoC, FR-140..143 P2/P3) | **Cut entirely** | Design-tools, not operator value. Summary doc explicitly notes "ship-or-strip TBD." Largest single YAGNI cut. | Future slice with product-confirmed runtime-customization demand. |
| SSO Google + Microsoft login buttons | login.jsx:174-181, FR-006 P2 | **Hidden** | Backend has no SSO endpoints (per §8 gaps). | When real SSO slice ships. |
| "Esqueci minha senha" tab on Login | login.jsx:197-228, FR-005 P1 | **Hidden** | Backend has no `/api/auth/forgot` + `/api/auth/reset`. | When auth-recovery slice ships. |
| "Nova regra" notification creation flow | s2:328, FR-104 P2 | **Button hidden** | Backend has no `POST /api/notifications/rules`. | When notifications-CRUD slice ships. |
| CSV export from Users | s2:29, FR-074 P1 | **Button hidden** | Backend has no `/api/users/export`. | When export slice ships. |
| Reports actions (Gerar / Baixar / Enviar) | s3.ReportsSection FR-110-113 | **List view only; action buttons hidden** | Backend has no `POST /api/reports/generate` / `GET /api/reports/{id}/download` / `POST /api/reports/{id}/send`. | When reports-pipeline slice ships. |
| LGPD deletion-on-request from Lead Detail | NFR-005(d), §8 gap | **Cut from Lead Detail drawer** | Backend has no `DELETE /api/users/{lead_id}`. | When LGPD-erasure slice ships. |
| Configurações: Empresa + Integrações editing | s3.ConfigSection FR-130-131 | **Read-only display** | Without multi-tenant + per-tenant integration storage, edits would write to localStorage. | When multi-tenant foundation + per-tenant integrations slices ship. |
| Phone/Email/Last_name in Users + Lead Detail | s2.UsersSection FR-070 | **Hard-dropped** | Locked in Q2 — LGPD posture. | Never (permanent policy). |
| Editable form-builder in Conexões | s2.ConnectionsSection FR-090 | **Read-only summary** | R13 fix locked in Q3. | Never in editable form unless Legal/DPO process is built. |
| Default rule "Expiração de acesso" targeting end-user phone | data.jsx FR-101, R14 | **Retargeted to operator group** | Portal collects no phone — rule must target operators. | Permanent retarget. |
| Browser-notifications toggle | s3:200-211 FR-132 P2 | **Cut** | Browser Notifications API is per-device; no clear product win. | If future operator demand surfaces. |
| Search-by-phone-or-email on Users | s2:8-12 FR-071 | **Search by name only** | Phone/email no longer in display per Q2; searching by hidden columns is misleading. | Never (consequence of permanent LGPD policy). |
| Monetização "Salvar modelo" mutation | s3.MonetizationSection FR-122 | **Disabled with "em breve" tooltip** | Backend has no `PATCH /api/monetization`. | When monetization-write slice ships. |

**14 cuts/reductions.** The slice still ships all 9 section *pages* — but each section's interactive scope is bounded by what the backend can actually serve, plus the LGPD posture.

---

## Section-by-Section Scope (after YAGNI)

| # | Section | Ships | Cut/Disabled | Notes |
|---|---|---|---|---|
| 1 | **Login** | Email + password, "Manter conectado", `mailto:` "Solicitar acesso", 401 message | SSO buttons, "Esqueci minha senha" tab | — |
| 2 | **Shell** (sidebar + topbar) | 9-item nav, role labels, sidebar badges, topbar live-count, user dropdown (Meu perfil, Sair), Zustand toast container | Tweaks panel, "Preferências" sub-page | — |
| 3 | **Dashboard** | 4 hero KPIs, conexões-por-dia chart (7d/30d), demographics by age-band+gender, top-4 active campaigns, top-5 live users (no PII) | phone/email in live-users list | — |
| 4 | **Campanhas** ⭐ | Cards/Tabela toggle, status filter tabs, aggregate KPIs, campaign cards, full CRUD modals (Nova/Editar/Pausar/Reativar/Duplicar), toast feedback | (none) | **Reference implementation — backend supports full CRUD.** Use its TanStack Query hooks as the pattern for all other sections. |
| 5 | **Usuários** | Lead list (`first_name + age_band + gender + neighborhood + last_connection + connections_count`), search by name only, filter by Zona, aggregate KPIs, Lead Detail drawer | phone/email/last_name columns + search-by-phone/email + CSV export + LGPD-erasure button | LGPD-clean (Q2). |
| 6 | **Wi-Fi Online** | Aggregate KPIs, per-device cards online+offline, CPU/RAM/Mb-s, manual "Atualizar" button, sidebar badge | (none) | Backend supports the only mutation. |
| 7 | **Conexões** | Read-only card listing the 4 LGPD-locked portal fields ("Imutável por LGPD"), MikroTik config card (IP, port, user, password masked, session minutes — editable) | Editable form-builder | R13 fix (Q3). |
| 8 | **Notificações** | Rules list with toggle, groups read-only, "Expiração de acesso" rule retargeted to operator group | "Nova regra" button + rule deletion | R14 retarget. |
| 9 | **Relatórios** | List of reports (name/date/type/size) | "Gerar relatório" button + "Baixar" / "Enviar" actions | Read-only, list-only this slice. |
| 10 | **Monetização** | 4 plan cards with pricing, currently-selected plan highlighted | "Salvar modelo" disabled with "em breve" | Read-only, disabled-write. |
| 11 | **Configurações** | Read-only Empresa card (Razão social/CNPJ/contact-email) + read-only Integrações card with status badges (4 connectors) | Empresa form editing + Integrações editing + Preferências | Read-only this slice. |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| **Validation 1 — Architecture concept** (repo layout + Zustand stores + TanStack Query hooks + React Router with RoleGuard + default role-policy table) | ✅ 2026-05-04 | "Yes — architecture and role-gating policy look right" | No |
| **Validation 2 — Section-by-section scope** (11 rows of ships/cut/disabled per section after YAGNI) | ✅ 2026-05-04 | "Yes — lock the section scope and generate the doc" | No |

**Minimum Validations:** 2 ✅

---

## Suggested Requirements for /define

### Problem Statement (Draft)

The MKT WiFi platform's operator-facing admin panel ships today only as a 1.7 MB Babel-standalone HTML prototype (`notes/MKT WiFi - Full App.html`) with no production build pipeline — operators can't be onboarded against an unproduced asset, R8 in the summary doc remains unresolved, and the prototype's `data.jsx` still references the deleted `/api/connection/form` endpoint that slice 1 removed for LGPD compliance. Compounding this, the prototype's UI displays `phone`/`email`/`last_name` columns for leads — fields the captive-portal slice explicitly removed from collection per Legal's anonymization mandate — creating a compliance regression that grows the longer the prototype remains the canonical admin surface. We need to migrate the admin SPA onto the same production-shaped Vite + React 18 + TypeScript recipe slice 1 proved, while applying the LGPD cleanup and R13 fix in the same cycle so both surfaces ship policy-consistent.

### Target Users (Draft)

| User | Role | Pain Point |
|------|------|------------|
| **Administrador** (operator owner) | Full CRUD on campaigns, devices, leads, monetization, settings | Today, can only access via opening a 1.7 MB HTML file by `file://` URL — not realistic for production onboarding. |
| **Anunciante** (advertiser self-service) | Sees own campaigns + KPIs + reports | Has no operator-facing entry point at all today; depends on commercial-team handoff. |
| **Visualizador** (read-only stakeholder) | Reads dashboards + reports | Same — no production-grade entry point. |
| **Operator's Legal/DPO contact** | Owns LGPD compliance posture | Sees the prototype displaying phone/email/last_name and flags it as a regression vs. the just-shipped portal slice. |
| **Future backend developers** (multi-tenant + reports + LGPD-erasure slices) | Plug new endpoints into a working frontend | Need a production admin SPA whose hooks they can extend, not a Babel-standalone prototype. |

### Success Criteria (Draft)

- [ ] All **9 admin sections** render and behave per the section-scope table above — verified by manual QA against the prototype HTML side-by-side.
- [ ] Login + role-gating works: 3 demo accounts (`admin/anunciante/viewer`) each see exactly the routes their role policy permits — verified by Playwright e2e per role.
- [ ] **0 references to `/api/connection/form` in the new SPA** — verified by `grep -r 'connection/form' mkt-wifi-admin/src`.
- [ ] **0 references to `phone | email | last_name` as field identifiers in `mkt-wifi-admin/src/`** — verified by extending the existing AT-015 grep script to cover the new directory.
- [ ] TypeScript build `tsc --noEmit` exits with **0 errors / 0 warnings** under `strict: true`.
- [ ] Initial JS bundle ≤ **150 KB gzipped** (admin is 3× the captive portal's surface; budget scales accordingly — captive portal was 47 KB).
- [ ] Vitest unit test coverage ≥ **70%** on TanStack Query hook factories + Zustand store reducers.
- [ ] At least **3 Playwright e2e specs**: full login + sidebar role-gating per role + happy-path Campanhas CRUD.
- [ ] All UI strings in pt-BR (NFR-004), verbatim against prototype.
- [ ] Every "em breve"/disabled CTA has a tooltip pointing to its blocking backend slice.

### Constraints Identified

- **LGPD posture inherited from slice 1** — hard-drop PII columns; non-negotiable.
- **R13 fix inherited** — Conexões is read-only summary + MikroTik editable.
- **No backend changes in this slice** — every endpoint must already exist in `main.py`; backend gaps surface as `em breve`/disabled UI.
- **Single-tenant** — no `organization_id` filter; multi-tenant slice ships separately.
- **Two build pipelines** — `captive-portal-frontend/` + `mkt-wifi-admin/`. CI must be aware of both.
- **Bundle budget scales with surface area** — 150 KB gzipped is the COULD goal (vs. 100 KB for captive portal).
- **`mkt-wifi-frontend/` legacy folder stays untouched** — kept as a reference until ship cutover.
- **Backend-restart resilience** — admin sessions are JWT-style tokens with 7-day TTL (already implemented in `main.py`); independent of in-memory state.

### Out of Scope (Confirmed)

- ❌ Multi-tenant data isolation / `organization_id` filtering / RLS — multi-tenant slice
- ❌ Real DB persistence migrations / Alembic baseline — DB-baseline slice
- ❌ MikroTik POC against real hardware — R2 POC slice
- ❌ Real video creative for ad uploads — real-creative slice
- ❌ Real LGPD legal text content — Legal-supplied
- ❌ Notifications dispatcher / WhatsApp + email send — notifications-write slice
- ❌ Reports generation pipeline — reports-pipeline slice
- ❌ LGPD erasure (`DELETE /api/users/{lead_id}`) — LGPD-erasure slice
- ❌ SSO Google / Microsoft — SSO slice
- ❌ "Esqueci minha senha" / password reset — auth-recovery slice
- ❌ Tweaks panel (theme/density/mobile-nav/accent picker) — design-tools slice (low priority)
- ❌ Browser-notifications toggle — UI-prefs slice (low priority)
- ❌ Audit log viewer — audit-pipeline slice
- ❌ Empresa + Integrações editing in Configurações — multi-tenant + per-tenant integrations slices
- ❌ Per-tenant configurability of monetization plan / pricing — multi-tenant slice

---

## Roadmap — How This Slice Connects to the Rest of the Platform

| Slice | Relationship | Notes |
|---|---|---|
| **Slice 1: Captive Portal** (shipped 2026-05-04) | Sets the recipe + LGPD posture this slice mirrors | Lessons learned from slice 1 (especially the v1.1 retry-helper iterate) propagate as patterns. |
| **Multi-tenant foundation** (next-priority gap) | Hooks accept optional `organizationId` — flipping it on doesn't break the admin SPA | This slice unblocks multi-tenant by giving it a real consumer. |
| **DB-baseline + Alembic migration** | Replaces in-memory portal sessions with real `Lead`/`Session` tables; admin Users screen reads from DB | Admin SPA's `useUsers()` hook signature is unchanged. |
| **Notifications dispatcher / write side** | Unlocks "Nova regra" button + rule deletion in this slice's Notificações section | One follow-up `/iterate` to enable the disabled CTAs. |
| **Reports pipeline** | Unlocks Gerar/Baixar/Enviar in Relatórios | One follow-up `/iterate`. |
| **LGPD erasure (`DELETE /api/users/{lead_id}`)** | Unlocks the deletion button in Lead Detail (was cut here) | One follow-up `/iterate`. |
| **Monetization-write (`PATCH /api/monetization`)** | Unlocks "Salvar modelo" in Monetização | One follow-up `/iterate`. |
| **MikroTik POC (R2)** | Unrelated to admin SPA except via the shared backend | Independent. |

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 5 (4 discovery + 1 sample collection) |
| Approaches Explored | 3 (A selected, B + C rejected with reasons) |
| Features Removed (YAGNI) | 14 cuts/reductions across login, shell, sections 5/7/8/9/10/11, plus tweaks-panel and browser-notifications |
| Validations Completed | 2 (architecture + section scope) — both ✅ |
| Spec Decisions Frozen | 11 (see "Key Decisions Made") |
| Estimated Slice Size | ~3,500–4,000 LoC + tests; 10–14 days with disciplined YAGNI |
| Quality Gate | All 7 criteria met (≥3 questions ✅; sample collection asked ✅; ≥2 approaches ✅; YAGNI applied ✅; ≥2 validations ✅; user confirmed approach ✅; draft requirements included ✅) |

---

## Next Step

**Ready for:**
```
/define .claude/sdd/features/BRAINSTORM_ADMIN_SPA.md
```

This will produce `.claude/sdd/features/DEFINE_ADMIN_SPA.md` — formal requirements with acceptance criteria for each of the 11 section rows, edge cases (role-gating violations, route-guard redirects, "em breve" tooltip behavior), the test plan (per-role e2e + per-section unit tests), explicit assumptions to validate during /design (TanStack Query v5 vs. v4 — which version installed; React Router v6 vs. v7; Zustand v4 vs. v5), and the canonical AT-015-equivalent grep test extended to the new admin source tree.
