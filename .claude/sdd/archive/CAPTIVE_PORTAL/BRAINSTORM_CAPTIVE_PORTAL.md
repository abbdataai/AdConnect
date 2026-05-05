# BRAINSTORM: CAPTIVE_PORTAL

> Exploratory session to clarify intent and approach before requirements capture.
> First deliverable slice of the MKT WiFi platform: the end-user captive-portal SPA + a vertical slice of backend stubs that lock the API contract.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CAPTIVE_PORTAL |
| **Date** | 2026-05-03 |
| **Author** | brainstorm-agent (via /workflow:brainstorm) |
| **Status** | ✅ Shipped 2026-05-04 — archived |
| **Source Input** | [../../../notes/summary-requiments.md](../../../notes/summary-requiments.md) (v1.2, confidence 0.98) |

---

## Initial Idea

**Raw Input:** User invoked `/workflow:brainstorm @notes/summary-requiments.md` — a comprehensive 800+ line consolidated requirements document for the entire MKT WiFi multi-tenant SaaS platform. The brainstorm's job was to carve out a deliverable first slice from a platform-sized spec.

**Context Gathered:**
- Repo is **not greenfield**: [backend/main.py](../../../backend/main.py) already exposes 21 FastAPI routes (mostly stubs); [mkt-wifi-frontend/](../../../mkt-wifi-frontend/) contains a single-file Babel-standalone React admin SPA prototype.
- The captive-portal end-user UX is **fully locked** in the spec (FR-020..039) — 5 screens, exact copy, exact timing constants, exact field set — derived from the decoded React source inside [notes/MKT WiFi - Captive Portal _standalone_.html](../../../notes/MKT%20WiFi%20-%20Captive%20Portal%20_standalone_.html).
- LGPD compliance was approved by Legal on 2026-05-03 *conditional on anonymization* (NFR-005): only `first_name + age_band + gender + neighborhood` may be collected at the portal — no phone, email, CPF, last name, or raw MAC.
- Multi-tenancy was confirmed multi-tenant-SaaS by Product Lead on 2026-05-03 (BD-08, TD-08, TD-09); shared-DB row-level isolation via PostgreSQL RLS + `organization_id` on every operator-owned table is the target architecture, **but not yet built**.
- Three highest-priority gaps in the spec: (a) the captive-portal SPA itself, (b) MikroTik POC against real hardware (R2), (c) multi-tenant foundation (R15 cross-tenant leakage). This brainstorm picks (a) as the first slice.

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | NEW `captive-portal-frontend/` (sibling to `mkt-wifi-frontend/`) + NEW `backend/portal_routes.py` + NEW `backend/schemas/portal.py` + NEW `backend/fixtures/portal_fixtures.py` | Production-shaped layout that honors FR-039 ("portal must be a separate React build"). Existing files untouched. |
| Relevant KB Domains | `react`, `pydantic` | Vite + React 18 + TypeScript per Approach A; Pydantic v2 for backend schemas. |
| IaC Patterns | N/A this slice | Deployment infra is out of scope; backend runs via existing [backend/docker-compose.yml](../../../backend/docker-compose.yml), portal runs via `vite dev`. |
| Existing Scaffolding to Avoid Duplicating | [backend/mikrotik_api.py](../../../backend/mikrotik_api.py), [backend/notifications.py](../../../backend/notifications.py), [backend/db.py](../../../backend/db.py) | All untouched — this slice deliberately stubs MikroTik, defers DB persistence, defers notifications. |
| Critical Spec Decision Frozen | Existing `POST /api/connect` (monolithic) is being **split** into `POST /api/connect` (form/lead/consent) + `POST /api/sessions/{id}/ad-complete` (MAC authorize). Per §7.3 of summary doc: prevents "submit-and-close" exploit where users get access without watching the ad. | Backend route signature changes; old monolithic route in `backend/main.py:line ~250` will be deprecated/removed when `portal_routes.py` lands. |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Which slice of the MKT WiFi platform should this brainstorm focus on as the first deliverable increment? | **Captive portal end-user SPA** (chosen over multi-tenant foundation, MikroTik POC, and Auth+Dashboard MVP) | Locks the slice. UX is fully spec'd in the prototype (FR-020..039), so implementation risk is unusually low. |
| 2 | What's the scope boundary for this captive portal slice? | **Vertical slice with mocked backend** — React SPA + FastAPI routes returning Pydantic-validated fixtures. NO MikroTik calls, NO real DB. | Sets the deliverable: a working UI flow + a locked API contract. Persistence and hardware become later wiring. |
| 3 | How should the portal identify which venue/brand/advertiser to display, given multi-tenancy isn't built yet? | **Query param `venue_id`** — backend stub maps to fixture record. Forward-compatible with multi-tenancy: same `venue_id` will resolve transitively to `organization_id` via DB later. | Zero contract rework when multi-tenant foundation lands. The MikroTik captive-portal redirect mechanism naturally appends URL params, so this matches real-world delivery. |
| 4 (sample collection) | What samples or reference assets are available to ground the implementation? | **Only the prototype source already in the repo** (`MKT WiFi - Captive Portal _standalone_.html` + `mkt-wifi-frontend/frontend/`). No real venue/brand fixtures, no real ad video, no real LGPD legal text. | Everything else stubbed inside the codebase: invented "Praça Central" venue fixture, black-frame placeholder ad, Lorem legal text with `# TODO(legal-Q8)` markers. |

**Minimum Questions:** 3 ✅ — exceeded with 4 (3 discovery + 1 sample collection)

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Input files (canonical UX) | [notes/MKT WiFi - Captive Portal _standalone_.html](../../../notes/MKT%20WiFi%20-%20Captive%20Portal%20_standalone_.html) | 1 (decodes to 3 source files: `0e073557-…js` controller + 5 screens, `7567c069-…jsx` DesignCanvas, `81c7033c-…jsx` iOS device frame) | Locked spec — every screen, copy string, timing constant, color, animation. |
| Visual primitives to port (or re-derive) | [mkt-wifi-frontend/frontend/ui.jsx](../../../mkt-wifi-frontend/frontend/ui.jsx), [icons.jsx](../../../mkt-wifi-frontend/frontend/icons.jsx), [styles.css](../../../mkt-wifi-frontend/frontend/styles.css) | ~15 small components | Pill, Button, ChipGroup-equivalent patterns. Subset will be re-implemented in `captive-portal-frontend/src/ui/` to avoid coupling. |
| Output examples (existing API stubs) | [backend/main.py](../../../backend/main.py) | 21 routes | Existing `/api/connect` is monolithic — being **superseded** by the split contract in this slice. |
| Ground truth (verified) | NFR-005 in summary doc + Legal sign-off 2026-05-03 | n/a | LGPD anonymization mandate: only `first_name + age_band + gender + neighborhood`. Locked into Pydantic `Literal` types. |

**How samples will be used:**

- The decoded portal source acts as a *running spec* — every component, copy string, and timing constant in the React SPA will be ported 1:1, with TypeScript types added on top.
- The Pydantic schema in `backend/schemas/portal.py` is the **contract artifact** that downstream slices (DB baseline, multi-tenancy, MikroTik POC) must conform to.
- Stub fixtures live in `backend/fixtures/portal_fixtures.py` — single hardcoded "Praça Central" venue + a single placeholder advertiser ("Café Imperial" / "O sabor que conquista"). Shape matches future DB rows; values invented.

---

## Approaches Explored

### Approach A — Production-shaped Vite + React + TypeScript SPA ⭐ Recommended (SELECTED)

**Description:** New top-level package `captive-portal-frontend/` (Vite + React 18 + TypeScript). State managed by `useReducer` in a single `CaptivePortal` controller, mirroring the prototype's `step ∈ {connecting, form, ad, connected, renew}` state machine. Backend gets `backend/portal_routes.py` (FastAPI router) + `backend/schemas/portal.py` (Pydantic models) + `backend/fixtures/portal_fixtures.py` (single venue + campaign fixture). Routes return Pydantic-validated fixtures from in-memory dicts; mounted at `/api/portal/*` and `/api/sessions/*`. SPA built independently and served as static assets (dev: `vite dev` on `:5173`; backend on `:8000`).

**Pros:**
- Honors FR-039 cleanly — portal is a separate build with its own audience and security profile.
- Vite gives sub-second HMR on mobile-frame dev — critical for tuning the 5-screen flow.
- TypeScript catches Pydantic-shape mismatches at compile time once schemas are exported as types (e.g., via `datamodel-code-generator` or hand-written `types.ts`).
- Sets the migration pattern for the *admin* SPA's eventual move off Babel-standalone (R8) — same recipe transfers.
- Bundle optimization matters: the portal is the most-trafficked surface (every Wi-Fi user) and runs on cellular.
- `portal_routes.py` keeps the new endpoints distinct from the existing 21 admin endpoints — easier to audit security boundaries (portal is unauthenticated; admin requires JWT).

**Cons:**
- ~½ day extra setup (package.json, vite.config.ts, tsconfig.json, ESLint).
- Two build pipelines (existing admin + new portal); CI must be aware of both.
- Some duplication of UI primitives until a shared `ui-kit` package emerges later.

**Why Recommended (and why selected):** This is the only approach that doesn't force a rewrite when the prototype-to-production transition (R8) finally happens. Every other approach trades short-term speed for known future churn — and given the captive portal is the *first* thing every Wi-Fi user sees, the perf/UX ceiling matters.

---

### Approach B — Pragmatic monorepo (new route in existing mkt-wifi-frontend)

**Description:** Add a `/portal` route to the existing `mkt-wifi-frontend/` Babel-standalone React app. Reuse `ui.jsx` primitives, `icons.jsx`, `styles.css`. Backend endpoints added inline to `backend/main.py`.

**Pros:**
- Fastest to first running demo (~2 days saved).
- Zero new tooling to learn.
- Single-page app + single backend = simplest mental model.

**Cons:**
- **Violates FR-039** explicitly.
- Mixes security profiles: admin needs JWT validation; portal is unauthenticated by design.
- Bundle size: portal users download the entire admin SPA's code (campaign modals, dashboard charts, tweaks panel) just to see a registration form.
- Defers R8 (Babel-standalone is prototype-grade) into a future migration that now has to handle two coupled apps instead of one isolated one.

**Rejected because:** The cost of FR-039 violation propagates. Once admin and portal share a bundle, splitting them later means rewriting both build pipelines simultaneously.

---

### Approach C — Prototype-faithful (re-host the existing standalone HTML)

**Description:** Strip the design-canvas chrome from `notes/MKT WiFi - Captive Portal _standalone_.html`, serve as a static FastAPI mount, modify only the form-submit handler to POST to `/api/connect`. Backend stubs return canned responses.

**Pros:**
- Fastest path to runnable demo (~1 day).
- Zero React rebuild work.

**Cons:**
- Single-file Babel-standalone is not a production architecture (R8).
- No module system, no incremental build, no TypeScript, no test harness, no source maps.
- The iOS device frame is a *design-review artifact*, not a deployment artifact.
- "Ship the prototype" antipattern — every change becomes a bundler-manifest hack.
- Will not survive contact with multi-tenant phase — refactoring per-tenant branding into this codebase later is a rewrite.

**Rejected because:** Optimizes for demo velocity at the direct expense of every later phase. Negative-NPV.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A — Production-shaped Vite + React + TypeScript SPA |
| **User Confirmation** | 2026-05-03 (during /workflow:brainstorm session, Validation 1 + Validation 2 both ✅) |
| **Reasoning** | Only approach that honors FR-039 + de-risks R8 + sets the migration pattern for the admin SPA. Pays ~½ day setup cost up front to avoid known rework in every later cycle. |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Slice scope: end-user captive portal SPA (not multi-tenant foundation, MikroTik POC, or Auth+Dashboard) | UX fully spec'd in prototype → low implementation risk. Most user-visible surface. | Multi-tenant foundation (lower visibility); MikroTik POC (hardware-blocked); Auth+Dashboard (lower delta vs existing admin scaffold). |
| 2 | Vertical slice with mocked backend (real Pydantic + real FastAPI routes returning fixtures, no DB, no MikroTik) | Locks the API contract via Pydantic schemas — the most durable artifact. Defers hardware and persistence risk cleanly. | Frontend-only (contract drift risk); full end-to-end with MikroTik (R2 hardware-blocked); SPA + real DB (scope creep). |
| 3 | Tenancy posture: query-param `venue_id` (forward-compatible) | MikroTik captive-portal redirect naturally appends URL params; same `venue_id` resolves to `organization_id` once multi-tenancy lands. Zero contract rework. | Single hardcoded venue (contract churn later); subdomain-based (overkill); minimal Venue+Org tables now (scope creep). |
| 4 | Production-shaped Vite + React + TypeScript SPA in new top-level `captive-portal-frontend/` | Honors FR-039; sub-second HMR; TS catches contract drift; sets the R8 migration pattern. | Babel-standalone in existing SPA (FR-039 violation); re-host prototype HTML (R8 antipattern). |
| 5 | State machine via `useReducer` in single `CaptivePortal` controller (not XState) | Mirrors prototype's `step` variable directly; minimal dependency footprint; no library learning curve for future contributors. | XState (heavyweight for 5 states + 5 transitions); scattered local component state (untraceable transitions). |
| 6 | **Split monolithic `/api/connect` → `/api/connect` + `/api/sessions/{id}/ad-complete`** | Per §7.3 of summary doc: prevents "submit-and-close" exploit. User only gets MAC-authorized after ad completes server-side. Lead persistence happens at form submit; access grant happens at ad completion. | Keep monolithic /api/connect (preserves the exploit). |
| 7 | Pydantic `Literal` types for `AgeBand`, `Gender`, `Neighborhood` | Encodes LGPD anonymization mandate (NFR-005, FR-022/023) at the type-system level. Schema *literally cannot* accept disallowed values. | String fields with runtime regex validation (weaker; allows accidental drift). |
| 8 | `BootstrapResponse.form_config` exposes form fields as data | Future-proofs R13 (admin↔portal form-config divergence): can switch to dynamic Legal-gated forms later without breaking the contract. | Hardcode 4 fields client-side (couples LGPD field policy to client release cadence). |
| 9 | `mac_hash` (not raw MAC) in `ConnectRequest` | Enforces NFR-005 (c) at the API boundary — backend never sees raw MAC. MikroTik adapter computes hash with per-venue salt before submitting. | Send raw MAC + hash server-side (LGPD risk, raw MAC briefly exists in API logs). |
| 10 | Single fixture venue ("Praça Central") + single fixture campaign ("Café Imperial") in this slice | Demonstrates contract; doesn't need 5 venues to prove the shape. | Multiple fixtures (premature; no real values exist). |

---

## Features Removed (YAGNI)

| Feature in Spec | Source | Status This Slice | Reason | Re-add When |
|---|---|---|---|---|
| Animated radar SVG on Step 1 | FR-021 | **Defer (static)** | Static brand logo + 3 sequenced messages preserve the UX intent. Radar animation is polish; doesn't affect timing or flow. | Sprint 2 — visual polish pass |
| Real ad video playback (mp4 / YouTube embed) | FR-029, FR-030 | **Stub (black frame + countdown)** | No real creative available. Countdown timer + mute toggle + advertiser-name overlay still render normally. `videoUrl` field exists in the contract but the player renders a placeholder. | When real campaign creative arrives — also unblocks YouTube vs Upload source switching |
| Notification rule "Expiração de acesso" firing 5 min before expiry | FR-100, R14 | **Defer entirely** | Whole notifications dispatcher is out of scope. Per R14, this rule needs operator-side retargeting anyway since the portal collects no phone. | When notifications dispatcher slice is built |
| Real LGPD legal text page (Termos de uso + Privacidade) | FR-025 | **Stub (Lorem + TODO link)** | Legal hasn't supplied the text. Link renders, click navigates to a placeholder page with `<!-- TODO(legal-Q8) -->` marker. | When Legal delivers approved copy (Q18) |
| Real MikroTik MAC authorize on `/api/sessions/{id}/ad-complete` | FR-038 | **Stub (return success)** | Out of scope per "vertical slice w/ mocked backend". Route still returns realistic response shape (`{expires_at, remaining_seconds: 1800}`); frontend can't tell the difference. | When MikroTik POC slice (R2) lands |
| ConsentRecord persistence to DB | NFR-005 (d) | **Stub (in-memory dict)** | No DB wiring in this slice. ConsentRecord shape is captured in Pydantic and logged, but not persisted. | When DB baseline / Alembic migration slice lands |
| MAC hashing with per-venue salt | NFR-005 (c) | **Stub (echo-back identity)** | Hash function exists as a `# TODO(security-NFR-005c)` marker; for the slice it's identity. Schema field `mac_hash` is preserved. | Same DB baseline slice |
| Browser-notification toggle, theme switcher, density toggle | FR-140..143 | **Out of scope** | Admin-panel features only, never on portal. | n/a |
| LGPD erasure endpoint `DELETE /api/users/{lead_id}` | NFR-005 (d), §8 gap | **Out of scope** | Admin/operator action, not part of end-user portal flow. | When admin "Lead Detail" slice lands |
| Real venue/brand fixture variety | sample answer | **Single fixture only** | One hardcoded fixture in `portal_fixtures.py`: "Praça Central" with placeholder logo, primary color `#0A84FF`. Demonstrates contract. | When 2nd tenant onboards |
| YouTube vs Upload source toggle in ad fetch | FR-029 source variants | **Defer (always Upload-style)** | Bootstrap response says `"source": "Upload"`, `"video_url": null`; player renders stub. YouTube embed paths come later. | When real creative slice lands |
| Mobile bottom-tabs vs drawer (admin nav patterns) | FR-142 | **N/A** | Portal has no nav; single-screen-at-a-time flow. | Never (admin only) |
| Renewal flow with 60s ad (Step 5) | FR-035 | **KEPT (challenged but retained)** | Cuttable in theory, but it's the entire reason the state machine exists (otherwise it's a 4-step linear funnel). Keeping it forces correct architecture. ~30 LoC. | n/a — kept |

**12 features cut/stubbed; 1 challenged-and-retained.** The retained one (renewal flow) justifies the state-machine architecture.

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| **Validation 1 — Architecture concept** (repo layout, Vite+TypeScript, useReducer state machine, runtime topology) | ✅ 2026-05-03 | "Yes — architecture is correct, proceed" | No |
| **Validation 2 — API contract** (4 endpoints, Pydantic schemas with Literal types, split connect/ad-complete, form_config in bootstrap, mac_hash on the boundary) | ✅ 2026-05-03 | "Yes — lock the contract, generate BRAINSTORM doc" | No |

**Minimum Validations:** 2 ✅

---

## Suggested Requirements for /define

### Problem Statement (Draft)

End-users connecting to MKT WiFi-managed Wi-Fi networks have no captive-portal SPA to interact with. The 5-step flow (connecting → form → ad → connected → renew) is fully spec'd and prototyped but not implemented as production code, blocking any real-world venue activation. We need a production-shaped React SPA + a backend API contract (Pydantic-validated FastAPI routes returning fixture data) that locks the integration surface for the multi-tenant foundation, DB baseline, and MikroTik POC slices that will land in subsequent cycles.

### Target Users (Draft)

| User | Pain Point |
|------|------------|
| **End-user (Wi-Fi guest at a managed venue)** | Cannot get internet access — needs a smooth, mobile-friendly, LGPD-compliant flow that grants 30 min of access in exchange for a 30s ad + 4 categorical demographic fields. |
| **Operator (e.g., Praça Central operations team)** | Needs a working portal to demo to advertisers and start collecting leads; cannot wait for the full multi-tenant + MikroTik integration to be ready. |
| **Backend developers (next sprint)** | Need a locked API contract and Pydantic schema to plug real DB persistence + MikroTik authorize calls into without breaking the frontend. |
| **Legal / DPO** | Needs the anonymization mandate (NFR-005) encoded into the type system + a versioned consent ledger to prove compliance. |

### Success Criteria (Draft)

- [ ] All 5 screens (`connecting`, `form`, `ad`, `connected`, `renew`) render and transition correctly per FR-020..039 — verified by manual QA against the prototype HTML side-by-side.
- [ ] All 4 backend endpoints (`GET /api/portal/bootstrap`, `POST /api/connect`, `POST /api/sessions/{id}/ad-complete`, `POST /api/sessions/{id}/renew`) return Pydantic-validated responses matching the schemas in `backend/schemas/portal.py`.
- [ ] FastAPI OpenAPI docs at `/docs` show the 4 portal endpoints with full request/response schemas — usable as the canonical contract artifact for downstream slices.
- [ ] The form rejects any payload containing `phone`, `email`, `cpf`, `last_name`, or raw MAC — verified by Pydantic `extra="forbid"` + integration test.
- [ ] LGPD consent checkbox blocks submission until checked; submission persists `consent_text_version` (string match against the version returned in `/api/portal/bootstrap`).
- [ ] First-session flow grants 30 min after a 30s ad; renewal flow grants +30 min after a 60s ad. Verified end-to-end in the SPA against the mocked backend.
- [ ] Mobile-responsive at iPhone 14 Pro (390 × 844) viewport; all touch targets ≥ 44px.
- [ ] All UI strings in pt-BR, verbatim against the prototype (NFR-004).
- [ ] TypeScript build passes with `strict: true`; FastAPI starts with no Pydantic warnings.

### Constraints Identified

- **Locked UX spec:** Every screen, copy string, color, animation, and timing constant comes from the decoded prototype source. No design freedom in this slice.
- **LGPD anonymization mandate (NFR-005):** Only `first_name + age_band + gender + neighborhood` may be collected. Encoded as Pydantic `Literal` types at the schema level — no runtime drift possible.
- **Forward-compat with multi-tenancy (BD-08, TD-08, TD-09):** Every API response that mentions venue/brand must nest `Organization` + `Venue` + `Branding` objects, even though they're hardcoded fixtures today. When multi-tenant foundation lands, only the route handlers change — the contract is unchanged.
- **Forward-compat with MikroTik (R2):** The `/api/sessions/{id}/ad-complete` route exists *now* even though it currently returns a stub success. When MikroTik POC lands, the route handler grows the real authorize call — no contract change.
- **No DB persistence this slice:** Backend uses in-memory dicts for session state. All persistence-shaped fields exist in the schema but aren't durable. Sessions evaporate on FastAPI restart.
- **Two build pipelines:** `mkt-wifi-frontend/` (existing Babel-standalone) untouched + `captive-portal-frontend/` (new Vite). CI must be aware of both.
- **pt-BR localization:** Every UI string in pt-BR (NFR-004); verbatim port from prototype.
- **Single venue fixture:** Hardcoded "Praça Central" + "Café Imperial" advertiser. Multi-fixture variety is post-MVP.

### Out of Scope (Confirmed)

- ❌ Multi-tenant data isolation / PostgreSQL RLS / `organization_id` FK rollout (separate slice — see roadmap below).
- ❌ Real DB persistence / Alembic migrations / SQLAlchemy session wiring.
- ❌ Real MikroTik RouterOS API calls (port 8728); R2 POC is a separate slice.
- ❌ Real video creative + YouTube Data API integration.
- ❌ Real LGPD legal text content (Termos de uso, Política de Privacidade); placeholder Lorem only.
- ❌ Notifications dispatcher (WhatsApp / Email); R14 retargeting decision deferred.
- ❌ Admin SPA changes — `mkt-wifi-frontend/` is untouched in this slice.
- ❌ Production deployment / hosting target / CDN / wildcard SSL.
- ❌ Audit logging (NFR-015) — admin-side concern.
- ❌ LGPD erasure endpoint (`DELETE /api/users/{lead_id}`) — admin-side concern.
- ❌ Super-admin role (Q23) and advertiser cross-tenant scope (Q24).
- ❌ Animated radar SVG; static placeholder is sufficient for this slice.

---

## API Contract (Locked at Validation 2)

### Endpoint Summary

| Method | Path | Request | Response | This-slice behavior |
|---|---|---|---|---|
| GET | `/api/portal/bootstrap` | query: `venue_id`, `device_id`, `mac_hash` | `BootstrapResponse` | Returns single fixture venue + branding + active campaign + form config |
| POST | `/api/connect` | `ConnectRequest` | `ConnectResponse` | Validates lead + consent; mints `session_id` (UUID); stores in in-memory dict; returns redirect-to-ad |
| POST | `/api/sessions/{session_id}/ad-complete` | (empty body) | `AdCompleteResponse` | Marks session ad-complete; returns `expires_at = now() + 30min`. Stub MikroTik authorize returns success. |
| POST | `/api/sessions/{session_id}/renew` | (empty body) | `RenewResponse` | Returns same campaign with `ad_seconds=60`; pending session id. Subsequent ad-complete extends expiry by another 30 min. |

### Pydantic Schemas (canonical — `backend/schemas/portal.py`)

```python
from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field

# Locked categorical types — encode FR-022/023 + NFR-005 directly into the type system
AgeBand = Literal["18-24", "25-34", "35-50", "50+"]
Gender = Literal["Feminino", "Masculino", "Prefiro não informar"]
Neighborhood = Literal["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste", "Praia"]

# === Bootstrap (GET /api/portal/bootstrap) ===

class Branding(BaseModel):
    logo_url: str
    primary_color: str        # hex "#0A84FF"
    secondary_color: str

class Organization(BaseModel):
    id: UUID
    slug: str                 # "acme"

class Venue(BaseModel):
    id: UUID
    name: str                 # "Praça Central"
    pill_label: str           # "PRAÇA CENTRAL · WI-FI GRATUITO"
    organization: Organization
    branding: Branding
    legal_terms_url: str
    legal_privacy_url: str

class FormField(BaseModel):
    id: Literal["name", "age_band", "gender", "neighborhood"]
    label: str
    type: Literal["text", "chip", "select"]
    required: bool
    options: list[str] | None = None

class FormConfig(BaseModel):
    fields: list[FormField]
    consent_text: str
    consent_text_version: str  # e.g. "2026-05-03-v1"

class CampaignAd(BaseModel):
    id: UUID
    advertiser_name: str
    advertiser_slogan: str
    video_url: str | None      # null in this slice
    source: Literal["YouTube", "Upload"]
    ad_seconds: int            # 30 (first) or 60 (renewal)

class BootstrapResponse(BaseModel):
    venue: Venue
    active_campaign: CampaignAd
    form_config: FormConfig

# === Connect (POST /api/connect) — form submit, NO MAC authorize yet ===

class LeadIn(BaseModel):
    first_name: str = Field(min_length=3, max_length=80)
    age_band: AgeBand
    gender: Gender
    neighborhood: Neighborhood
    # NOTE: NO phone, NO email, NO cpf, NO last_name, NO raw mac.
    # NFR-005 enforced by schema (Pydantic v2 default rejects unknown fields with extra="forbid").

class ConsentIn(BaseModel):
    accepted: bool             # must be True; portal disables submit otherwise
    consent_text_version: str

class ConnectRequest(BaseModel):
    venue_id: UUID
    device_id: UUID
    mac_hash: str              # NEVER raw MAC — NFR-005(c)
    campaign_id: UUID
    lead: LeadIn
    consent: ConsentIn

class ConnectResponse(BaseModel):
    session_id: UUID
    redirect_to_ad: bool = True
    ad_seconds: int = 30

# === Ad-Complete (POST /api/sessions/{session_id}/ad-complete) ===
# Where MAC authorization actually happens (stubbed in this slice).

class AdCompleteResponse(BaseModel):
    expires_at: datetime
    remaining_seconds: int = 1800  # 30 min

# === Renew (POST /api/sessions/{session_id}/renew) ===

class RenewResponse(BaseModel):
    campaign: CampaignAd       # ad_seconds=60
    pending_session_id: UUID
```

---

## Repo + Build Layout

```text
AdConnect/
├── backend/
│   ├── main.py                    # existing — admin endpoints unchanged
│   ├── portal_routes.py           # NEW — captive-portal router, mounted at /api
│   ├── schemas/
│   │   ├── __init__.py            # NEW
│   │   └── portal.py              # NEW — Pydantic models for portal contract
│   ├── fixtures/
│   │   └── portal_fixtures.py     # NEW — single venue/campaign fixture
│   └── ...                        # mikrotik_api.py, db.py, notifications.py UNTOUCHED
├── mkt-wifi-frontend/             # existing admin SPA — UNCHANGED
└── captive-portal-frontend/       # NEW
    ├── package.json               # Vite + React 18 + TypeScript
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                # CaptivePortal controller (state machine via useReducer)
        ├── state/
        │   ├── machine.ts         # state + reducer + transitions
        │   └── api.ts             # typed fetch client
        ├── screens/
        │   ├── ConnectingScreen.tsx
        │   ├── FormScreen.tsx
        │   ├── AdScreen.tsx
        │   ├── ConnectedScreen.tsx
        │   └── RenewScreen.tsx
        ├── ui/
        │   ├── Pill.tsx
        │   ├── ChipGroup.tsx
        │   └── ...
        ├── styles.css
        └── types.ts               # generated/aligned with backend Pydantic
```

---

## State Machine (canonical)

```text
       [ start ]
           │
           ▼
    ┌──────────────┐
    │  connecting  │ ── 3.1s timer ──┐
    └──────────────┘                 │
                                     ▼
                              ┌──────────────┐
                              │     form     │ ── submit /api/connect ──┐
                              └──────────────┘                          │
                                                                        ▼
                                                                 ┌──────────────┐
                                ┌── /api/sessions/{id}/ad-complete ─│      ad      │
                                │                                  └──────────────┘
                                ▼                                          ▲
                         ┌──────────────┐                                  │
                         │   connected  │                                  │ /api/sessions/{id}/renew
                         └──────────────┘                                  │   (adLength=60)
                                │                                          │
                                │ 30 min countdown                         │
                                ▼                                          │
                         ┌──────────────┐                                  │
                         │     renew    │ ── "Assistir e renovar" CTA ─────┘
                         └──────────────┘
```

---

## Roadmap — How This Slice Connects to the Rest of the Spec

| Slice | Depends on This Slice's Contract? | Notes |
|---|---|---|
| **Multi-tenant foundation** (Organization + Venue tables, RLS, tenant-resolution middleware) | ✅ Yes — implements the `venue_id → organization_id` resolution that the portal already assumes | Schema's `BootstrapResponse.venue.organization` becomes a real DB join instead of a fixture. |
| **DB baseline + Alembic migration** | ✅ Yes — replaces in-memory session dict with real `Lead`/`ConsentRecord`/`Session` tables | `LeadIn`, `ConsentIn` shapes become the SQLAlchemy model fields. |
| **MikroTik POC (R2)** | ✅ Yes — `/api/sessions/{id}/ad-complete` route handler grows real `mikrotik_api.authorize_mac(mac_hash, expires_at)` call | Contract unchanged; only the route body changes. |
| **Notifications dispatcher** | Partially — `RenewResponse` already references the renewal flow; "Expiração de acesso" rule retargeting decision (R14) is independent | Decoupled. |
| **Admin SPA "Lead Detail" / LGPD erasure** | ✅ Yes — uses the same `Lead` schema this slice defines | Admin slice consumes the schema; never modifies the portal-facing contract. |
| **Advertiser self-service ("Anunciante" role)** | ❌ No | Independent admin-side feature. |

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 4 (3 discovery + 1 sample collection) |
| Approaches Explored | 3 (A recommended + selected, B and C rejected with reasons) |
| Features Removed (YAGNI) | 12 cut/stubbed; 1 challenged-and-retained |
| Validations Completed | 2 (architecture concept + API contract) — both ✅ |
| Spec Decisions Frozen | 10 (see "Key Decisions Made") |
| Pydantic Schemas Locked | 13 model classes across 4 endpoints |
| Duration | ~Single brainstorm session, 2026-05-03 |
| Quality Gate | All 7 criteria met (≥3 questions, sample collection asked, ≥2 approaches, YAGNI applied, ≥2 validations, user confirmed approach, draft requirements included) |

---

## Next Step

**Ready for:**
```
/define .claude/sdd/features/BRAINSTORM_CAPTIVE_PORTAL.md
```

This will produce `.claude/sdd/features/DEFINE_CAPTIVE_PORTAL.md` — formal requirements with acceptance criteria, edge cases, and the test plan that `/design` and `/build` will execute against.
