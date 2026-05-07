# Product Identity

> **Purpose**: Canonical product identity for MKT WiFi — tagline, pitch, positioning, audiences, tech stack
> **Confidence**: 0.95
> **MCP Validated:** 2026-05-04

## Overview

MKT WiFi is a multi-tenant SaaS platform for Wi-Fi marketing and captive-portal management in the Brazilian market. It transforms Wi-Fi networks at cafés, lojas, eventos, praças, hotéis, shoppings, and redes de varejo into qualified-lead-capture and ad-monetization channels — exchanging 30 minutes of internet access for a 30-second non-skippable ad and an LGPD-anonymized 4-field form.

## Identity

| Fact | Value | Source |
|------|-------|--------|
| Product name | **MKT WiFi** | kickoff |
| Tagline | *"Wi-Fi que paga a conta."* | login.jsx:77 |
| Pitch | *"Monetize sua rede captiva com vídeos, capture dados de clientes e gerencie tudo em um só lugar."* | login.jsx |
| System language | **pt-BR** (Brazilian Portuguese) | BD-02 |
| Architecture | **Multi-tenant SaaS** (shared DB, row-level isolation) | BD-08 / TD-08 |
| Target market | Brazil — cafés, lojas, eventos, praças, hotéis, shoppings, redes de varejo | summary-requiments §1 |
| Kickoff date | 2026-04-30 | kickoff |

## Three Audience Tiers (BD-03)

| Tier | Role label (pt-BR) | What they touch |
|------|--------------------|-----------------|
| End-user | (none — anonymous lead) | Captive portal (5-step flow) |
| Operator-admin | **Administrador** | Full admin SPA (campaigns, leads, devices, monetization, reports) |
| Advertiser | **Anunciante** | Read-only campaign performance, reports |
| Viewer | **Visualizador** | Read-only dashboards |

## Tech Stack (TD-01 → TD-09)

| Layer | Choice |
|-------|--------|
| Backend | **FastAPI** (Python, async, Pydantic v2) |
| Frontend (admin) | **React 18 + Vite + TypeScript** |
| Frontend (captive portal) | **React 18 + Vite + TypeScript** (separate bundle) |
| Database | **PostgreSQL 14+** (asyncpg) |
| ORM | **SQLAlchemy 2.x async** + **Alembic** migrations |
| Tenancy | **Subdomain-based** for admin (`acme.mktwifi.com.br`) + **device-based** for portal (`device_id → venue_id → organization_id`) |
| Session token | JWT-style, 7-day TTL, `localStorage` ("Manter conectado") or `sessionStorage` |
| API base | `http://localhost:8000/api/*` (dev); prod TBD |
| MikroTik integration | `librouteros` (planned); mock adapter shipped |

## Backend API Surface (21 endpoints, 9 clusters)

Verified against `backend/main.py`:

| Cluster | Endpoints |
|---------|-----------|
| Auth | `POST /api/auth/login` |
| Dashboard | `GET /api/kpis`, `/api/connections/weekly`, `/api/demographics` |
| Campaigns | `GET/POST /api/campaigns`, `PATCH/DELETE /api/campaigns/{id}` |
| Users | `GET /api/users`, `/api/users/live` |
| Devices | `GET /api/devices`, `POST /api/devices/{id}/refresh` |
| Notifications | `GET /api/notifications/rules`, `PATCH /api/notifications/rules/{id}`, `GET /api/notifications/groups` |
| Monetization | `GET /api/monetization` |
| Reports | `GET /api/reports` |
| Connection cfg | `GET /api/connection/form` |
| **Captive portal** | `GET /api/portal/bootstrap`, `POST /api/connect`, `POST /api/sessions/{id}/ad-complete`, `POST /api/sessions/{id}/renew` |

## Dashboard Hero KPIs (FR-040)

1. Pessoas atingidas este mês (with delta %)
2. Campanhas ativas (with delta count)
3. Investimento total (R$, with delta %)
4. Dispositivos online agora (live)

## Common Mistakes

### Wrong

Calling the platform "AdConnect" or any other internal/working name. Mixing English headlines into a pt-BR deck for the product itself ("Wi-Fi that pays the bill").

### Correct

Always use **MKT WiFi** as the product name and *"Wi-Fi que paga a conta."* as the tagline. Tech terms (FastAPI, Postgres, RLS) may stay in English; product copy stays in pt-BR.

## Related

- [concepts/captive-portal-flow.md](captive-portal-flow.md) — How end-users interact with the product
- [concepts/multi-tenant-architecture.md](multi-tenant-architecture.md) — How the SaaS positioning is implemented
- [concepts/audience-personas.md](audience-personas.md) — How to pitch each audience tier
- [patterns/content-templates.md](../patterns/content-templates.md) — Pre-written slide content blocks
