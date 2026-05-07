# AdConnect / MKT WiFi

> **Wi-Fi Patrocinado** for public spaces — operator dashboard + LGPD-compliant captive portal + serverless backend with real-JWT auth. _Wi-Fi que paga a conta._

`AdConnect` is the consumer-facing brand. `MKT WiFi` is the product/codebase name. They refer to the same platform.

---

## Overview

### Conceito (pt-BR — original product description)

> O AdConnect é um projeto de inclusão digital e marketing inteligente que oferece acesso gratuito e de alta qualidade à internet em espaços públicos. Através de uma plataforma de Wi-Fi Patrocinado, conectamos o fluxo de pessoas da praça diretamente às marcas locais e nacionais, criando um ecossistema onde todos saem ganhando.
>
> **Como funciona (Jornada do Usuário):**
> 1. **Conexão** — O usuário seleciona a rede aberta AdConnect em seu smartphone.
> 2. **Engajamento** — Antes da internet ser liberada, uma tela de login (Captive Portal) exibe um vídeo publicitário curto e não pulável (15–30 s) de uma empresa parceira.
> 3. **Acesso Liberado** — Após o vídeo, a internet de alta velocidade é liberada por 30 min – 1 h.

### What this repo is (English — technical)

This repo holds **three surfaces** that compose the platform:

| Surface | Purpose | Folder |
|---|---|---|
| **Captive Portal SPA** | LGPD-anonymous Wi-Fi guest flow (5 screens: Hello → Form → Consent → Ad → Connected) | [captive-portal-frontend/](captive-portal-frontend/) |
| **Admin SPA** | Operator dashboard — 9 sections, 3 demo roles, deep-linkable, role-gated | [mkt-wifi-admin/](mkt-wifi-admin/) |
| **Backend API** | FastAPI + Pydantic v2 + SQLAlchemy 2.x async + python-jose JWT auth | [backend/](backend/) |

The platform was built across **3 vertical slices** using an in-house 5-phase workflow (`brainstorm` → `define` → `design` → `build` → `ship`). Each slice's full archive lives under [.claude/sdd/archive/](.claude/sdd/archive/) — read those in order for the architectural history.

---

## Quick Start

### Prerequisites

| Tool | Minimum | Verified With |
|---|---|---|
| Python | 3.11 | 3.12.11 |
| Node.js | 18 | v25.6.1 |
| npm | bundled with Node | 11.9.0 |
| Postgres | _optional_ — SQLite fallback works for dev | 14+ |

### 60-Second Setup

```bash
# 1. Backend deps + start (single worker mandatory; SQLite fallback for dev)
cd backend
pip install -r requirements.txt aiosqlite pytest pytest-asyncio httpx
export JWT_SECRET="dev-only-secret-change-for-prod"
export DATABASE_URL="sqlite+aiosqlite:///./mktwifi.db"
uvicorn main:app --port 8000 --workers 1 &

# 2. Captive Portal SPA (terminal 2)
cd captive-portal-frontend && npm install && npx vite --port 5173 &

# 3. Admin SPA (terminal 3)
cd mkt-wifi-admin && npm install && npx vite --port 5174 &
```

Then open in your browser:

| URL | What |
|---|---|
| http://localhost:5173/ | Captive portal — Wi-Fi guest flow |
| http://localhost:5174/login | Admin SPA login |
| http://localhost:8000/docs | Swagger UI (lock icons on admin endpoints) |

### Demo Accounts (Admin SPA)

| Email | Password | Role | Allowed sections |
|---|---|---|---|
| `admin@mktwifi.com` | `admin123` | admin | All 9 |
| `anunciante@mktwifi.com` | `anunciante123` | advertiser | Dashboard + Campanhas (read) + Relatórios |
| `viewer@mktwifi.com` | `viewer123` | viewer | All 9 except Monetização |

`JWT_SECRET` behavior: in dev, an unset value triggers a `WARNING` log + random per-process secret (tokens invalidate on restart). In production (`ENVIRONMENT=production`), the backend **refuses to start** without `JWT_SECRET` — see [backend/README.md](backend/README.md) §JWT_SECRET.

---

## Project Structure

```
AdConnect/                                    # Repo root (brand name)
├── README.md                                 # This file
├── backend/                                  # FastAPI + Postgres/SQLite + JWT auth
│   ├── main.py                               # App entrypoint, 21 admin routes (16 auth-gated)
│   ├── auth.py                               # JWT mint/verify, UserClaims, get_secret() fail-fast
│   ├── auth_routes.py                        # /api/auth/login + /api/auth/logout APIRouter
│   ├── portal_routes.py                      # /api/portal/* + /api/connect (LGPD-public)
│   ├── schemas/portal.py                     # Pydantic models with Literal-type LGPD enforcement
│   ├── tests/                                # 115 pytest tests (slice 1 + slice 3)
│   ├── scripts/grep_pii_check.sh             # AT-015 LGPD enforcement (CI grep)
│   └── README.md                             # Backend-specific setup + endpoint surface
├── captive-portal-frontend/                  # Slice 1: Wi-Fi guest SPA
│   ├── src/                                  # 5 screens, state machine via useReducer
│   └── tests/unit/                           # 25 vitest tests (incl. retry-helper from v1.1)
├── mkt-wifi-admin/                           # Slice 2 + 3: operator dashboard
│   ├── src/sections/                         # 11 section pages (login + 9 sections + 403 page)
│   ├── src/api/                              # 10 TanStack Query hook factories
│   ├── src/stores/                           # 3 Zustand stores (auth + toasts + prefs)
│   ├── src/ui/RoleGuard.tsx                  # Per-route role gate
│   └── tests/                                # 24 vitest tests (5 unit + 2 contract)
├── notes/                                    # Pre-slice source material + historical refs
│   ├── summary-requiments.md                 # Consolidated requirements (the source of truth)
│   ├── MKT WiFi - Full App.html              # Self-extracting Babel-standalone prototype (1.7 MB)
│   └── MKT WiFi - Captive Portal _standalone_.html
├── .claude/                                  # Repo-tracked: SDD archives only (rest is gitignored)
│   └── sdd/archive/                          # Shipped-slice archives (the platform's STATE.md)
│       ├── CAPTIVE_PORTAL/                   # Slice 1 — full 5-phase artifacts
│       ├── ADMIN_SPA/                        # Slice 2 — full 5-phase artifacts
│       └── AUTH_HARDENING/                   # Slice 3 — full 5-phase artifacts
└── Presentation/                             # Slide decks (executive pitch, status)
```

**No deployment manifests yet** (no `Dockerfile` orchestration, no Terraform, no CI/CD wiring) — this is currently a single-machine dev setup. See [Roadmap](#roadmap).

---

## Tech Stack

### Backend

| Component | Version | Role |
|---|---|---|
| Python | 3.11+ (runs on 3.12.11) | Runtime |
| FastAPI | 0.136.1 | Async REST framework |
| Pydantic | 2.11.10 | Schema validation, LGPD `Literal` enforcement |
| SQLAlchemy | 2.x async | ORM with `asyncpg` (Postgres) or `aiosqlite` (SQLite) |
| python-jose | 3.5.0 | HS256 JWT (5 claims, 7-day TTL) |
| pytest + pytest-asyncio + httpx | latest | Test infrastructure |

### Frontend (both SPAs)

| Component | Version | Role |
|---|---|---|
| Vite | 5.4.21 | Dev server + production bundler |
| React | 18.3 | UI framework |
| TypeScript | 5.5 | strict mode + noUnusedLocals + noUnusedParameters |
| Vitest | 2.1.9 | Unit/contract test runner |

### Admin SPA only

| Component | Version | Role |
|---|---|---|
| TanStack Query | 5.100 | Server state, per-endpoint `staleTime`, mutation invalidation |
| Zustand | 5.0 | Client state — 3 stores (auth + toasts + prefs) |
| React Router | 6.30 | `createBrowserRouter` + `<AuthGate>` + `<RoleGuard>` |

---

## Tests & Verification

The platform ships with **164 verified-passing tests** across 3 surfaces:

```bash
# Backend — 115 tests in ~0.4 s
cd backend && JWT_SECRET=dev-only-secret \
  DATABASE_URL="sqlite+aiosqlite:///./test.db" \
  python3 -m pytest tests/ -q -o asyncio_mode=auto

# Captive portal — 25 tests in ~0.5 s
cd captive-portal-frontend && npx vitest run

# Admin SPA — 24 tests in ~0.7 s
cd mkt-wifi-admin && npx vitest run

# AT-015 LGPD enforcement (CI gate)
bash backend/scripts/grep_pii_check.sh

# TypeScript strict
cd captive-portal-frontend && npx tsc --noEmit
cd mkt-wifi-admin && npx tsc --noEmit

# Production builds (verify bundle budgets)
cd captive-portal-frontend && npx vite build  # ~47 KB gzipped initial JS
cd mkt-wifi-admin && npx vite build           # ~88 KB gzipped initial JS (under 150 KB COULD goal)
```

### Wire-level auth proofs (slice 3)

With backend running on `:8000`:

```bash
# 1. Without auth → 401
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/api/kpis
# → 401

# 2. Login as admin, use the JWT
TOKEN=$(curl -fsS -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@mktwifi.com","password":"admin123"}' \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['token'])")

curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/kpis
# → 200

# 3. Same flow with viewer login → 403 on admin-only endpoints
TOKEN=$(curl -fsS -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"viewer@mktwifi.com","password":"viewer123"}' \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['token'])")

curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/monetization
# → 403
```

End-to-end Dev-Loop replay (38 verifications + walkthrough):

```bash
# Reuses the canonical PROMPT used to validate the platform.
# Re-runs against the current code, verifying nothing regressed.
cat .claude/dev/tasks/PROMPT_PLATFORM_TOUR.md | head -50
# (Read instructions there; or see .claude/dev/logs/LOG_PLATFORM_TOUR_*.md for the prior run.)
```

---

## Key Architectural Decisions

A condensed view; the authoritative records live in each slice's archive (linked below).

| # | Decision | Slice | Why |
|---|---|---|---|
| 1 | **LGPD anonymization, 4-field form** (`firstName + ageBand + gender + neighborhood`) | 1 | NFR-005 mandate; Pydantic `Literal` types enforce server-side, grep-CI prevents reintroduction |
| 2 | **Single uvicorn worker** (`--workers 1`) | 1 | Captive-portal sessions in in-memory `dict`; multi-worker would split state |
| 3 | **APIRouter extraction pattern** for slice modules | 1 | `portal_routes.py` was the template; `auth_routes.py` mirrors it identically |
| 4 | **Vite manualChunks bundle splitting** (admin SPA: react-vendor + tanstack + 3 lazy section chunks) | 2 | 88 KB gzipped initial JS — 41% under 150 KB COULD goal; long-tail cache hits across deploys |
| 5 | **Custom Zustand `StateStorage` adapter** (auth store) | 2 | Avoids the Zustand-v5 self-reference cascade; supports `localStorage` ↔ `sessionStorage` swap by `remember` flag |
| 6 | **Auth-gap-honesty pattern** | 2 → 3 | Slice 2 explicitly documented Decision 8 + 2 `// TODO(auth-hardening-slice)` markers; slice 3 closed both — no rediscovery cost |
| 7 | **Real JWT** (python-jose, HS256, 5 claims `{sub, name, role, iat, exp}`, 7-day TTL) | 3 | Replaced slice-2 opaque token; future R5 swaps `auth_routes.py:login` only |
| 8 | **`get_secret()` production fail-fast** | 3 | `RuntimeError` if `ENVIRONMENT=production` AND `JWT_SECRET` unset — 2 lines, prevents class of operational bug |
| 9 | **HTTP 401 vs 403 split** (`verify_token` raises 401, `require_role([...])` raises 403) | 3 | Standards-compliant; lets SPA distinguish "log out" from "show insufficient-permission UI" |

---

## Documentation Map

| Document | What it covers |
|---|---|
| [backend/README.md](backend/README.md) | Backend-specific setup, full endpoint table, JWT_SECRET production posture, integration plug-in points (MikroTik / WhatsApp / Email) |
| [.claude/sdd/archive/CAPTIVE_PORTAL/SHIPPED_2026-05-04.md](.claude/sdd/archive/CAPTIVE_PORTAL/SHIPPED_2026-05-04.md) | Slice 1 — vertical slice summary, lessons learned, deferred items |
| [.claude/sdd/archive/ADMIN_SPA/SHIPPED_2026-05-04.md](.claude/sdd/archive/ADMIN_SPA/SHIPPED_2026-05-04.md) | Slice 2 — admin SPA summary, Zustand v5 lessons, 8 EmBreveButton roadmap |
| [.claude/sdd/archive/AUTH_HARDENING/SHIPPED_2026-05-04.md](.claude/sdd/archive/AUTH_HARDENING/SHIPPED_2026-05-04.md) | Slice 3 — auth hardening summary, fail-fast lesson, wire-level closure proofs |
| [notes/summary-requiments.md](notes/summary-requiments.md) | Consolidated requirements (pre-slice-1 source of truth) |

Each slice archive also contains the full `BRAINSTORM`, `DEFINE`, `DESIGN`, and `BUILD_REPORT` artifacts.

---

## Roadmap

> Prioritized backlog from the slice-3 SHIPPED summary's `Recommendations for Future Work` table. **Item 10 (delete `mkt-wifi-frontend/` legacy folder) was completed 2026-05-04.**

### Immediate (~half-day each)

1. **R5 — bcrypt password hashing.** `auth_routes.py:login` is the single swap point.
2. **5 deferred slice-2 Playwright e2e specs** (login + role-gating + Campanhas CRUD + LGPD-no-PII + deleted-endpoints). Now unblocked because login is real-JWT.
3. **Admin-SPA expired-notice clears on input change.** ~5 LoC `useEffect` in `LoginPage.tsx`.
4. **Add `mkt-wifi-admin/README.md`.** Currently absent — the slide-builder agent doc references it as a future addition.

### Sprint-scale (~1 week each)

5. **Multi-tenant foundation slice** — Org + Venue tables + Postgres Row-Level Security + `org_id` JWT claim (additive extension to `UserClaims`). Highest-value next slice; unblocked by slice 3.
6. **Audit pipeline (NFR-015)** — consume the 8 stubbed `event_type=auth_*` log events into structured Cloud Logging.
7. **Auth recovery** (`/api/auth/forgot` + `/api/auth/reset`) — depends on R5.

### Cleanups

8. ESLint `no-restricted-syntax` rule for the 4th NFR-005 enforcement layer (~30 min).
9. Refresh-token endpoint + `kid` rotation (low priority — current 7-day TTL is acceptable).

---

## Workflow & Conventions

This repo uses an in-house **AgentSpec 5-phase workflow**:

| Phase | Slash command | Output |
|---|---|---|
| 0 | `/workflow:brainstorm <idea>` | `BRAINSTORM_*.md` |
| 1 | `/workflow:define <input>` | `DEFINE_*.md` (must reach 12/15 clarity) |
| 2 | `/workflow:design <define-file>` | `DESIGN_*.md` (ADRs inline) |
| 3 | `/workflow:build <design-file>` | Code + `BUILD_REPORT_*.md` |
| 4 | `/workflow:ship <define-file>` | `archive/{FEATURE}/SHIPPED_<date>.md` + working files cleared |
| ⤴ | `/workflow:iterate <file> "<change>"` | In-place document update with cascade |

For local-machine verification + walkthrough loops, a **Dev Loop (Level 2)** scaffolding processes `PROMPT_*.md` files with HITL pacing, retry/circuit-breaker safeguards, and PROGRESS/LOG audit trail. The scaffolding is kept local (gitignored) — only the resulting SDD archives ship in this repo.

### Conventions

- **pt-BR** for user-facing copy (UI strings, business prose). Frozen in `src/strings.ts` per slice.
- **English** for code, comments, and technical docs.
- **Markdown links with relative paths** in docs (per the VSCode-extension config in this repo).
- **Self-documenting code** — minimal comments; if a comment is needed, it's because of non-obvious WHY (constraint, invariant, workaround).
- **No emojis in source files** unless explicitly requested.

---

## Status

| Indicator | Value |
|---|---|
| Slices shipped | 3 (CAPTIVE_PORTAL · ADMIN_SPA · AUTH_HARDENING) |
| Total tests passing | 164 (115 backend + 24 admin SPA + 25 captive portal) |
| LGPD enforcement layers active | 3 of 4 (Pydantic Literal types · frontend type elision · grep CI gate; ESLint deferred) |
| Bundle budgets | Both SPAs comfortably under their COULD goals |
| Auth posture | Real JWT, 16 admin endpoints gated server-side, NFR-016 met |
| Production deployment | Not yet — single-machine dev setup |

Last verified end-to-end: **2026-05-04** via a 38-step Dev Loop (`PROMPT_PLATFORM_TOUR`) — 100 % PASS, 0 zombies. Full audit trail kept locally; the slice-3 SHIPPED summary above includes the wire-level closure proofs verified during that tour.


## 📄 License

Confidential — project under development.