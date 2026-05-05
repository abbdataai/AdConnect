# MKT WiFi Slide Builder Quick Reference

> Fast lookup tables. For deep detail, see linked concept files. **MCP Validated:** 2026-05-04

## Canonical Numbers (Never Contradict)

| Fact | Value | Source |
|------|-------|--------|
| Splash duration | 3.1s scripted (1.4 + 1.0 + 0.7) | FR-020 |
| Ad — first run | 30s non-skippable | FR-027 |
| Ad — renewal | 60s non-skippable | FR-039 |
| Free internet per cycle | 30 min | FR-091 |
| CPV default price | R$ 0,20 / view | FR-120 |
| Pacote default | R$ 50 / 10h | FR-121 |
| Plano fixo mensal | R$ 299 / mês | FR-123 |
| MikroTik default | 192.168.88.1 : 8728 | FR-091 |
| Backend endpoints | 21 across 9 clusters | backend/main.py |
| Captive-portal form fields | 4 (anonymized only) | FR-023 |
| Captive-portal flow steps | 5 | FR-020 → FR-039 |

## Captive-Portal Flow Steps

| # | id | Duration | Goal |
|---|----|----------|------|
| 1 | `connecting` | ~3.1s | Brand splash + radar + 3 sequenced messages |
| 2 | `form` | user-paced | Capture only the 4 anonymized fields + LGPD consent |
| 3 | `ad` | 30s / 60s renew | Non-skippable advertiser video |
| 4 | `connected` | 30 min countdown | Free internet (circular SVG timer) |
| 5 | `renew` | user-paced | "Assistir e renovar" → loop to step 3 (60s ad) |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Backend / DB / ORM | FastAPI (async, Pydantic v2) · PostgreSQL 14+ (asyncpg) · SQLAlchemy 2.x async + Alembic |
| Frontend admin / portal | React 18 + Vite + TypeScript (two separate bundles) |
| Tenancy | Subdomain (admin) + device-based (portal: device_id → venue_id → organization_id) |
| Session | JWT-style, 7-day TTL, localStorage / sessionStorage |

## Three Audience Tiers (BD-03)

| Role label (pt-BR) | Scope |
|--------------------|-------|
| (anonymous end-user) | Captive portal — 5-step flow |
| **Administrador** | Full admin SPA (campaigns, leads, devices, monetization, reports) |
| **Anunciante** / **Visualizador** | Read-only campaign performance / dashboards |

## Four Monetization Models

| Model | Default Price | FR-ID |
|-------|---------------|-------|
| Por visualização (CPV) | R$ 0,20 / view | FR-120 |
| Pacote de tempo | R$ 50 / 10h | FR-121 |
| Híbrido | View + tempo (custom) | FR-122 |
| Plano fixo mensal | R$ 299 / mês | FR-123 |
> Plan changes are not retroactive (FR-122).

## LGPD-Anonymized Form Fields (the only 4)

| Field | Type | Values |
|-------|------|--------|
| `name` | first name only | free text |
| `age_band` | chip group | 18-24 / 25-34 / 35-50 / 50+ |
| `gender` | chip group | Feminino / Masculino / Prefiro não informar |
| `neighborhood` | select | Centro / Zona Norte / Zona Sul / Zona Leste / Zona Oeste / Praia |

> **Forbidden (NEVER collect):** phone, email, CPF, last name, exact birthdate, MAC visible. (FR-023, NFR-005)

## C-Level Persona → Value-Prop

| Persona | Value Prop |
|---------|------------|
| **CMO** | Physical "blind spot" → First-Party Data + proximity marketing automation |
| **CTO** | Multi-tenant SaaS reliability, scalability without manual provisioning, strict isolation, seamless CI |
| **CFO/CEO** | Wi-Fi: passive cost → revenue asset; ops costs diluted by multi-tenant model |

## Slide Type Decision

| Content | AIDE Slide Type |
|---------|----------------|
| Tagline / "Wi-Fi que paga a conta." | `title` |
| Hook quote | `hook-quote` |
| 4 monetization models | `tier-cards` |
| 5-step portal flow | `flow-architecture` (svg-pipeline, viewBox≥1200, iOS frames) |
| Multi-tenant tenancy diagram | `flow-architecture` (subdomain → tenant → RLS filter) |
| Tech stack | `method-grid` (icon-badge-row) |
| Dashboard KPIs | `stat-cards` (× 4) |
| LGPD mandate | `tier-cards` (Coletamos / Não coletamos / Como garantimos) |
| 21 endpoints | `table` (clustered) |
| ROI projection | `bar-chart` (animated-bars, R$) |
| C-Level value-prop split | `method-grid` (center-divider, 3 cols) |
| Closing CTA | `closing-quote` |

## Related Documentation

| Topic | Path |
|-------|------|
| All concepts | `concepts/` (product-identity, captive-portal-flow, multi-tenant-architecture, monetization-models, lgpd-anonymization, audience-personas) |
| All patterns | `patterns/` (slide-deck-types, content-templates, pt-br-formatting) |
| Full index | `index.md` |
