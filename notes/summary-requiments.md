# MKT WiFi Platform — Consolidated Requirements

> **Generated:** 2026-05-03 · **Last updated:** 2026-05-03 (v1.2)
> **Sources:** 3 documents (`01 -kickoff.md`, `MKT WiFi - Full App.html`, `MKT WiFi - Captive Portal _standalone_.html`) + verified against scaffolded code in `backend/` and `mkt-wifi-frontend/` + 2 stakeholder decisions (Legal Dept, Product Lead)
> **Confidence:** 0.98 (HIGH)
> **Scope:** Single source of truth for the MKT WiFi Platform — a **multi-tenant SaaS** for Wi-Fi marketing and captive-portal management in the Brazilian market
>
> **v1.1 changes:** Captive-portal end-user UX fully specified (5-step flow extracted from `MKT WiFi - Captive Portal _standalone_.html`). LGPD compliance approved by Legal Department, conditional on anonymization of critical user information — propagated through NFR-005, the `Lead` entity schema, and risk R3.
>
> **v1.2 changes (2026-05-03):** **Multi-tenant SaaS confirmed by Product Lead.** Propagated: new BD-08 + TD-08 architectural decisions, tenant-resolution model, every operator-owned entity gains `organization_id` FK, new NFRs for tenant isolation, "Solicitar acesso" graduates from commercial-handoff to real provisioning flow, integrations become per-tenant. Q3 / R6 resolved; new risks R15–R17 and questions Q20–Q22 surfaced.

---

## Confidence Computation

| Factor | Modifier | Notes |
|---|---|---|
| Base | 0.85 | |
| Kickoff documents explicit tech-stack decisions | +0.05 | "We decided X" signals present |
| Both HTML prototypes fully decompressed and inspected (component-level) | +0.10 | Two bundler manifests decoded → 11 component files read |
| Backend scaffolded (`backend/main.py` exposes 21 endpoints, matches prototype mock client) | +0.05 | Multiple-source corroboration |
| pt-BR labels, regex, role names directly extracted | +0.05 | Concrete strings, not inferred |
| Captive-portal end-user UX fully specified (5-step flow with timing constants) [v1.1] | +0.02 | Closes prior gap R1 |
| LGPD compliance signed off by Legal (conditional on PII anonymization) [v1.1] | +0.02 | Closes prior gap R3/Q8 |
| **NEW (v1.2):** Multi-tenancy confirmed (multi-tenant SaaS) by Product Lead | +0.02 | Closes prior gap R6/Q3 — unblocks schema baseline |
| No human stakeholder names attributed | -0.10 | Owner/RACI is structurally TBD |
| Admin↔portal form-config divergence (R13) and a few residual specifics still TBD | -0.01 | Residual gaps, not blockers |
| **FINAL** | **0.98** | HIGH — sufficient for execution planning |

> The prototype's React app was packaged inside a `<script type="__bundler/manifest">` block (gzip+base64 JSON). It was decoded into 10 source files (login, shell/nav, dashboard sections, mocks/API client, monetization, reports, config, modals, UI primitives, tweaks panel). All UI-derived requirements below cite the specific component file.

---

## Table of Contents

1. Executive Summary
2. Current Implementation State
3. Key Decisions (Business / Technical / Process)
4. Functional Requirements
5. Non-Functional Requirements
6. Data / Schema Requirements
7. Architecture
8. API Contract (verified against `backend/main.py`)
9. UX / Screen Inventory
10. Roles & Permissions
11. Integrations
12. Action Items (Next Steps)
13. Blockers & Risks
14. Open Questions
15. Stakeholders
16. Success Metrics
17. Appendix (Source Index, Glossary, Decision Log)

---

## 1. Executive Summary

| Aspect | Details |
|---|---|
| **Product** | MKT WiFi — Plataforma de Gestão (Wi-Fi marketing + captive-portal management platform) |
| **Tagline (extracted)** | *"Wi-Fi que paga a conta."* — `mkt-wifi-frontend/frontend/login.jsx:77` |
| **Pitch** | *"Monetize sua rede captiva com vídeos, capture dados de clientes e gerencie tudo em um só lugar."* |
| **Business Problem** | Operators of guest Wi-Fi networks (cafés, lojas, eventos, praças, hotéis) cannot easily monetize their networks, capture leads from end-users, or centrally manage MikroTik fleets |
| **Solution** | Multi-tenant SaaS web platform that (a) serves video ads via captive portal in exchange for time-bound internet access, (b) captures lead data from end-users, (c) manages MikroTik device fleet, (d) reports to advertisers, (e) provides 4 monetization models |
| **Target Market** | Brazil (system language pt-BR; phone format `(NN) NNNNN-NNNN`; LGPD-aware; CNPJ on company config) |
| **Kickoff Date** | 2026-04-30 |
| **Doc Generated** | 2026-05-03 |
| **Critical Deadline** | TBD — not stated in kickoff |
| **Stakeholders** | TBD — kickoff names no individuals |

---

## 2. Current Implementation State

The repository is **not greenfield**. As of 2026-05-03 the team has already scaffolded:

| Path | What's there | Status |
|---|---|---|
| [backend/main.py](backend/main.py) | FastAPI app with 21 endpoints (auth, KPIs, demographics, campaigns CRUD, users, captive-portal connect, devices, notifications, monetization, reports, form config) | Scaffolded |
| [backend/mikrotik_api.py](backend/mikrotik_api.py) | MikroTik integration adapter (58 lines) | Scaffolded |
| [backend/notifications.py](backend/notifications.py) | Notifications dispatcher (50 lines) | Scaffolded |
| [backend/db.py](backend/db.py) | DB layer (184 lines) | Scaffolded |
| [backend/Dockerfile](backend/Dockerfile), [backend/docker-compose.yml](backend/docker-compose.yml), [backend/requirements.txt](backend/requirements.txt) | Container/dependency setup | Scaffolded |
| [mkt-wifi-frontend/frontend/](mkt-wifi-frontend/frontend/) | React SPA: `app.jsx`, `login.jsx`, `shell.jsx`, `sections1.jsx`, `sections2.jsx`, `sections3.jsx`, `data.jsx`, `ui.jsx`, `icons.jsx`, `styles.css` | Scaffolded |
| [mkt-wifi-frontend/MKT WiFi.html](mkt-wifi-frontend/MKT%20WiFi.html), [mkt-wifi-frontend/tweaks-panel.jsx](mkt-wifi-frontend/tweaks-panel.jsx) | HTML harness + design-tools tweaks panel | Scaffolded |
| [notes/MKT WiFi - Full App.html](notes/MKT%20WiFi%20-%20Full%20App.html) | Self-extracting bundled prototype of the **admin panel** (single-file demo distribution of the same SPA) | Reference artifact |
| [notes/MKT WiFi - Captive Portal _standalone_.html](notes/MKT%20WiFi%20-%20Captive%20Portal%20_standalone_.html) | Self-extracting bundled prototype of the **end-user captive portal** — 5-step flow inside an iOS device frame, presented in a Figma-like design canvas with multiple artboard variants | Reference artifact (added v1.1) |

**Implication:** This document captures requirements **as-designed**. Any drift between this doc and the scaffolded code should be reconciled — prefer this doc for product intent, prefer the code for current behavior.

---

## 3. Key Decisions

### 3.1 Business Decisions

| # | Decision | Source | Status |
|---|---|---|---|
| BD-01 | Build Wi-Fi marketing & captive-portal management platform with three pillars: video monetization, lead capture, MikroTik fleet management | kickoff.md | Approved |
| BD-02 | Target Brazil — system language pt-BR | kickoff.md | Approved |
| BD-03 | Three audience tiers: end-user (captive portal) / operator-admin / advertiser | login.jsx, shell.jsx (3 roles in mock auth + sidebar role-label map) | Approved |
| BD-04 | Monetization is multi-model: CPV (per view), time package, hybrid, fixed monthly — operator selects | data.jsx `monetization`, sections3.jsx `MonetizationSection` | Approved |
| BD-05 | Internet access is the *exchange currency* — users get access (e.g., +30 min) in return for watching a video and submitting lead data | sections1.jsx (CampaignCard "+30 min acesso" tag) | Approved |
| BD-06 | Video sources are YouTube (linked) OR direct upload | sections3.jsx CampaignModal `<select>YouTube/Upload</select>` | Approved |
| BD-07 | Deliverable channels for notifications: WhatsApp Business + Email | data.jsx `notifRules` (channels: WhatsApp, Email) | Approved |
| BD-08 | **Multi-tenant SaaS** — the platform serves many independent operators (cafés, lojas, eventos, redes de hotéis, etc.) from a single deployment. Each operator (a `Tenant` / `Organization`) has isolated data, users, devices, leads, campaigns, and configuration. | Product Lead decision 2026-05-03 | Approved |

### 3.2 Technical Decisions

| # | Decision | Rationale (verbatim from kickoff) | Source |
|---|---|---|---|
| TD-01 | Backend: Python + FastAPI | "high performance, static typing with Pydantic, excellent for asynchronous processing" | kickoff.md |
| TD-02 | Frontend: React for Admin Panel + Captive Portal | "componentization of the provided HTML layout, efficient state management" | kickoff.md |
| TD-03 | Database: PostgreSQL | "relational, robust for storing connection logs, user data, and network telemetry" | kickoff.md |
| TD-04 | ORM: SQLAlchemy + Alembic for migrations | "database versioning in the backend" | kickoff.md |
| TD-05 | API base URL convention: `http://localhost:8000` (dev); endpoints prefixed `/api/` | data.jsx `API_BASE` + backend/main.py | data.jsx, backend/main.py |
| TD-06 | Session storage: client-side JWT-style token, 7-day TTL, persisted in `localStorage` ("Manter conectado") or `sessionStorage` | login.jsx `restoreSession` | login.jsx:236-249 |
| TD-07 | Frontend ships as single-file bundled app (Babel/standalone) for the prototype; production build TBD | bundler manifest in HTML prototype | prototype |
| TD-08 | **Tenancy model: shared-database with row-level isolation.** Every operator-owned table carries an indexed `organization_id` foreign key. Tenant context is resolved server-side per request (from the auth token / subdomain) and applied as a non-bypassable filter (SQLAlchemy event hook or PostgreSQL RLS policies). No schema-per-tenant or DB-per-tenant — operationally simpler at the expected scale, and Postgres RLS gives strong enforcement without app-layer trust. | Product Lead BD-08 implication | Approved (default — confirm if RLS vs ORM-hook) |
| TD-09 | **Tenant resolution mechanism: subdomain-based for the admin SPA** (e.g., `acme.mktwifi.com.br` → tenant `acme`), **venue/device-based for the captive portal** (the AP's `device_id` resolves to its `venue_id` resolves to its `organization_id`, transparent to the end-user). | BD-08 + portal flow | Approved (default — confirm if path-based vs subdomain) |

### 3.3 Process Decisions

| # | Decision | Source |
|---|---|---|
| PD-01 | Schema versioned via Alembic | kickoff.md |
| PD-02 | UX driven by the existing HTML prototype, not designed from scratch | kickoff.md |
| PD-03 | Frontend gracefully degrades to mocked data when backend is offline (700ms timeout per call) | data.jsx `tryFetch` |

---

## 4. Functional Requirements

> **Source legend:** `[kickoff]`, `[login]`=login.jsx, `[shell]`=shell.jsx, `[s1]`=sections1.jsx, `[s2]`=sections2.jsx, `[s3]`=sections3.jsx, `[data]`=data.jsx, `[app]`=app.jsx, `[backend]`=backend/main.py.

### 4.1 Authentication & Session

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-001 | Admin/advertiser/viewer must log in with email + password | P0 | login.jsx, backend `/api/auth/login` |
| FR-002 | Login form must validate: email contains `@`, password length ≥ 6 chars (client-side); server returns 401 with message `"Email ou senha incorretos."` on failure | P0 | login.jsx:33-34, data.jsx:174 |
| FR-003 | "Manter conectado" checkbox: when checked persists session to `localStorage`, else `sessionStorage` | P1 | login.jsx:44-45 |
| FR-004 | Sessions auto-expire after 7 days (client-side check on restore) | P1 | login.jsx:242 |
| FR-005 | "Esqueci minha senha" tab triggers email-based password reset flow ("Enviaremos um link…") | P1 | login.jsx:197-228 |
| FR-006 | SSO Google + SSO Microsoft buttons present, currently labeled "em breve" — full integration is roadmap | P2 | login.jsx:174-181 |
| FR-007 | "Solicitar acesso" link routes prospective customer to commercial-team handoff (no self-service signup) | P2 | login.jsx:186 |
| FR-008 | Logout clears both localStorage and sessionStorage | P0 | login.jsx:251-254 |
| FR-009 | After login, sidebar shows user initials, name, and translated role label (Administrador / Anunciante / Visualizador) | P1 | shell.jsx:38-46 |
| FR-010 | All sections must be gated — unauthenticated requests must NOT load `data` (app.jsx returns LoginScreen when `!session`) | P0 | app.jsx:90-92 |

### 4.2 Captive Portal (End-User Flow) — verified from `MKT WiFi - Captive Portal _standalone_.html`

> **Source legend (this section):** `[portal]` = `MKT WiFi - Captive Portal _standalone_.html` decoded → `0e073557-…js` (the `CaptivePortal` flow controller and the 5 screen components: `ConnectingScreen`, `FormScreen`, `AdScreen`, `ConnectedScreen`, `RenewScreen`). Line numbers below refer to that file unless otherwise noted.

#### 4.2.1 Flow overview (5 steps)

The portal is a single-screen-at-a-time React state machine driven by `step ∈ {connecting, form, ad, connected, renew}` (`portal:543`).

| Step | id | Duration | Goal | Component |
|---|---|---|---|---|
| 1 | `connecting` | ~3.1s scripted (1.4s + 1.0s + 0.7s) | Reassure user that network was found and they are about to be redirected | `ConnectingScreen` |
| 2 | `form` | user-paced | Capture minimal demographics + LGPD consent | `FormScreen` |
| 3 | `ad` | 30s (first run) or 60s (renewal) | Play non-skippable advertiser video | `AdScreen` |
| 4 | `connected` | 30 min countdown | User has free internet; visible circular timer; preview of renewal mechanic | `ConnectedScreen` |
| 5 | `renew` | user-paced | After expiry, prompt "Assistir e renovar" → loop back to step 3 with 60s ad | `RenewScreen` |

#### 4.2.2 Functional Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-020 | When end-user connects to managed Wi-Fi (open SSID, naming convention `MKT_WiFi_{venue}`, e.g. `MKT_WiFi_Praca_Central`), the MikroTik intercepts HTTP and redirects to the captive-portal URL | P0 | portal:129 ("MKT_WiFi_Praca_Central · sem senha") |
| FR-021 | **Step 1 — Connecting splash:** display brand logo, animated radar, and 3 sequenced messages: "Procurando rede…" / "Localizando sinal Wi-Fi disponível na praça." → "Rede encontrada" / "{ssid} · sem senha" → "Pronto para conectar" / "Redirecionando para o portal de acesso." Auto-advances after ~3.1s | P0 | portal:97-145 |
| FR-022 | **Step 2 — Registration form** collects exactly 4 fields: Nome (free text, ≥3 chars after trim), Idade (chip group: 18–24 / 25–34 / 35–50 / 50+), Gênero (chip group: Feminino / Masculino / Prefiro não informar), Bairro (select: Centro / Zona Norte / Zona Sul / Zona Leste / Zona Oeste / Praia) | P0 | portal:148-212 |
| FR-023 | **Privacy-by-design:** the portal MUST NOT collect phone, email, CPF, last name, exact birthdate, MAC address (visible to user), or any other directly-identifying field. Only the 4 categorical/given-name fields above. **This satisfies Legal's anonymization mandate** (see NFR-005). | P0 | portal (absence of fields) + legal-dept sign-off 2026-05-03 |
| FR-024 | LGPD consent checkbox is required to enable submission. Copy: *"Aceito os <u>termos de uso</u> e o tratamento dos meus dados conforme a LGPD."* Submit button is disabled until checked | P0 | portal:214-227, 158 |
| FR-025 | "Termos de uso" must be a clickable link to a legal text page (TBD content; route TBD) | P0 | portal:224 |
| FR-026 | Privacy reassurance microcopy below submit button: *"Seus dados ficam seguros e nunca são vendidos."* | P1 | portal:241-246 |
| FR-027 | Form-page header banner: pill `PRAÇA CENTRAL · WI-FI GRATUITO` (venue name dynamically driven by AP location) + headline "Acesso liberado em 30 minutos." + sub "Preencha rapidinho e assista a um vídeo de 30s para começar a navegar." | P1 | portal:170-186 |
| FR-028 | Submit button label: "Continuar →" (disabled state styled in `T.surface2` / muted text) | P1 | portal:229-239 |
| FR-029 | **Step 3 — Ad video** plays a non-skippable advertiser creative. Duration is 30s on first session, 60s on renewal. Top-left badge: `ANÚNCIO`. Top-right control: mute/unmute toggle. Bottom: countdown `MM:SS`, progress bar (filled with `accent2`), and warning copy *"Não é possível pular o anúncio"* | P0 | portal:296-388 |
| FR-030 | Ad overlay shows advertiser name + slogan (large centered text). Backend must supply these per impression as part of campaign metadata | P0 | portal:339-345, 554-558 (fed from CaptivePortal controller) |
| FR-031 | When ad timer reaches 0, automatically transition to step 4 (`onComplete()`) — no user action required | P0 | portal:299-307 |
| FR-032 | **Step 4 — Connected screen** shows: green ✓ in circle, "CONECTADO" eyebrow, headline "Aproveite, {firstName}!" (uses first token of `name`), sub "Já pode usar a internet livremente.", a 200×200 circular SVG countdown timer (MM:SS, default 30:00), and an info card explaining the renewal mechanic ("Quando o tempo acabar — Assista a um vídeo de 1 minuto e ganhe mais 30 min."), foot copy "Pode fechar esta aba e usar normalmente." | P0 | portal:391-483 |
| FR-033 | Circular countdown ring depletes via SVG `strokeDashoffset` keyed off `(remaining / total)`. Updates every 1s | P1 | portal:434-441 |
| FR-034 | When timer reaches 0, transition to step 5 (`onExpire()`) | P0 | portal:393-401 |
| FR-035 | **Step 5 — Renew screen:** clock icon, "Seu tempo acabou.", sub "Assista a um vídeo de 1 minuto e ganhe mais 30 minutos de acesso.", stat grid (Anúncio: 60s · Acesso liberado: 30 min), CTA "Assistir e renovar" → loops to step 3 with `adLength = 60` | P0 | portal:486-528, 568-570 |
| FR-036 | Bottom dot-indicator on Step 1 hints the multi-step nature (4 dots, first highlighted) | P2 | portal:134-142 |
| FR-037 | On submission of Step 2, the controller saves `{ name, age, gender, hood }` to memory and proceeds to ad. Backend integration: this submission must `POST /api/connect` with the same payload + MAC + venue/device id, and backend must persist Lead + ConsentRecord + open Session | P0 | portal:551 + backend `/api/connect` |
| FR-038 | Backend grants the user's MAC `30 min` of access via MikroTik adapter on successful `/api/connect`; on renewal `/api/connect/renew` (TBD endpoint) extends by another 30 min after the 60s ad completes | P0 | portal flow + mikrotik_api.py |
| FR-039 | The portal must be served as a separate React build (or a separate route) from the admin SPA — they have different audiences, security profiles, and bundles. The standalone HTML in `notes/` is the spec | P0 | inferred from existence of standalone bundle |

> **⚠ Spec divergence (action required, see R13):** the admin's "Conexões" screen (`s2.ConnectionsSection`) currently presents a builder for fields like *Telefone WhatsApp* / *Email* / *Faixa etária* — but the shipped portal hardcodes only the 4 anonymizable fields. Decision needed: **(a)** restrict the admin builder to anonymizable fields only (recommended — matches Legal's anonymization mandate), OR **(b)** make the portal render dynamically from `GET /api/connection/form` and gate any addition through Legal/DPO review. **Default recommendation: (a).**

### 4.3 Dashboard (Operator Home)

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-040 | Dashboard shows 4 hero KPIs: "Pessoas atingidas este mês" (with delta %), "Campanhas ativas" (with delta count), "Investimento total" (R$ formatted, with delta %), "Dispositivos online agora" (live) | P0 | s1 DashboardSection lines 9-14 |
| FR-041 | "Conexões por dia" mini-chart over last 7 days; period toggle 7d / 30d | P1 | s1:18-37 |
| FR-042 | "Perfil dos usuários" panel: gender split (% bars) + age-bracket split (% bars) | P1 | s1:43-69 |
| FR-043 | "Campanhas ativas" preview (top 4 rows) with click-to-edit; quick "Criar" button | P1 | s1:74-117 |
| FR-044 | "Conectados agora" live list (top 5) — each user row shows initials avatar, name, gender, age, zone, remaining session time (mm:ss countdown, turns red <5 min) | P0 | s1 LiveUsers, refresh @1s |

### 4.4 Campaign Management

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-050 | List view supports two modes: Cards / Tabela | P1 | s1 CampaignsSection:188-189 |
| FR-051 | Status filter tabs: Todas / Ativas / Pausadas / Encerradas | P1 | s1:203-208 |
| FR-052 | Aggregate KPIs at top: Total de campanhas (with active count), Total de visualizações, Receita gerada, Taxa média de conclusão | P1 | s1:195-200 |
| FR-053 | Campaign card displays: name, location, created date, status pill, video thumbnail, source tag, duration tag, "+30 min acesso" reward tag, KPIs (views, completion %, revenue) | P0 | s1 CampaignCard |
| FR-054 | Campaign actions vary by status: active → Editar / Pausar; paused → Reativar / Dados; ended → Duplicar / Relatório | P0 | s1:291-322 |
| FR-055 | "Nova campanha" modal: name (required), local/bairro (Centro/Zona Norte/Sul/Leste/Geral), duration in seconds (default 30), source (YouTube/Upload) | P0 | s3 NewCampaignModal |
| FR-056 | "Editar campanha" modal: name, local, duration, source, status (Ativa/Pausada/Encerrada) | P0 | s3 CampaignModal |
| FR-057 | Backend exposes full CRUD: `GET/POST/PATCH/DELETE /api/campaigns[/{cid}]` | P0 | backend/main.py:129-160 |
| FR-058 | Toast feedback on every action: "Campanha criada/salva/pausada/reativada/duplicada" | P2 | app.jsx:65-87 |
| FR-059 | Sidebar shows badge with count of campaigns awaiting review (default 3) | P2 | shell.jsx:6 |

### 4.5 User Base / Lead Management

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-070 | List of all leads who connected to network: avatar, name, gender label, phone, email, zone, age, total connections, last connection (relative time) | P0 | s2 UsersSection |
| FR-071 | Search by name OR phone OR email (case-insensitive substring) | P1 | s2:8-12 |
| FR-072 | Filter by Zona (Todos / Centro / Zona Norte / Sul / Leste) | P1 | s2:52-58 |
| FR-073 | Aggregate KPIs: Total cadastrados, Online agora, Idade média, % público feminino | P1 | s2:33-37 |
| FR-074 | Export to CSV button | P1 | s2:29 |
| FR-075 | "Live users" companion list (different view) — endpoint `GET /api/users/live` | P1 | data.jsx, backend |
| FR-076 | LGPD: lead data must be deletable on request (implied by Reports KPI "LGPD Compliance OK"; concrete erasure UX TBD) | P0 | gap |

### 4.6 Wi-Fi Online (Device Fleet)

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-080 | Aggregate KPIs: Equipamentos online, Equipamentos offline (alert), Dispositivos conectados, Banda em uso (Mb/s upload) | P0 | s2 WifiSection:122-127 |
| FR-081 | Per-device card (online): name, status pill (verde), IP, MAC, CPU%, RAM%, users count, ↑ Mb/s, ↓ Mb/s | P0 | s2 DeviceCard:138-158 |
| FR-082 | Per-device card (offline): name, status pill (vermelho), IP, MAC, "Última vez visto: {relative time}", "Sem conexão" | P0 | s2:161-167 |
| FR-083 | CPU bar color: <60% green, 60-74% warn, ≥75% danger | P1 | s2:137 |
| FR-084 | Manual "Atualizar" button refreshes device status (`POST /api/devices/{did}/refresh`) | P1 | backend/main.py:237 |
| FR-085 | Sidebar badge shows online-device count (warn-styled if any offline) | P1 | shell.jsx:10 |

### 4.7 Conexões (Connection-Form Configuration Screen)

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-090 | Admin screen with two cards: (a) form preview/builder, (b) MikroTik connection config | P0 | s2 ConnectionsSection |
| FR-091 | MikroTik config: IP (default 192.168.88.1), API Port (default 8728), API user, API password (masked), Session minutes (default 30) | P0 | s2:277-300 + data.jsx |
| FR-092 | Status badges: "Hotspot ativo", "Redirect: {ip}", "{n}min/sessão" | P1 | s2:301-305 |
| FR-093 | Form-config endpoint: `GET /api/connection/form` returns `{fields[], mikrotik{}}` | P0 | backend/main.py:288 |

### 4.8 Notificações & Alertas

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-100 | Notification rules: each rule has channel (WhatsApp / Email), trigger title, description, active toggle | P0 | s2 NotificationsSection, data.jsx `notifRules` |
| FR-101 | Out-of-the-box rules (defaults): "Expiração de acesso" (WhatsApp, 5 min before), "Relatório diário" (Email, 20h), "Equipamento offline" (WhatsApp, immediate), "Nova campanha disponível" (Email) | P1 | data.jsx:88-93 |
| FR-102 | Notification groups: Anunciantes, Operação, Comercial — each has name, member count, description | P1 | data.jsx:94-98 |
| FR-103 | Toggle a rule via `PATCH /api/notifications/rules/{rid}` | P1 | backend/main.py:257 |
| FR-104 | "Nova regra" creation flow (UI button present; full flow TBD) | P2 | s2:328 |

### 4.9 Relatórios

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-110 | List of generated reports: name, date, type (PDF / Planilha / CSV), size, actions (Baixar / Enviar) | P0 | s3 ReportsSection |
| FR-111 | KPI strip: count of reports, generation frequency (Diário/auto), recipients count, LGPD-compliance status | P1 | s3:16-21 |
| FR-112 | "Gerar relatório" on-demand button | P1 | s3:13 |
| FR-113 | Reports may be emailed directly to recipients (Mail action) | P2 | s3:44 |
| FR-114 | Sample report types observed: connection logs (PDF), ROI per campaign (PDF), demographics (Planilha), MikroTik logs (CSV) | reference | data.jsx `reports` |

### 4.10 Monetização

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-120 | Operator picks one of 4 monetization plans: Por visualização (CPV), Por pacote de tempo, Híbrido (view + tempo), Plano fixo mensal | P0 | s3 MonetizationSection, data.jsx `monetization` |
| FR-121 | Pricing fields are configurable per plan: CPV (R$/view, default 0.20), Pacote 10h Wi-Fi (R$, default 50), Mensalidade (R$, default 299) | P0 | s3:60, 100-115 |
| FR-122 | Plan changes do not retroactively affect campaigns in flight ("campanhas em andamento mantêm o modelo original") | P1 | s3:78 |
| FR-123 | Currency formatting must follow pt-BR (R$, comma decimal, dot thousands) | P1 | UI.fmtBRL helper |

### 4.11 Configurações da Conta

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-130 | Empresa card: Razão social, CNPJ, Email de contato | P1 | s3 ConfigSection:142-157 |
| FR-131 | Integrações card with 4 connectors and live status: WhatsApp Business API, SMTP transactional email, MikroTik RouterOS API (multi-device aggregate status), YouTube Data API | P0 | s3:160-194 |
| FR-132 | Preferências card: Notificações no navegador (toggle) | P2 | s3:200-211 |

### 4.12 UI Personalization (Tweaks Panel)

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-140 | Theme toggle: Escuro / Claro | P2 | app.jsx:194-203 |
| FR-141 | Density: Compacta / Normal / Espaçada | P2 | app.jsx:184-192 |
| FR-142 | Mobile navigation pattern: Drawer / Bottom tabs (BOTTOM_TABS subset = Início, Campanhas, Wi-Fi, Usuários, Avisos) | P1 | app.jsx:174-182, shell.jsx:22-28 |
| FR-143 | Custom accent color (hex) | P3 | app.jsx:204-208 |

### 4.13 Cross-Cutting

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-150 | Topbar shows: section title (TITLES map), live online-users count, "Exportar" button, "Nova campanha" CTA | P1 | shell.jsx Topbar |
| FR-151 | User dropdown: Meu perfil, Preferências, Sair | P1 | shell.jsx:153-170 |
| FR-152 | Toast system for action feedback (UI.useToast) | P1 | ui.jsx |
| FR-153 | Empty states with icon + title + description | P2 | UI.EmptyState |
| FR-154 | All sections must function offline-from-server with mock fallback (700ms per-call timeout, then mocks) | P1 | data.jsx tryFetch |

---

## 5. Non-Functional Requirements

| ID | Requirement | Type | Priority | Source |
|---|---|---|---|---|
| NFR-001 | Backend handles requests asynchronously (FastAPI `async`) | Performance | P0 | kickoff |
| NFR-002 | All entity payloads validated by Pydantic models | Maintainability | P1 | kickoff TD-01 |
| NFR-003 | Database changes versioned & reversible (Alembic) | Maintainability | P0 | kickoff TD-04 |
| NFR-004 | All UI strings in pt-BR (admin panel + captive portal) | Localization | P0 | kickoff + every component |
| NFR-005 | **LGPD compliance — APPROVED by Legal Department on 2026-05-03**, *conditional on anonymization of critical user information*. Concretely: (a) the captive portal MUST NOT collect directly-identifying PII (no phone, email, CPF, last name, exact birthdate, MAC visible to user) — only first/given name + categorical demographics (age band, gender, neighborhood); (b) explicit consent ("Aceito… conforme a LGPD.") required at every capture; (c) the `mac_address` and `ip_address` stored on `Session` / `ConnectionLog` must be hashed/pseudonymized at rest and rotated per LGPD-aligned retention policy; (d) deletion-on-request flow exposed via `DELETE /api/users/{lead_id}`; (e) audit trail for admin actions affecting lead data. The Reports screen's "LGPD OK" badge is now a real signal, not aspirational | Compliance | P0 | s3 Reports KPI + Legal-Dept sign-off 2026-05-03 + portal:148-227 |
| NFR-006 | Lead phone formatted/validated as Brazilian mobile `(NN) NNNNN-NNNN` | Localization | P0 | s2:184 |
| NFR-007 | Currency rendered as pt-BR (R$, comma decimal) | Localization | P1 | UI.fmtBRL |
| NFR-008 | Timestamps stored UTC; displayed in `America/Sao_Paulo` | Localization | P1 | inferred |
| NFR-009 | Captive portal must load fast on mobile cellular fallback (lead drops off if portal lags). Target p95 TBD | Performance | P1 | inferred |
| NFR-010 | Frontend gracefully degrades when backend is unreachable (700 ms per-endpoint timeout → mock fallback) | Reliability | P1 | data.jsx |
| NFR-011 | Sessions secure: token-based, 7-day TTL, HTTPS-only, password ≥ 6 chars (currently a weak floor — see R5) | Security | P0 | login.jsx |
| NFR-012 | API auto-documentation via FastAPI OpenAPI/Swagger | Maintainability | P2 | TD-01 implication |
| NFR-013 | Multi-device fleet support: hundreds of MikroTik devices per operator (scale target TBD) | Scalability | P1 | inferred |
| NFR-014 | Connection logs are append-heavy and grow continuously — schema must support partitioning by date | Scalability | P1 | inferred |
| NFR-015 | Audit logging for admin-panel actions (create/edit/delete campaign, toggle rule) | Auditability | P2 | LGPD-aligned |
| NFR-016 | Three role tiers must be enforced server-side, not just UI-hidden | Security | P0 | shell.jsx role labels |
| NFR-017 | **Multi-tenant data isolation:** every query against operator-owned tables MUST filter by the active request's `organization_id`. Implementation: PostgreSQL Row-Level Security policies + SQLAlchemy session-level `set_config('app.organization_id', …)` (or equivalent ORM hook) so that a forgotten `WHERE` clause cannot leak across tenants. Applies to ALL tables with `organization_id` (Lead, Campaign, Device, Venue, Session, ConnectionLog, NotificationRule, NotificationGroup, Report, AuditLog, etc.) | Security | P0 | BD-08, TD-08 |
| NFR-018 | **Tenant context middleware** at the FastAPI layer: every authenticated request must establish a tenant context derived from the auth token's `organization_id` (and subdomain match for defense-in-depth). Public/portal endpoints (`/api/connect`, `/api/portal/bootstrap`) derive tenant from the venue/device path parameter. | Security | P0 | TD-08, TD-09 |
| NFR-019 | **Per-tenant configuration of integrations** — each `Organization` carries its own WhatsApp Business credentials, SMTP config, YouTube API key, MikroTik device pool, monetization plan + pricing, branding, custom legal text. No shared/global integration credentials in production. | Architecture | P0 | s3 ConfigSection (Integrações + Empresa) re-scoped to per-tenant |
| NFR-020 | **Tenant onboarding/provisioning flow** — new operator signs up (or is provisioned by platform sales), platform creates their `Organization` row + initial admin user + default branding/notification rules + monetization-plan default. The "Solicitar acesso" link on login (currently a commercial-team handoff stub) graduates to a real signup form. | Architecture | P1 | login.jsx:186 stub |
| NFR-021 | **Tenant offboarding / data export** — when an operator leaves, the platform must (a) export all their data in machine-readable form (CSV/JSON), (b) hard-delete or fully anonymize all their leads/sessions/logs per LGPD article 18 right of erasure, (c) revoke MikroTik integrations gracefully. | Compliance | P1 | LGPD article 18 + BD-08 lifecycle |
| NFR-022 | **Per-tenant rate limiting** to prevent noisy-neighbor scenarios — one tenant with 10k devices polling telemetry must not starve another tenant's API budget. | Performance | P2 | scale implication |
| NFR-023 | **LGPD data-controller posture:** each operator (`Organization`) is the LGPD *data controller* for their own captive-portal leads. The platform is the *data processor* (or sub-processor for further integrations like SMTP/WhatsApp). Per-tenant DPA (Data Processing Agreement) required at signup. | Compliance | P0 | LGPD multi-controller posture for SaaS |

---

## 6. Data / Schema Requirements

> All entities below are evidenced by mock data in `data.jsx` and/or backend usage. Field names and types are extracted directly.

### 6.1 Core Entities

#### `User` (Admin Panel User)
- `id`, `email`, `password_hash`, `name`, `role` (`admin` | `advertiser` | `viewer`), `created_at`, `last_login_at`
- Source: `data.jsx` mock accounts (lines 178-182), `shell.jsx` role labels (40-46)

#### `Campaign`
- `id`, `name` (str), `location` (str — bairro), `created` (date — pt-BR format `dd/mm/yyyy`), `duration` (int — seconds), `source` (`YouTube` | `Upload`), `views` (int), `completion` (int — %), `revenue` (decimal — R$), `status` (`active` | `paused` | `ended`)
- Optional / inferred for production: `organization_id`, `video_url_or_asset_ref`, `start_date`, `end_date`, `monetization_plan_id`, `target_age_brackets[]`, `target_zones[]`, `creative_thumbnail_ref`
- Source: `data.jsx:30-61`, modals at `s3.CampaignModal`, `s3.NewCampaignModal`

#### `Lead` (End-User who connected) — **anonymization-first model (v1.1)**
- **Captured at portal (minimal, anonymizable):** `id` (UUID), `first_name` (free text — no surname), `age_band` (`18-24` | `25-34` | `35-50` | `50+`), `gender` (`Feminino` | `Masculino` | `Prefiro não informar`), `neighborhood` (`Centro` | `Zona Norte` | `Zona Sul` | `Zona Leste` | `Zona Oeste` | `Praia`), `created_at`, `last_connection_at`, `connections` (int — cumulative count)
- **LGPD ledger (separate table, see `ConsentRecord`):** `consent_at`, `consent_text_version`, `consent_ip` (hashed), `consent_user_agent`
- **Pseudonymized join keys (NOT raw PII):** `mac_hash` (sha256 of MAC + venue salt, rotated per retention policy) — NOT raw MAC
- **DEPRECATED in v1.1 (do not collect via portal):** `phone`, `email`, `cpf`, `birthdate`, `last_name`, raw `mac_address`. The mock data in `data.jsx:111-119` shows these for development scaffolding only — production schema must omit them or gate them behind a Legal-approved exception flow (see FR-039 callout and R13)
- Source: portal:148-212 (canonical fields), `data.jsx:111-119` (legacy mock — superseded), Legal-Dept sign-off 2026-05-03

#### `Session` / `ConnectionLog`
- `id`, `lead_id`, `device_id`, `mac_address`, `ip_address`, `started_at`, `ended_at`, `remaining_seconds` (live), `campaign_id` (which video shown), `bytes_in`, `bytes_out`
- Source: `data.jsx:62-69` `liveUsers` (ephemeral live view), `backend POST /api/connect`

#### `MikroTikDevice`
- `id`, `name` (e.g. "MikroTik hAP ac² — Praça Central"), `ip`, `mac`, `model`, `cpu` (%), `ram` (%), `users` (count), `up` (Mb/s), `down` (Mb/s), `status` (`online` | `offline`), `last_seen_at`, `firmware_version` (TBD)
- Connection params: `api_port` (default 8728), `api_user`, `api_password_ref`, `default_session_minutes` (30)
- Source: `data.jsx:70-87`, `s2 DeviceCard`, `s2 ConnectionsSection`

#### `MonetizationPlan` (catalog)
- `id` (`view` | `time` | `hybrid` | `fixed`), `icon`, `name`, `desc`
- Pricing override per operator: `cpv_brl`, `hour_pack_brl`, `monthly_brl`
- Source: `data.jsx:99-104`, `s3 MonetizationSection`

#### `NotificationRule`
- `id`, `channel` (`WhatsApp` | `Email`), `icon`, `title`, `desc`, `active` (bool)
- Source: `data.jsx:88-93`

#### `NotificationGroup`
- `id`, `name`, `members` (count), `desc` — referenced by rules for dispatch fan-out
- Source: `data.jsx:94-98`

#### `Report`
- `id`, `name`, `date`, `size` (humanized), `type` (`PDF` | `Planilha` | `CSV`), `recipients` (TBD)
- Source: `data.jsx:105-110`

#### `Organization` / `Tenant` (operator account) — **first-class entity in v1.2 (multi-tenant SaaS)**
- **Identity:** `id` (UUID), `slug` (subdomain — e.g., `acme` → `acme.mktwifi.com.br`), `razao_social`, `cnpj` (BR tax ID, unique), `contact_email`, `created_at`, `provisioned_by` (platform sales user id, nullable for self-signup)
- **Lifecycle:** `status` (`trial` | `active` | `suspended` | `offboarding` | `terminated`), `trial_ends_at`, `suspended_reason`, `offboarding_data_export_url`, `offboarding_completed_at`
- **Branding:** `logo_url`, `primary_color`, `secondary_color`, `custom_domain` (optional, e.g. `wifi.acme.com.br`), `legal_text_terms_url`, `legal_text_privacy_url`
- **Monetization:** `monetization_plan_id` (FK → `MonetizationPlan` catalog), `pricing` (jsonb: `{cpv_brl, hour_pack_brl, monthly_brl}`)
- **Integrations (per-tenant — NFR-019):** `whatsapp_business_credentials_ref`, `whatsapp_sender_phone`, `smtp_config_ref`, `youtube_api_key_ref`, `mikrotik_credential_pool_ref`
- **LGPD posture (NFR-023):** `dpa_version` (which Data Processing Agreement they accepted), `dpa_accepted_at`, `dpo_contact_email` (the operator's own DPO, since they are data controller for their leads)
- **Limits / billing (TBD by Q22):** `max_venues`, `max_devices`, `max_active_campaigns`, `billing_cycle`, `billing_account_ref`
- Source: `s3 ConfigSection` (Empresa + Integrações cards) re-scoped + BD-08 + NFR-017..023

> **Every operator-owned table carries `organization_id` (UUID, NOT NULL, indexed, FK with ON DELETE RESTRICT) and is filtered by RLS / ORM hook (NFR-017).** Tables: `User`, `Venue`, `MikroTikDevice`, `Campaign`, `Lead`, `Session`, `ConnectionLog`, `ConsentRecord`, `NotificationRule`, `NotificationGroup`, `Report`, `AuditLog`. The only tables WITHOUT `organization_id` are platform-global catalogs (`MonetizationPlan` catalog) and the `Organization` table itself.

#### `ConsentRecord` (LGPD ledger)
- `id`, `lead_id`, `consent_text_version`, `accepted_at`, `ip_address`, `user_agent`
- Source: NFR-005 implication

#### `AuditLog`
- `id`, `user_id`, `action`, `target_entity`, `target_id`, `payload_json`, `created_at`
- Source: NFR-015 implication

### 6.2 Schema Notes

- **Multi-tenancy: shared-DB with row-level isolation (TD-08).** Every operator-owned table has `organization_id UUID NOT NULL` indexed and FK-referenced. Use PostgreSQL RLS policies; set `app.organization_id` per session via SQLAlchemy event hook. Tested via a "tenant leakage" integration test: queries from tenant A must return zero rows from tenant B even with explicit `WHERE` bypass attempts.
- **(v1.1) `Lead` is anonymization-first per Legal sign-off** — directly-identifying fields (phone/email/cpf/last name/raw MAC) are out of the portal path. Any reintroduction requires Legal/DPO review.
- `ConnectionLog.mac_address` must be stored as `mac_hash` (sha256 with per-venue salt) rather than raw, with the salt rotated on a Legal-approved cadence to make long-term re-identification infeasible.
- `ConnectionLog` is the highest-volume table → partition by `started_at` (monthly) and create a hot/cold split for analytics.
- LGPD retention: define explicit TTLs per table — `Lead`, `ConnectionLog`, `ConsentRecord`, `AuditLog`. After TTL, hard-delete or further anonymize (drop `first_name`, keep aggregates only). Default proposal pending Legal: 12 months hot, 36 months aggregated, then purge.
- Currency: store as integer cents to avoid floating-point error.
- Pt-BR phone normalization (only for admin users, NOT leads): store as E.164 (`+55119...`) and display as `(NN) NNNNN-NNNN`.

---

## 7. Architecture

### 7.1 High-Level Diagram

```
                       ┌──────────────────────────────┐
                       │   End-User Mobile / Laptop   │
                       │   (associates to Wi-Fi SSID) │
                       └──────────────┬───────────────┘
                                      │ HTTP intercept
                                      ▼
                       ┌──────────────────────────────┐
                       │   MikroTik AP / RouterOS     │
                       │   Hotspot mode, redirect to  │
                       │   captive portal URL         │
                       └──────┬───────────────┬───────┘
                              │               │
                  Captive     │               │ RouterOS API (port 8728)
                  Portal URL  │               │ (authorize MAC, fetch telemetry)
                              ▼               ▼
   ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐
   │  Admin Browser  │  │  Captive     │  │  MikroTik Adapter    │
   │  React SPA      │  │  Portal SPA  │  │  (mikrotik_api.py)   │
   │  (admin panel)  │  │  (React)     │  │                      │
   └────────┬────────┘  └──────┬───────┘  └──────────┬───────────┘
            │                  │                     │
            │  HTTPS / JSON    │ POST /api/connect   │
            ▼                  ▼                     ▼
  ┌──────────────────────────────────────────────────────────┐
  │           FastAPI Backend (backend/main.py)              │
  │  /api/auth/*    /api/campaigns    /api/connect           │
  │  /api/users     /api/devices      /api/notifications/*   │
  │  /api/kpis      /api/monetization /api/reports           │
  │  /api/connection/form    /api/demographics ...           │
  └────────────────────────────┬─────────────────────────────┘
                               │
              SQLAlchemy + Alembic (db.py)
                               │
                               ▼
                   ┌────────────────────┐       ┌──────────────────────┐
                   │     PostgreSQL     │       │  Notifications       │
                   │  Alembic migrations│       │  Dispatcher          │
                   │  Partition logs    │       │  (notifications.py)  │
                   └────────────────────┘       │  → WhatsApp Business │
                                                │  → SMTP              │
                                                └──────────────────────┘
                                                         │
                                                         ▼
                                                 External providers:
                                                  WhatsApp Business API
                                                  SMTP (e.g. smtp.gmail.com:587)
                                                  YouTube Data API
```

### 7.2 Components

| Component | Tech | Responsibility | Path |
|---|---|---|---|
| Admin Panel SPA | React (single-file bundled prototype; production build TBD) | Operator UI, all admin sections | `mkt-wifi-frontend/frontend/` |
| Captive Portal SPA | React | End-user splash, video playback, lead form, consent | inferred — likely a separate route/build |
| API Backend | FastAPI (Python, async) | All `/api/*` endpoints | `backend/main.py` |
| MikroTik Adapter | Python | RouterOS API client (port 8728), authorize MAC, fetch telemetry | `backend/mikrotik_api.py` |
| Notifications Dispatcher | Python | Fan-out to WhatsApp / Email per rule | `backend/notifications.py` |
| DB Layer | SQLAlchemy + Alembic | ORM, migrations | `backend/db.py` |
| Database | PostgreSQL | Persistent storage | (configured via docker-compose) |
| Container Runtime | Docker / docker-compose | Local + dev deployment | `backend/Dockerfile`, `docker-compose.yml` |
| Object Storage | TBD (S3/MinIO/local) | Uploaded campaign creatives — **partitioned per tenant** (path prefix `org/{organization_id}/…`) | gap |
| Cache / Queue | TBD (Redis recommended) | Live-session cache, async jobs (notifications, telemetry polling, report generation) — **keys namespaced by `organization_id`** | gap |
| **Tenant Resolution Middleware** | FastAPI dependency | Resolves `organization_id` for every request (admin: subdomain + JWT; portal: venue/device path lookup); sets DB session var for RLS | NFR-018 |
| **Tenant Provisioning Service** | FastAPI module | Self-signup flow (`/api/signup`), platform-sales-driven provisioning, DPA acceptance, default seeding (admin user, branding, notification rules, monetization plan) | NFR-020 |
| **Tenant Offboarding Service** | FastAPI module + worker | Data export (CSV/JSON), LGPD-compliant erasure, integration teardown | NFR-021 |
| YouTube Data API | External | Metadata for YouTube-sourced campaigns | s3 ConfigSection |
| WhatsApp Business API | External | Outbound notifications | s3 ConfigSection |
| SMTP Provider | External | Transactional email | s3 ConfigSection |

### 7.3 Captive-Portal Authentication Flow (v1.1 — verified against portal prototype + backend)

```
1.  End-user associates to MikroTik-managed open Wi-Fi (SSID: MKT_WiFi_{venue})
2.  MikroTik intercepts HTTP, redirects to captive-portal URL with query
    params { venue_id, device_id, mac_hash }
3.  Portal Step 1 (ConnectingScreen): 3.1s scripted reassurance UI
    Background: portal calls GET /api/portal/bootstrap?venue_id=…
      → returns { venue_name, branding, current_campaign_id, advertiser, slogan, ad_seconds }
4.  Portal Step 2 (FormScreen): user submits 4 fields + LGPD consent
    → POST /api/connect {
         venue_id, device_id, mac_hash, campaign_id,
         lead: { first_name, age_band, gender, neighborhood },
         consent: { accepted_at, terms_version }
       }
5.  Backend persists:
       Lead       (anonymized — see §6.1)
       ConsentRecord (immutable LGPD ledger)
       Session    (status=pending_ad, mac_hash, expires_at=null)
    Returns 200 { session_id, redirect_to_ad: true }
    NOTE: backend does NOT yet authorize the MAC — gating is on ad completion.
6.  Portal Step 3 (AdScreen): plays ad for 30s, non-skippable.
    On completion: POST /api/sessions/{session_id}/ad-complete
      → backend sets Session.expires_at = now() + 30min
      → backend calls MikroTik adapter to authorize mac_hash for 30 min
      → returns 200 { expires_at, remaining_seconds: 1800 }
7.  Portal Step 4 (ConnectedScreen): client-side 30-min countdown.
    User can close the tab; MikroTik allows traffic until expires_at.
8.  Backend writes ConnectionLog rows from MikroTik telemetry; admin
    Dashboard "Conectados agora" surfaces them via GET /api/users/live.
9.  5 min before expiry, NotificationRule "Expiração de acesso" fires
    (channel: WhatsApp — but portal collects no phone, so this rule
    targets the operator's notification group, not the end-user — see Q17)
10. On expiry, MikroTik revokes mac_hash. If the user reopens the portal:
    Portal Step 5 (RenewScreen) → POST /api/sessions/{session_id}/renew
      → backend returns ad metadata with ad_seconds=60
      → portal goes back to Step 3 with adLength=60
      → on completion → +30 min, loop to Step 4
```

**Endpoints needing backend implementation (v1.1):**
- `GET /api/portal/bootstrap` — returns venue branding + active campaign creative + ad seconds
- `POST /api/sessions/{session_id}/ad-complete` — split out from current monolithic `/api/connect`
- `POST /api/sessions/{session_id}/renew` — initiate renewal flow

---

## 8. API Contract (verified)

> All endpoints below are from `backend/main.py`. Their existence is confirmed; full request/response schemas should be locked via Pydantic models and OpenAPI export.

| Method | Path | Purpose | Status |
|---|---|---|---|
| POST | `/api/auth/login` | Login (returns `{ok, token, user}`) | Implemented |
| POST | `/api/auth/logout` | Logout | Implemented |
| GET | `/api/kpis` | Dashboard hero KPIs | Implemented |
| GET | `/api/connections/weekly` | 7-day connection time series | Implemented |
| GET | `/api/demographics` | Gender + age-bracket breakdowns | Implemented |
| GET | `/api/campaigns` | List campaigns | Implemented |
| POST | `/api/campaigns` | Create campaign (201) | Implemented |
| PATCH | `/api/campaigns/{cid}` | Update campaign (status, name, ...) | Implemented |
| DELETE | `/api/campaigns/{cid}` | Delete campaign (204) | Implemented |
| GET | `/api/users` | List leads | Implemented |
| GET | `/api/users/live` | Currently-connected leads (live) | Implemented |
| POST | `/api/connect` | **Captive-portal lead submission + MAC authorization** | Implemented |
| GET | `/api/devices` | List MikroTik devices with status | Implemented |
| POST | `/api/devices/{did}/refresh` | Force-refresh device status | Implemented |
| GET | `/api/notifications/rules` | List notification rules | Implemented |
| PATCH | `/api/notifications/rules/{rid}` | Toggle/update rule | Implemented |
| GET | `/api/notifications/groups` | List notification groups | Implemented |
| GET | `/api/monetization` | List/get monetization plans + pricing | Implemented |
| GET | `/api/reports` | List generated reports | Implemented |
| GET | `/api/connection/form` | Captive-portal field config + MikroTik params | Implemented |
| GET | `/` | Backend health/landing | Implemented |

**Gaps to add (P0/P1):**

| Method | Path | Purpose | Why missing |
|---|---|---|---|
| POST | `/api/auth/forgot` | Password reset email | UI exists (login.jsx forgot tab); backend stub |
| POST | `/api/auth/reset` | Password reset confirmation | Pair with above |
| GET/PUT | `/api/me` | Self-profile read/update | "Meu perfil" menu item |
| GET/POST/PATCH/DELETE | `/api/devices` (full CRUD) | Currently only GET + refresh | Need to add devices |
| POST | `/api/notifications/rules` | Create new rule | "Nova regra" button has no backend |
| DELETE | `/api/notifications/rules/{rid}` | Delete rule | Symmetry |
| GET | `/api/users/{lead_id}` | Lead detail + session history | Drill-down chevron in users table |
| DELETE | `/api/users/{lead_id}` | LGPD erasure | Compliance requirement (NFR-005) |
| GET | `/api/users/export` | CSV export | "Exportar CSV" button has no backend |
| POST | `/api/reports/generate` | On-demand report generation | "Gerar relatório" button |
| GET | `/api/reports/{rid}/download` | Download report file | Baixar action |
| POST | `/api/reports/{rid}/send` | Email report to recipients | Enviar action |
| POST | `/api/campaigns/{cid}/asset` | Upload video file | Upload source needs binary endpoint |
| PATCH | `/api/connection/form` | Save form-config edits | "Salvar" button on Conexões screen |
| PATCH | `/api/monetization` | Save monetization-plan choice + pricing | "Salvar modelo" button |
| GET/PATCH | `/api/organization` | Razão social / CNPJ / contact | Configurações screen |
| POST | `/api/auth/sso/google`, `/api/auth/sso/microsoft` | SSO callback | Currently "em breve" |

---

## 9. UX / Screen Inventory (verified from prototype)

### 9.1 Admin Panel — Sidebar Navigation

| Section | Item | id | Route Goal | Source |
|---|---|---|---|---|
| **Principal** | Dashboard | `dashboard` | Hero KPIs + charts + active campaigns + live users | `s1.DashboardSection` |
| **Principal** | Campanhas (badge: 3) | `campanhas` | CRUD + filtering + cards/table view | `s1.CampaignsSection` |
| **Principal** | Usuários | `usuarios` | Lead base, search/filter, export | `s2.UsersSection` |
| **Operação** | Wi-Fi Online (badge: 12 warn) | `wifi` | Device fleet status | `s2.WifiSection` |
| **Operação** | Conexões | `conexoes` | Captive-portal form + MikroTik config | `s2.ConnectionsSection` |
| **Operação** | Notificações | `notificacoes` | Rules + groups | `s2.NotificationsSection` |
| **Configuração** | Relatórios | `relatorios` | Reports list + generate/download/email | `s3.ReportsSection` |
| **Configuração** | Monetização | `monetizacao` | Plan selector + pricing | `s3.MonetizationSection` |
| **Configuração** | Configurações | `config` | Empresa + Integrações + Preferências | `s3.ConfigSection` |

### 9.2 Mobile Bottom Tabs (subset of 5)

`Início (dashboard)` · `Campanhas` · `Wi-Fi` · `Usuários` · `Avisos (notificacoes)`

### 9.3 Modals / Overlays

- **Login** screen (gate)
- **Forgot password** (tab on login)
- **Edit Campaign** modal (`s3.CampaignModal`)
- **New Campaign** modal (`s3.NewCampaignModal`)
- **User menu** dropdown (Meu perfil / Preferências / Sair)
- **Tweaks panel** (theme, density, mobile-nav, accent — design-tools, ship-or-strip TBD)

### 9.4 End-User (Captive Portal) — verified 5-screen flow (v1.1)

> Source: `0e073557-…js` decoded from `MKT WiFi - Captive Portal _standalone_.html`. Hosted in an iOS device frame for design review (see `81c7033c-…jsx` `iOS.jsx`) inside a Figma-like canvas (see `7567c069-…jsx` `DesignCanvas`).

| # | Screen | Component | Auto-advance? | Key elements |
|---|---|---|---|---|
| 1 | Connecting splash | `ConnectingScreen` | yes (~3.1s) | Brand logo, animated radar, 3 sequenced messages, dot indicator |
| 2 | Registration form | `FormScreen` | no | Venue pill, headline "Acesso liberado em 30 minutos.", 4 fields (Nome / Idade / Gênero / Bairro), LGPD consent checkbox, "Continuar →", privacy reassurance copy |
| 3 | Ad video | `AdScreen` | yes (timer-driven, 30s or 60s) | Black video frame, `ANÚNCIO` badge, mute toggle, advertiser name + slogan overlay, MM:SS countdown, progress bar, "Não é possível pular o anúncio" |
| 4 | Connected | `ConnectedScreen` | yes (timer-driven, 30 min) | Green ✓ badge, "Aproveite, {firstName}!", 200×200 circular SVG countdown, info card explaining renewal |
| 5 | Renew | `RenewScreen` | no | Clock icon, "Seu tempo acabou.", stat grid (60s / 30 min), "Assistir e renovar" CTA → loops to step 3 with `adLength = 60` |

**Out-of-scope for portal v1:** payment screen, account/profile screen, password change. The portal is a single-flow gate; all admin-side concerns live in the admin SPA.

---

## 10. Roles & Permissions

| Role (id / pt-BR) | Description | Inferred Capabilities |
|---|---|---|
| `admin` / **Administrador** | Operator's owner/superuser | Full CRUD on campaigns, devices, leads, monetization, integrations, organization settings |
| `advertiser` / **Anunciante** | External advertiser self-service | Sees own campaigns, KPIs, reports; cannot edit devices, monetization, organization |
| `viewer` / **Visualizador** | Read-only stakeholder (e.g., partner, auditor) | Reads dashboards/reports; no mutations |

> **Per NFR-016, role enforcement must be server-side.** The frontend mock auth labels are not sufficient; backend must check role on every mutating endpoint.

---

## 11. Integrations

| Integration | Purpose | Status in Prototype | Required Env / Secrets |
|---|---|---|---|
| **MikroTik RouterOS API** | Authorize MAC, push hotspot config, pull telemetry | "● Conectado" (multi-device) | per-device IP, port (8728), user, password |
| **WhatsApp Business API** | Outbound notifications (expiry, alerts, campaigns) | "● Conectado" / `+55 11 99999-0000` | API token, sender phone |
| **SMTP (transactional email)** | Reset password, daily reports, group notifications | "● Conectado" / `smtp.gmail.com:587` | host, port, user, password |
| **YouTube Data API** | Import video metadata for campaigns sourced from YouTube | "● Conectado" | API key |
| **SSO Google** | Login | "em breve" (button stub) | OAuth client id/secret |
| **SSO Microsoft** | Login | "em breve" (button stub) | OAuth/Azure AD app |

---

## 12. Action Items (Next Steps)

> Owners are TBD until the project lead and team roster are confirmed (Q1, Q2).

### Immediate (this week — 2026-05-04 → 2026-05-10)

- [ ] **TBD** — Reconcile this document with the scaffolded code in `backend/` and `mkt-wifi-frontend/`. Identify drift.
- [ ] **TBD** — Confirm/name stakeholders: project lead, product owner, backend lead, frontend lead, designer, legal/DPO.
- [ ] **TBD** — Set the project deadline and milestone schedule (v1 GA target).
- [ ] **TBD** — Decide multi-tenancy strategy (single-tenant per deploy vs SaaS multi-tenant) — affects every entity's `organization_id`.

### Short-term (next 2 weeks — 2026-05-11 → 2026-05-24)

- [ ] **TBD — Backend** — Verify MikroTik integration POC against a real device (RouterOS API on port 8728); confirm `mikrotik_api.py` works end-to-end.
- [ ] **TBD — Backend** — Implement Pydantic models for every entity in §6; lock OpenAPI schema.
- [ ] **TBD — Backend** — Author Alembic baseline migration covering all entities in §6.1.
- [ ] **TBD — Backend** — Plug the API gaps in §8 (forgot password, full CRUD, exports, generate/download/send report, etc.).
- [ ] **TBD — Backend** — Add server-side role enforcement (NFR-016).
- [ ] **TBD — Legal** — LGPD plan: PII inventory, consent text & versioning, retention policy, erasure SLA, DPO contact.
- [ ] **TBD — Frontend** — Decide production build pipeline (Vite/CRA/Next) — current is single-file Babel standalone (prototype-grade).
- [ ] **TBD — Frontend** — Split admin SPA from captive-portal SPA (different audiences, different deploy targets).
- [ ] **TBD — DevOps** — Set hosting target (AWS / GCP / on-prem); evaluate `backend/docker-compose.yml` for production hardening.
- [ ] **TBD — DevOps** — Choose object storage (uploaded campaign creatives) and async runtime (Celery/RQ/APScheduler).

### Mid-term (next 4-8 weeks)

- [ ] **TBD** — SSO Google + Microsoft (currently "em breve" stubs).
- [ ] **TBD** — Captive portal UI build (currently only the *config* screen exists in admin; the actual end-user splash needs implementation).
- [ ] **TBD** — Report-generator pipeline (PDF + Planilha + CSV outputs).
- [ ] **TBD** — Audit logging (NFR-015).
- [ ] **TBD** — Production observability: metrics, logs, alerting (currently only in-app notifications).

---

## 13. Blockers & Risks

| # | Type | Description | Probability | Impact | Mitigation |
|---|---|---|---|---|---|
| ~~R1~~ | ~~Risk~~ | ~~The captive-portal end-user SPA is not in the prototype~~ | ~~HIGH~~ | ~~HIGH~~ | **RESOLVED 2026-05-03** — `MKT WiFi - Captive Portal _standalone_.html` added; 5-step flow specified in §4.2 and §9.4. Implementation work remains, but the UX is locked. |
| R2 | Risk | MikroTik integration depth uncertain — does `mikrotik_api.py` already authorize MACs, or only read status? End-to-end POC needed against real hardware. | HIGH | HIGH | Wk 1-2 hands-on POC with a physical device. |
| ~~R3~~ | ~~Risk~~ | ~~LGPD scope undefined~~ | ~~HIGH~~ | ~~HIGH~~ | **RESOLVED 2026-05-03 (conditional)** — Legal Department approved compliance, *conditional on anonymization of critical user information*. Mandate propagated to NFR-005, `Lead` schema (§6.1), and FR-022/023. **Conditions to satisfy:** portal collects only first name + categoricals; `mac_address` hashed at rest; explicit consent; deletion-on-request endpoint; retention TTLs. Track residual implementation as work, not as risk. |
| R4 | Risk | Password floor is only 6 chars (login.jsx:34) and demo accounts have weak/known passwords. Production must enforce stronger policy + bcrypt/argon2. | HIGH | MEDIUM | Update validation to ≥10 chars + complexity; ensure backend hashes with argon2id. |
| R5 | Risk | The `Campaign` entity has no `start_date`/`end_date` fields in the prototype yet status `"ended"` exists. Time-bounded campaigns need explicit fields. | MEDIUM | MEDIUM | Add fields in baseline schema; default `start = now`, `end = null`. |
| ~~R6~~ | ~~Risk~~ | ~~Multi-tenancy strategy unclear~~ | ~~HIGH~~ | ~~HIGH~~ | **RESOLVED 2026-05-03** — Product Lead confirmed multi-tenant SaaS. Strategy: shared DB + row-level isolation via PostgreSQL RLS + `organization_id` everywhere (TD-08). Subdomain-based tenant resolution for admin SPA; venue/device-based for captive portal (TD-09). Track new derivative risks R15–R17. |
| R7 | Risk | No deadline set; team direction can drift. | MEDIUM | HIGH | Set v1 target in next sync. |
| R8 | Risk | Bundle size: prototype's React SPA is single-file standalone Babel. Production must use a real build tool — but the kickoff doesn't mandate one. | LOW | MEDIUM | Pick Vite for fast DX. |
| R9 | Risk | `ConnectionLog` will dominate DB volume (every Wi-Fi session, every operator). No partitioning plan. | MEDIUM | MEDIUM | Partition by `started_at` monthly; consider hot/cold split for analytics. |
| R10 | Risk | Notifications are advertised in WhatsApp + Email but no provider chosen / billing model defined for WhatsApp Business API costs. | MEDIUM | MEDIUM | Pick a BSP (Twilio, Z-API, Gupshup); price the per-conversation cost into monetization. |
| R11 | Risk | The "Anunciante" (advertiser) self-service flow is implied but not specified — what does an advertiser see on Dashboard, Campaigns, Reports? Scoping gap. | MEDIUM | HIGH | Author an "Anunciante" wireframe spec before backend role enforcement work. |
| R12 | Risk | YouTube Data API quota limits could throttle campaign imports; quota plan needed. | LOW | LOW | Cache video metadata; respect daily quota. |
| R13 | **NEW** | **Admin↔Portal form-config divergence** (see FR-039 callout). Admin's `s2.ConnectionsSection` builder allows configuring fields like *Telefone WhatsApp* / *Email* / *Faixa etária*, but the shipped portal hardcodes the 4 anonymizable fields. Either the builder is misleading or the portal is incomplete — and Legal's anonymization mandate constrains the answer. | HIGH | HIGH | Decide between: (a) restrict admin builder to anonymizable fields only (recommended), or (b) make the portal render dynamically from `GET /api/connection/form` with Legal/DPO gating on any non-default field. |
| R14 | **NEW** | Notification rule "Expiração de acesso" defaults to channel WhatsApp targeting the end-user — but the anonymized portal has no phone. The rule must either retarget the operator's notification group, or be disabled for end-users by default. | MEDIUM | MEDIUM | Update default `notifRules` seed; confirm UX with Product. |
| R15 | **NEW (v1.2)** | **Cross-tenant data leakage** — any forgotten `WHERE organization_id = …` clause could expose Tenant A's leads/campaigns/devices to Tenant B. Catastrophic for both LGPD and trust. | HIGH | CRITICAL | NFR-017: PostgreSQL Row-Level Security policies as a non-bypassable safety net. Add a "tenant-leakage" integration test that runs against the test suite on every PR. Audit every endpoint in `backend/main.py` for tenant-context propagation before v1 release. |
| R16 | **NEW (v1.2)** | **Noisy-neighbor** — one large tenant (e.g., a hotel chain with 10k devices polling telemetry every minute) starves API/DB capacity for smaller tenants. | MEDIUM | HIGH | NFR-022: per-tenant rate limits at the API gateway; consider per-tenant DB connection pools or query budgets at scale. |
| R17 | **NEW (v1.2)** | **Tenant-onboarding drift** — without a strict provisioning template, tenants will accumulate inconsistent default seeds (notification rules, monetization defaults, branding) over time, making support harder. | MEDIUM | MEDIUM | Author a single canonical "tenant template" migration that runs at signup; version it; document overrides explicitly. |

---

## 14. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| Q1 | What is the v1 launch deadline? | Project Lead | HIGH |
| Q2 | Who is the project lead, product owner, tech lead, designer, legal/DPO? | Project Lead | HIGH |
| ~~Q3~~ | ~~Single-tenant per deploy or multi-tenant SaaS?~~ | — | **RESOLVED 2026-05-03** — Multi-tenant SaaS confirmed by Product Lead. See BD-08, TD-08, TD-09, NFR-017..023, and the `Organization` schema in §6.1. |
| Q4 | What MikroTik models are officially supported (hAP ac², SXT, others)? | Tech Lead | MEDIUM |
| ~~Q5~~ | ~~Captive-portal end-user UX~~ | — | **RESOLVED 2026-05-03** — see §4.2 / §9.4 (5-step flow specified) |
| Q6 | Anunciante role: which screens does it see, and what is the data scope (their campaigns only)? | Product Lead | HIGH |
| Q7 | Object storage choice for campaign creative uploads? | Tech Lead | MEDIUM |
| ~~Q8~~ | ~~LGPD consent text content + versioning policy~~ | — | **RESOLVED 2026-05-03 (conditional)** — Legal approved compliance conditional on anonymization. Concrete consent copy on the portal: *"Aceito os termos de uso e o tratamento dos meus dados conforme a LGPD."* Versioning policy still TBD (track as implementation detail, not blocker). |
| ~~Q9~~ | ~~Lead retention policy~~ | — | **PARTIALLY RESOLVED 2026-05-03** — anonymization scope now defined; specific TTLs (e.g., 12 mo hot / 36 mo aggregated) still need Legal sign-off. Schema can proceed using nullable retention metadata. |
| Q10 | Monetization billing: is the platform charging operators (SaaS), or operators charging advertisers (passthrough)? | Product Lead | HIGH |
| Q11 | WhatsApp Business API: which BSP (Twilio / Z-API / Gupshup / direct Meta)? | Tech Lead | MEDIUM |
| Q12 | Production hosting target (AWS / GCP / on-prem / hybrid)? | Tech Lead | MEDIUM |
| Q13 | Should the existing scaffolded `backend/` and `mkt-wifi-frontend/` be the baseline, or rebuilt from this requirements doc? | Project Lead | HIGH |
| Q14 | Reports — generated where? Backend cron + external worker, or FastAPI background task? | Tech Lead | MEDIUM |
| Q15 | What constitutes a "view" for CPV billing — start-of-video, ≥75% completion, or 100%? | Product Lead | HIGH |
| Q16 | Is the captive portal the same React app served from a different route, or a separate SPA? | Tech Lead | MEDIUM |
| Q17 | **NEW** — Should the "Expiração de acesso" notification rule (which defaults to WhatsApp targeting the user) be retargeted to operator groups, or disabled, given the portal no longer collects phone numbers? | Product Lead | HIGH |
| Q18 | **NEW** — Concrete LGPD retention TTLs per table (`Lead`, `ConnectionLog`, `ConsentRecord`, `AuditLog`): proposal is 12 mo hot / 36 mo aggregated / then purge. Confirm with Legal. | Legal/DPO | MEDIUM |
| Q19 | **NEW** — Resolution of admin↔portal form-config divergence (R13): adopt option (a) restrict admin builder, or (b) make portal dynamic with Legal gating? | Product Lead + Legal | HIGH |
| Q20 | **NEW (v1.2)** — Tenant resolution: subdomain-based (`acme.mktwifi.com.br`) or path-based (`mktwifi.com.br/t/acme`) for the admin SPA? Default proposal: subdomain. Confirm with Tech Lead + DevOps (wildcard SSL implications). | Tech Lead | HIGH |
| Q21 | **NEW (v1.2)** — RLS enforcement: PostgreSQL Row-Level Security policies, or SQLAlchemy event hooks at the ORM layer, or both belt-and-suspenders? Default proposal: both. | Tech Lead | MEDIUM |
| Q22 | **NEW (v1.2)** — Billing model + tenant tier limits: does the platform charge each tenant a SaaS fee (and if so, by what — venues / devices / campaigns / leads / revenue share)? Defines `Organization.max_*` fields and the per-tenant invoicing flow. | Product Lead + Finance | HIGH |
| Q23 | **NEW (v1.2)** — Is there a platform-level **super-admin** role (cross-tenant visibility for support / sales / ops) distinct from per-tenant `admin`? Implies a fourth role tier and careful scope on cross-tenant queries. | Product Lead | HIGH |
| Q24 | **NEW (v1.2)** — Does the `Anunciante` (advertiser) role span tenants — i.e., one advertiser sees their campaigns at multiple operator-tenants — or is it strictly scoped to one tenant? Affects auth model and `User`-vs-`OrganizationMembership` table design. | Product Lead | MEDIUM |

---

## 15. Stakeholders

| Name | Role | Responsibilities | Comm Pref |
|---|---|---|---|
| TBD | Project Lead / Sponsor | Scope, timeline, budget | TBD |
| TBD | Product Owner | Roadmap, prototype maintenance | TBD |
| TBD | Backend Tech Lead | FastAPI, DB, MikroTik integration, notifications | TBD |
| TBD | Frontend Tech Lead | React admin SPA + captive portal | TBD |
| TBD | DevOps | Containers, hosting, CI/CD | TBD |
| TBD | Designer | UX/UI of prototype | TBD |
| TBD | Legal / DPO | LGPD compliance | TBD |

> **RACI** is intentionally TBD across the board — kickoff names no individuals. Populate after Q2 is resolved.

---

## 16. Success Metrics

> Targets are TBD; baselines are derived from prototype mock values.

| Metric | Target | Mock Baseline | Owner | Source / Method |
|---|---|---|---|---|
| Pessoas atingidas (mensal) | TBD | 1.847 (+18%) | Product | Lead table count |
| Campanhas ativas | TBD | 3 (+2) | Product | Campaign count where status=active |
| Investimento total (mensal) | TBD | R$ 2.340 (+12%) | Product | Sum of campaign revenue |
| Dispositivos online agora | ~12 | 12 (live) | Ops | Device heartbeat |
| Taxa média de conclusão de vídeo | TBD | 78% | Product | Avg `Campaign.completion` |
| Receita gerada (cumulativa) | TBD | R$ 7.150 | Product | Sum of `Campaign.revenue` |
| Conversão portal: connect → form-submit | TBD | TBD | Product | Funnel from Sessions vs Leads |
| Equipamentos online / total | 100% | 2/3 | Ops | Device status |
| Captive-portal load (p95, mobile) | < 2.0s (TBD) | n/a | Tech Lead | RUM |
| Backend p95 latency | < 250ms (TBD) | n/a | Tech Lead | APM |

---

## 17. Appendix

### 17.1 Source Index

| # | Source | Date | Read Status |
|---|---|---|---|
| 1 | [notes/01 -kickoff.md](01 -kickoff.md) | 2026-04-30 | Read in full |
| 2 | [notes/MKT WiFi - Full App.html](MKT WiFi - Full App.html) | undated (prototype) | Decompressed bundler manifest → 10 React component files read in full |
| 3 | [notes/MKT WiFi - Captive Portal _standalone_.html](MKT WiFi - Captive Portal _standalone_.html) | added 2026-05-03 | Decompressed → 3 source files: `0e073557-…js` (CaptivePortal flow + 5 screens), `7567c069-…jsx` (DesignCanvas), `81c7033c-…jsx` (iOS device frame). Portal flow read in full. |
| 4 | [backend/main.py](../backend/main.py) | scaffolded by team | Endpoint list verified (21 routes) |
| 5 | [mkt-wifi-frontend/frontend/](../mkt-wifi-frontend/frontend/) | scaffolded by team | Mirror of admin prototype components |
| 6 | Legal Department sign-off | verbal, 2026-05-03 | LGPD compliance approved conditional on anonymization of critical user information |
| 7 | Product Lead decision | verbal, 2026-05-03 | Multi-tenant SaaS confirmed (BD-08) |

### 17.2 Glossary (pt-BR ↔ EN)

| pt-BR | EN | Notes |
|---|---|---|
| Painel | Panel / Dashboard | |
| Campanha | Campaign | A video ad served on the captive portal |
| Anunciante | Advertiser | Role + a notification group |
| Visualizador | Viewer | Read-only role |
| Conexão | Connection | A user session through the captive portal |
| Captura / Portal cativo | Captive portal | The intercept page |
| Equipamento | Device | A MikroTik unit |
| Bairro / Zona | Neighborhood / Zone | Geographic segmentation: Centro / Zona Norte / Sul / Leste |
| Faixa etária | Age bracket | 18-24 / 25-34 / 35-50 / 50+ |
| Monetização | Monetization | 4 plans: CPV / pacote de tempo / híbrido / fixo mensal |
| CPV | Cost Per View | R$ per video view |
| Razão social | Legal entity name | On Configurações |
| CNPJ | Brazilian Corporate Tax ID | NN.NNN.NNN/NNNN-NN |
| LGPD | Lei Geral de Proteção de Dados | Brazilian GDPR-equivalent |

### 17.3 Decision Log

| Date | IDs | Decision | Source |
|---|---|---|---|
| 2026-04-30 | TD-01..04, BD-01..02, PD-01..02 | Tech stack + project scope confirmed (FastAPI / React / PostgreSQL / SQLAlchemy+Alembic; pt-BR; HTML prototype is canonical UX) | kickoff.md |
| 2026-04-30 | BD-03..07, TD-05..07, PD-03 | Embedded in prototype: 3 user roles, 4 monetization models, video=YouTube|Upload, video-for-access exchange, WhatsApp+Email notifications, mock-fallback frontend | prototype |
| (pre-2026-05-03) | — | Team scaffolded `backend/` (FastAPI 21 routes, MikroTik adapter, notifications dispatcher, Alembic-ready DB layer, Docker) and `mkt-wifi-frontend/` (10 React component files) | repo state |
| 2026-05-03 | FR-020..039 (rewritten) | Captive-portal end-user UX locked to 5-step flow (connecting → form → ad → connected → renew). First session: 30s ad → 30 min access. Renewal: 60s ad → +30 min. Ads non-skippable. | `MKT WiFi - Captive Portal _standalone_.html` |
| 2026-05-03 | NFR-005, FR-022/023, `Lead` schema | LGPD compliance APPROVED by Legal Dept, conditional on anonymization of critical PII. Portal collects only first name + 3 categoricals; raw MAC/phone/email/CPF excluded; `mac_hash` + retention TTLs introduced. | Legal-Dept verbal sign-off |
| 2026-05-03 | BD-08, TD-08, TD-09, NFR-017..023, `Organization` schema | **Multi-tenant SaaS confirmed by Product Lead.** Strategy: shared DB + PostgreSQL RLS + `organization_id` on every operator-owned table. Subdomain-based tenant resolution for admin SPA; venue/device-based for captive portal. Per-tenant integrations, branding, monetization, lifecycle. Each operator is LGPD data controller; platform is data processor. | Product-Lead verbal decision |

### 17.4 Document Change History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-05-03 | meeting-analyst (with bundler-manifest decompression assist) | Initial consolidation. HIGH confidence (0.95) — every UI claim sourced to a specific component file; every endpoint verified against `backend/main.py`. |
| 1.1 | 2026-05-03 | meeting-analyst | (a) Captive-portal end-user UX fully specified from `MKT WiFi - Captive Portal _standalone_.html` (5-step flow). FRs in §4.2 rewritten end-to-end. R1 / Q5 resolved. (b) LGPD compliance approval by Legal Dept propagated to NFR-005, `Lead` schema (anonymization-first), Risks, FR-023 (no phone/email/CPF in portal), and §7.3 flow diagram. R3 / Q8 resolved; Q9 partially resolved. (c) Two new risks surfaced: R13 (admin↔portal form-config divergence) and R14 (notification rule targeting end-user phone). (d) Two new questions: Q17–Q19. Confidence raised to 0.97. |
| 1.2 | 2026-05-03 | meeting-analyst | **Multi-tenant SaaS confirmed by Product Lead.** Propagated through: BD-08 (business decision), TD-08 (shared-DB row-level isolation via PostgreSQL RLS), TD-09 (subdomain-based tenant resolution for admin SPA + venue/device-based for portal), NFR-017..023 (tenant isolation, middleware, per-tenant integrations, onboarding, offboarding, rate limits, LGPD controller/processor posture), `Organization` entity rewritten to first-class with lifecycle/limits/branding/integrations/DPA fields, schema notes mandate `organization_id` on every operator-owned table, architecture component table adds Tenant Resolution Middleware + Provisioning Service + Offboarding Service. R6 / Q3 resolved. Three new risks (R15 cross-tenant data leakage, R16 noisy neighbor, R17 onboarding drift). Five new questions (Q20–Q24: tenant resolution mechanism, RLS strategy, billing model, super-admin role, advertiser scope). Confidence raised to 0.98. |

---

## Remember

> *"Every meeting contains decisions waiting to be discovered."*

The kickoff document was just the surface. The prototype carries the real specification — entity field names, validation regexes, monetization plans, role labels, integration list, navigation IDs, currency formats. The team has already begun executing this design; this document captures the **as-designed** spec so drift can be detected and reconciled.

When uncertain, this doc flags it — every TBD is real. When confident, sources are cited. **Trust the components — they are the contract.**
