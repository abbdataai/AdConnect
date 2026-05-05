# DEFINE: CAPTIVE_PORTAL

> Build the production-shaped end-user captive-portal SPA (5-screen flow) and the four backend stub endpoints whose Pydantic contract becomes the integration surface for every later slice (multi-tenancy, DB baseline, MikroTik POC).

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | CAPTIVE_PORTAL |
| **Date** | 2026-05-03 |
| **Author** | define-agent (via /workflow:define) |
| **Status** | ✅ Shipped 2026-05-04 — archived |
| **Clarity Score** | 15/15 |
| **Source Input** | [BRAINSTORM_CAPTIVE_PORTAL.md](BRAINSTORM_CAPTIVE_PORTAL.md) — pre-validated, approaches evaluated, YAGNI applied, API contract locked |

---

## Problem Statement

End-users connecting to MKT WiFi-managed Wi-Fi networks have no captive-portal SPA to interact with — the 5-step flow (`connecting → form → ad → connected → renew`) is fully spec'd in [notes/MKT WiFi - Captive Portal _standalone_.html](../../../notes/MKT%20WiFi%20-%20Captive%20Portal%20_standalone_.html) and prototyped, but not implemented as production code, blocking any real-world venue activation. Compounding this, no Pydantic-validated API contract exists yet for portal traffic: every later slice (multi-tenancy, DB baseline, MikroTik POC) needs a fixed integration surface to plug into, and absent that surface, those slices either stall or proliferate inconsistent ad-hoc shapes.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| **End-user (Wi-Fi guest at a managed venue)** | Consumer of free Wi-Fi at cafés, lojas, eventos, praças, hotéis | Cannot get internet access — needs a smooth, mobile-friendly, LGPD-compliant flow that grants 30 min of access in exchange for a 30s ad + 4 categorical demographic fields. Mobile cellular fallback means the portal must be fast and not bloated. |
| **Operator (e.g., Praça Central operations team)** | Owns/manages a Wi-Fi venue | Needs a working portal to demo to advertisers and start collecting leads; cannot wait for the full multi-tenant + MikroTik integration to be ready. Wants to see the locked UX render with their venue's branding. |
| **Backend developer (next sprint)** | Implementing multi-tenant foundation, DB baseline, MikroTik POC | Needs a locked API contract and Pydantic schema to plug real DB persistence + MikroTik authorize calls into without breaking the frontend or rebuilding response shapes. |
| **Legal / DPO** | Owns LGPD compliance posture | Needs the anonymization mandate (NFR-005) encoded into the type system + a versioned consent ledger to prove compliance at audit time. |

---

## Goals

What success looks like (prioritized):

| Priority | Goal |
|----------|------|
| **MUST** | Implement the 5-screen captive-portal SPA in `captive-portal-frontend/` honoring FR-020..039 verbatim (every screen, copy string, color, animation, timing constant) |
| **MUST** | Lock the API contract: 4 Pydantic-validated FastAPI endpoints (`GET /api/portal/bootstrap`, `POST /api/connect`, `POST /api/sessions/{id}/ad-complete`, `POST /api/sessions/{id}/renew`) returning fixture data |
| **MUST** | Encode the LGPD anonymization mandate (NFR-005) at the type-system level via Pydantic `Literal` types — schema must reject `phone`, `email`, `cpf`, `last_name`, raw `mac_address` |
| **MUST** | Ship the production-shaped Vite + React 18 + TypeScript build (per Approach A in BRAINSTORM) — sets the migration pattern for the admin SPA's eventual move off Babel-standalone (R8) |
| **MUST** | Mobile-responsive at iPhone 14 Pro (390 × 844) viewport with touch targets ≥ 44 px |
| **MUST** | All UI strings in pt-BR (NFR-004), verbatim port from prototype |
| **SHOULD** | TypeScript build passes with `strict: true`; FastAPI starts with no Pydantic warnings |
| **SHOULD** | FastAPI OpenAPI docs at `/docs` show the 4 portal endpoints with full request/response schemas — usable as the canonical contract artifact for downstream slices |
| **SHOULD** | Forward-compat with multi-tenancy (BD-08, TD-08, TD-09): every API response nests `Organization` + `Venue` + `Branding` so the contract is stable when RLS lands |
| **SHOULD** | Forward-compat with MikroTik (R2): the `ad-complete` route exists with the realistic response shape (`{expires_at, remaining_seconds: 1800}`) so when real authorize-MAC lands, only the route body changes |
| **COULD** | Initial JS bundle ≤ 100 KB gzipped (portal is mobile-cellular-first; budget aligns with NFR-009) |
| **COULD** | Pytest coverage ≥ 80 % on `backend/portal_routes.py` and `backend/schemas/portal.py` |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

Measurable outcomes (numeric and testable):

- [ ] All **5 screens** (`connecting`, `form`, `ad`, `connected`, `renew`) render and transition correctly per FR-020..039 — verified by side-by-side manual QA against the prototype HTML
- [ ] All **4 backend endpoints** return Pydantic-validated responses matching the schemas in `backend/schemas/portal.py` — verified by integration tests
- [ ] FastAPI OpenAPI docs at `/docs` enumerate the 4 portal endpoints with **100 %** of request/response schemas exposed (no `Any`, no missing models)
- [ ] The form rejects payloads containing **any** of the 5 forbidden fields (`phone`, `email`, `cpf`, `last_name`, raw MAC) — verified by `pytest` parameterized over each field, expecting HTTP **422** with Pydantic `extra="forbid"` violation
- [ ] LGPD consent checkbox blocks submission until checked — verified by Playwright/Cypress: submit button is disabled when `consent.accepted=false`; `POST /api/connect` is **never** called
- [ ] `consent_text_version` round-trip: the version returned in `BootstrapResponse.form_config.consent_text_version` is byte-identical to the version persisted with the lead record (string equality assert)
- [ ] First-session flow: 30 s ad → `expires_at = now() + 1800 s` (±2 s tolerance for clock drift)
- [ ] Renewal flow: 60 s ad → `expires_at` extended by 1800 s (±2 s tolerance)
- [ ] Mobile-responsive at iPhone 14 Pro (**390 × 844**) viewport — no horizontal scroll, all touch targets **≥ 44 px** (verified via Chrome DevTools device toolbar + automated audit)
- [ ] All UI strings in **pt-BR** verbatim against prototype (NFR-004) — verified by string-diff between captured DOM text and a snapshot extracted from the decoded `0e073557-…js` source
- [ ] TypeScript build `tsc --noEmit` exits with **0** errors and **0** warnings under `strict: true`
- [ ] FastAPI startup with `--strict` produces **0** Pydantic warnings
- [ ] Backend endpoints respond with **p95 < 50 ms** under fixture-only load (no DB/network) — verified locally with `wrk` or `hey` (proxy for "the contract is fast enough that real DB latency dominates later")
- [ ] No `phone | email | cpf | mac_address` strings appear in **any** code path under `backend/portal_routes.py` or `captive-portal-frontend/src/**` — verified by `grep -rn` lint check in CI

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| **AT-001** | Happy-path first session (full 5-screen flow) | User opens `/portal?venue_id=praca_central&device_id=mt-001&mac_hash=ab12cd34` | User waits 3.1 s on connecting, fills form (`first_name="Maria"`, `age_band="25-34"`, `gender="Feminino"`, `neighborhood="Centro"`), checks consent, clicks "Continuar →", watches 30 s ad, lands on connected screen | Connecting shows 3 sequenced messages, form accepts input, ad plays non-skippable for 30 s, connected screen shows "Aproveite, Maria!" with circular SVG countdown starting at 30:00 |
| **AT-002** | Renewal flow loops back to ad with 60 s | User has reached the renew screen after 30-min countdown expired | User clicks "Assistir e renovar" | AdScreen plays 60 s (not 30); on completion, ConnectedScreen resets countdown to 30:00; new `expires_at = now() + 1800 s` |
| **AT-003** | LGPD anonymization — backend rejects forbidden field | Backend route `POST /api/connect` is reachable | Client sends `{ lead: { first_name: "X", age_band: "25-34", gender: "Feminino", neighborhood: "Centro", phone: "+5511999990000" } }` | Pydantic returns **422 Unprocessable Entity** with error referencing `extra fields not permitted: phone`. No row is persisted in the in-memory session dict. |
| **AT-004** | Consent gate disables submit | User on FormScreen with all 4 fields validly filled | User does not check the consent checkbox | "Continuar →" button is rendered in disabled style (`T.surface2` / muted text per portal:229-239); clicking it does not fire `POST /api/connect`; no network request is observed in DevTools |
| **AT-005** | Bootstrap fixture shape | `GET /api/portal/bootstrap?venue_id=praca_central&device_id=mt-001&mac_hash=ab12cd34` | Backend handler runs against the single fixture in `portal_fixtures.py` | Returns 200 with `BootstrapResponse` JSON: `venue.name="Praça Central"`, `venue.pill_label="PRAÇA CENTRAL · WI-FI GRATUITO"`, `branding.primary_color="#0A84FF"`, `active_campaign.advertiser_name="Café Imperial"`, `active_campaign.ad_seconds=30`, `form_config.fields` length 4, `form_config.consent_text_version` is non-empty |
| **AT-006** | mac_hash boundary — raw MAC never crosses the wire | Client computes `sha256(MAC + venue_salt)` upstream of the SPA | SPA submits `ConnectRequest` with `mac_hash="<sha256-hex>"` | Pydantic accepts; the `mac_hash` is stored verbatim in session state; running `grep -rE '([0-9A-F]{2}[:-]){5}[0-9A-F]{2}' backend/` matches **0** lines |
| **AT-007** | Submit-and-close exploit prevention | User submits `/api/connect` successfully and gets `session_id` | User closes the tab without calling `/api/sessions/{id}/ad-complete` | Session remains in `pending_ad` state; `expires_at` stays `null`; even though the stub MikroTik adapter returns success, the authorize call is never invoked because `ad-complete` was never called |
| **AT-008** | Renew endpoint contract | A session exists with `expires_at < now()` (expired) | Client calls `POST /api/sessions/{session_id}/renew` | Returns 200 with `RenewResponse`: `campaign.ad_seconds=60`, `campaign.advertiser_name` matches the fixture, `pending_session_id == session_id` |
| **AT-009** | Unknown session returns 404 | No session with `id="00000000-0000-0000-0000-000000000000"` exists in the in-memory dict | Client calls `POST /api/sessions/00000000-.../ad-complete` | Returns **404 Not Found** with body `{"detail": "session_not_found"}`; no state mutation |
| **AT-010** | Connecting screen auto-advance timing | Portal loads at `t=0` | 3.1 s elapses with no user input | State machine advances from `connecting` to `form`; the 3 sequenced messages were each shown for the durations specified in FR-021 (1.4 s + 1.0 s + 0.7 s) |
| **AT-011** | Ad non-skippable | User is on AdScreen with 30 s remaining | User attempts to navigate away (back button), refresh, or click anywhere on the video frame | Ad continues playing; countdown does not pause; "Não é possível pular o anúncio" copy is visible (FR-029) |
| **AT-012** | Connected screen "Aproveite, {firstName}!" interpolation | User submitted form with `first_name="João Pedro Silva Souza"` | After ad completes, ConnectedScreen renders | Headline reads **"Aproveite, João!"** (first whitespace-delimited token only — FR-032) |
| **AT-013** | Mobile viewport — no horizontal scroll | Browser at iPhone 14 Pro 390 × 844 | Each of the 5 screens is rendered | `document.documentElement.scrollWidth <= 390` for all 5 screens |
| **AT-014** | Touch-target minimum size | iPhone 14 Pro viewport | All interactive elements (chip group buttons, consent checkbox, "Continuar →", "Assistir e renovar", mute toggle) measured | Every interactive element has computed bounding box with **`min(width, height) >= 44 px`** (WCAG 2.5.5 Level AAA) |
| **AT-015** | Forbidden field grep — no PII strings in source | Source tree: `backend/portal_routes.py`, `backend/schemas/portal.py`, `captive-portal-frontend/src/**` | CI runs `grep -riE '\b(phone\|email\|cpf\|last_name\|raw_mac)\b' <files>` | **0** matches (the words may appear in comments referencing "we don't collect…" but not as field identifiers — explicitly assert with a test that whitelists comment lines starting with `#` or `//`) |
| **AT-016** | OpenAPI docs completeness | FastAPI app started; user navigates to `http://localhost:8000/docs` | Inspect rendered Swagger UI | All 4 portal endpoints are listed under a tagged group ("portal"); each shows full request body schema (where applicable) and response schema; no field has type `Any` or schema `{}` |
| **AT-017** | TypeScript strict pass | `captive-portal-frontend/` repo with all source files | Run `tsc --noEmit` | Exit code 0; stdout shows no errors and no warnings |
| **AT-018** | Localization completeness — pt-BR verbatim | DOM snapshot of each screen | Diff against a fixture file `expected_strings_pt-BR.txt` extracted from the prototype source | Diff is empty (every visible string matches verbatim, including punctuation and casing) |

---

## Out of Scope

Explicitly NOT included in this feature (re-stating from BRAINSTORM and adding the assumption-derived items):

- ❌ Multi-tenant data isolation / PostgreSQL RLS / `organization_id` FK rollout (separate slice on the roadmap)
- ❌ Real DB persistence / Alembic migrations / SQLAlchemy session wiring
- ❌ Real MikroTik RouterOS API calls (port 8728); R2 POC is a separate slice
- ❌ Real video creative + YouTube Data API integration (placeholder black frame only)
- ❌ Real LGPD legal text content (Termos de uso, Política de Privacidade); placeholder Lorem with `<!-- TODO(legal-Q8) -->` only
- ❌ Notifications dispatcher (WhatsApp / Email); R14 retargeting decision deferred
- ❌ Admin SPA changes — `mkt-wifi-frontend/` is untouched in this slice
- ❌ Production deployment / hosting target / CDN / wildcard SSL
- ❌ Audit logging (NFR-015) — admin-side concern
- ❌ LGPD erasure endpoint (`DELETE /api/users/{lead_id}`) — admin-side concern
- ❌ Super-admin role (Q23) and advertiser cross-tenant scope (Q24)
- ❌ Animated radar SVG on Step 1; static placeholder is sufficient
- ❌ Multiple venue / advertiser fixtures; single "Praça Central" + "Café Imperial" only
- ❌ Multi-language support; pt-BR only (NFR-004)
- ❌ Per-tenant configurability of `ad_seconds` or `30 min default access` — these are constants in this slice
- ❌ Session persistence across FastAPI restarts (in-memory dict only; sessions evaporate)
- ❌ Browser SSO / "Manter conectado" — admin-only feature, not on portal
- ❌ Telemetry / RUM / APM wiring (success-criteria p95 verified locally only)

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| **Compliance** | LGPD anonymization mandate is locked by Legal sign-off (2026-05-03) — only `first_name + age_band + gender + neighborhood` may be collected | Schema enforces via Pydantic `Literal` types + `extra="forbid"`; no field can drift in without Legal/DPO review |
| **UX (locked)** | Every screen, copy string, color, animation, and timing constant is defined in the prototype | Zero design freedom in this slice; implementation is a 1:1 port |
| **Localization** | Every UI string must be pt-BR verbatim against prototype (NFR-004) | Snapshot test (AT-018) blocks any English/translation drift |
| **Architecture (FR-039)** | Portal must be served as a separate React build from the admin SPA | New top-level `captive-portal-frontend/` package; cannot reuse `mkt-wifi-frontend/` build pipeline |
| **Forward-compat (BD-08, TD-08, TD-09)** | API responses must nest Org + Venue + Branding so multi-tenancy can land without contract churn | Schema design pattern (already in BRAINSTORM): nested objects even when fixtures are single |
| **Forward-compat (R2)** | `/api/sessions/{id}/ad-complete` must exist NOW with the realistic response shape | When MikroTik POC lands, only the route handler body changes — no contract break |
| **Performance** | Mobile cellular fallback target — bundle should be small and load fast (NFR-009 implication) | Vite tree-shaking + minimal external deps; ≤ 100 KB gzipped target as COULD goal |
| **Privacy boundary** | Backend must never see raw MAC — `mac_hash` is computed upstream and arrives pre-hashed | Schema field is `mac_hash: str`, not `mac_address`; AT-015 grep enforces no raw-MAC strings in source |
| **Persistence (this slice)** | No DB; in-memory `dict[UUID, SessionState]` only | Sessions evaporate on restart; this is acceptable for a vertical slice and explicitly documented in Out of Scope |
| **Tooling** | TypeScript strict mode + Pydantic v2 | Compile-time + runtime contract enforcement; minor refactors required if downstream chooses Pydantic v1 |

---

## Technical Context

> Essential context for Design phase — prevents misplaced files and missed infrastructure needs.

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location (frontend)** | NEW `captive-portal-frontend/` (top-level, sibling to `mkt-wifi-frontend/`) | Honors FR-039; separate build pipeline; Vite + React 18 + TypeScript |
| **Deployment Location (backend, new files)** | NEW `backend/portal_routes.py` + NEW `backend/schemas/portal.py` (+ `backend/schemas/__init__.py`) + NEW `backend/fixtures/portal_fixtures.py` | Existing `backend/main.py` is extended only via `app.include_router(portal_router)`; routes are otherwise isolated |
| **Untouched in this slice** | `backend/mikrotik_api.py`, `backend/notifications.py`, `backend/db.py`, `mkt-wifi-frontend/` | Locked by Out-of-Scope; modifying any of these is a brainstorm-violation |
| **KB Domains** | `react`, `pydantic` | Primary patterns; both already exist in `.claude/kb/` |
| **IaC Impact** | None this slice | Existing `backend/docker-compose.yml` suffices for dev; no new GCP/Terraform/Terragrunt resources |
| **Build & dev** | Backend: `uvicorn backend.main:app --reload --port 8000`. Frontend: `cd captive-portal-frontend && npm run dev` (Vite on `:5173`) | Two terminals locally; CORS config required on backend for `:5173 → :8000` |
| **Test runners** | Backend: `pytest` against `backend/tests/test_portal_routes.py`. Frontend: `vitest` for unit; `playwright` (or `cypress`) for AT-001..AT-014 e2e | Test infrastructure is greenfield in `captive-portal-frontend/` — first-mover sets the pattern |

**Why This Matters:**

- **Location (frontend)** → Putting the portal anywhere other than a sibling top-level package re-introduces the FR-039 violation that Approach A explicitly avoids. `/design` must keep this boundary.
- **Location (backend)** → Adding routes inline to `main.py` would couple admin and portal endpoints — Validation 1 in BRAINSTORM rejected this. The router pattern is non-negotiable.
- **KB Domains** → `/design` consults `.claude/kb/react/` for component patterns and `.claude/kb/pydantic/` for v2 schema idioms (`Literal`, `extra="forbid"`, `model_config`).
- **IaC Impact = None** → Skips infra planning; `/design` should not produce Terraform stubs for this slice.

---

## Assumptions

Assumptions that, if wrong, could invalidate the design:

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| **A-001** | The MikroTik captive-portal redirect mechanism reliably appends `venue_id`, `device_id`, and `mac_hash` to the redirect URL | Tenancy resolution falls back to subdomain or path-based; FormScreen would need to fetch venue identity from a different source (browser fingerprint, AP IP reverse lookup, etc.) — schema unchanged but client URL handling rewritten | [ ] — depends on MikroTik POC (R2) and operator hotspot template config; **deferred** |
| **A-002** | pt-BR is the only supported language for v1 | Multi-language support requires a translation layer (e.g., `react-intl`) and the locked verbatim copy strings become message-catalog keys instead of literal text | [x] — confirmed by NFR-004 in the summary doc |
| **A-003** | 30 min default access + 30 s/60 s ad lengths are correct platform-wide and do NOT vary per-tenant in v1 | These become per-venue config fields in the `Venue` table and per-campaign overrides in `CampaignAd`; `BootstrapResponse` shape stays the same but values become dynamic | [x] — confirmed by FR-029, FR-032 (constants in prototype source) |
| **A-004** | A single advertiser per venue is enough for the MVP demo (no campaign rotation) | `BootstrapResponse.active_campaign` becomes `active_campaigns: list[CampaignAd]` plus a `selection_strategy` field; client picks one per session | [ ] — pending Product confirmation; low risk because we can extend without breaking |
| **A-005** | User sessions can live in a per-process in-memory dict for this slice (sessions evaporate on FastAPI restart) | Multi-worker deployment (Gunicorn/Uvicorn workers > 1) breaks because session state isn't shared; either pin to 1 worker for the demo OR adopt Redis early | [x] — explicitly confirmed in Out of Scope and Constraints; demo runs with 1 worker |
| **A-006** | Legal will not reverse the anonymization mandate before this slice ships | Schema overhaul: `LeadIn` grows new optional fields; the AT-015 grep test must allow them; new ConsentRecord text version with new field disclosures | [x] — explicit Legal sign-off 2026-05-03 in summary doc |
| **A-007** | Browsers honor non-skip behavior on `<video>` rendered without controls + with a transparent overlay | iOS Safari may auto-play with constraints (muted only, in some contexts); the timer is the source of truth, but if a user can scrub the video by accident, the FR-029 "non-skippable" requirement weakens | [ ] — verified by manual QA on iOS Safari + Chrome Mobile during build |
| **A-008** | The user's MAC has been computed and hashed by the AP / portal-redirect layer; the SPA receives the hash, not the raw MAC | Without upstream hashing, the SPA would have to either (a) skip mac_hash and let backend compute it (NFR-005c violation since backend would briefly hold raw MAC) or (b) compute it client-side using a shared secret (security antipattern: salt leaks to client) | [ ] — depends on MikroTik adapter design (R2); **deferred** |
| **A-009** | A 10-minute TTL for `pending_ad` sessions and a 5-minute grace window after expiry are acceptable for the in-memory dict | Without TTLs, the dict grows unboundedly under load; with too-short TTLs, slow users on cellular hit "session_not_found" mid-flow | [ ] — proposed as defaults; **/design must confirm or override** |
| **A-010** | Vite + React 18 + TypeScript strict is the correct stack (no React 19 RSC, no Remix, no Next.js) | If React 19 RSC is mandated, the architecture moves from SPA-only to server-rendered; backend becomes more involved; SEO not relevant for captive portal anyway, so unlikely to be wrong | [x] — confirmed by Approach A selection in BRAINSTORM |
| **A-011** | The backend Python version is 3.11+ (supports Pydantic v2 + modern `Literal`, `X \| None` union syntax) | If Python 3.10 or earlier, syntax must be `Optional[X]` and `from __future__ import annotations`; minor diff but real | [ ] — **/design must verify** by reading `backend/requirements.txt` and `backend/Dockerfile` |

**Note:** Validate critical assumptions (A-001, A-007, A-008, A-009, A-011) before or during DESIGN phase. Unvalidated assumptions become risks.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| **Problem** | **3** | One specific pain (no portal SPA exists) + one structural pain (no locked contract for downstream) — both with concrete consequences (venue activation blocked, downstream slices stall) |
| **Users** | **3** | 4 personas with explicit pain points; spans end-user, operator, dev, legal |
| **Goals** | **3** | 6 MUSTs, 4 SHOULDs, 2 COULDs — all backed by FR-IDs from the summary doc; cleanly separates non-negotiable from cuttable |
| **Success** | **3** | 14 measurable criteria with explicit numbers (5 screens, 4 endpoints, 422 status, 1800 s ±2 s, 390×844, 44 px, 0 errors, 80 % coverage, 100 KB gzipped, p95 < 50 ms, 0 grep matches) |
| **Scope** | **3** | 18 explicit out-of-scope items + 10 typed constraints + roadmap of slice dependencies in BRAINSTORM (preserved) |
| **Total** | **15/15** | Exceeds the 12 minimum; ready for Design |

**Scoring Guide:**
- 0 = Missing entirely
- 1 = Vague or incomplete
- 2 = Clear but missing details
- 3 = Crystal clear, actionable

**Minimum to proceed: 12/15** ✅

---

## Open Questions

These do not block `/design` but should be resolved during the design phase:

| # | Question | Owner | Default if unanswered |
|---|----------|-------|-----------------------|
| OQ-1 | What TTL should `pending_ad` sessions and post-expiry grace sessions use in the in-memory dict? | tech-lead | **10 min pending-ad TTL + 5 min post-expiry grace** (per A-009). Both stored as constants in `portal_routes.py`; the `/design` doc should reference them. |
| OQ-2 | Should the backend run a single uvicorn worker for the demo (so the in-memory dict is shared)? | devops | **Yes — single worker** for this slice. Document in README + docker-compose. |
| OQ-3 | What is the canonical `consent_text_version` string format? Date-based (`2026-05-03-v1`), semver (`1.0.0`), or hash-based? | legal + tech-lead | **Date-based `YYYY-MM-DD-vN`** — readable, sortable, easy to map to a Legal-approved text revision. |
| OQ-4 | Where does the hardcoded fixture `venue_salt` live for `mac_hash` future use (A-008)? | tech-lead | `backend/fixtures/portal_fixtures.py` as `VENUE_SALT_PRACA_CENTRAL: str = "<placeholder-32-bytes>"`. **Out of scope to actually hash** — but noted so future MikroTik POC has a clear hand-off point. |
| OQ-5 | Should the portal log structured events (e.g., session-state transitions) for future observability? | observability-lead | **Stub a `log.info(...)` call at each state transition with `event_type` field**, but no Cloud Logging / Langfuse wiring. Future observability slice picks them up. |
| OQ-6 | Should the FormScreen "Bairro" select use a static list (per FR-022) or fetch from `/api/portal/bootstrap`? | product-lead | **Use the static list returned in `BootstrapResponse.form_config.fields[id="neighborhood"].options`** — already locked in the contract; resolves AT-005 + R13 forward-compat. |
| OQ-7 | Does the React app need Service Worker / offline fallback? | tech-lead | **No** — captive portal is by definition online-only (intercept happens before the user has internet). |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-03 | define-agent | Initial version. Extracted from `BRAINSTORM_CAPTIVE_PORTAL.md` (high-confidence brainstorm with API contract already locked). 15/15 clarity. 18 acceptance tests. 11 assumptions documented (5 validated, 6 deferred for /design). 7 open questions surfaced — none blocking. |

---

## Next Step

**Ready for:**
```
/design .claude/sdd/features/DEFINE_CAPTIVE_PORTAL.md
```

This will produce `.claude/sdd/features/DESIGN_CAPTIVE_PORTAL.md` — the implementation plan turning these requirements into:
- File-by-file build order (backend schemas first, then routes, then fixtures; frontend state machine first, then screens)
- Component tree + state-shape contracts for the React SPA
- Test plan implementing AT-001..AT-018
- Resolution of OQ-1..OQ-7
- Validation of A-001, A-007, A-008, A-009, A-011 against the existing repo state
