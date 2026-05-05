# MKT WiFi Slide Builder Knowledge Base

> **Purpose**: Canonical facts, domain knowledge, and slide patterns for the MKT WiFi multi-tenant SaaS Wi-Fi marketing platform (pt-BR, Brazil)
> **MCP Validated:** 2026-05-04

## Quick Navigation

### Concepts (< 150 lines each)

| File | Purpose |
|------|---------|
| [concepts/product-identity.md](concepts/product-identity.md) | Tagline, pitch, positioning, audiences, tech stack, 21-endpoint API |
| [concepts/captive-portal-flow.md](concepts/captive-portal-flow.md) | 5-step end-user flow (connecting → form → ad → connected → renew) |
| [concepts/multi-tenant-architecture.md](concepts/multi-tenant-architecture.md) | Shared-DB row-level isolation, subdomain + device tenancy (TD-08, TD-09) |
| [concepts/monetization-models.md](concepts/monetization-models.md) | CPV / Pacote / Híbrido / Plano fixo (FR-120 → FR-123) |
| [concepts/lgpd-anonymization.md](concepts/lgpd-anonymization.md) | NFR-005 mandate, 4 collected fields, forbidden list, CI guardrail |
| [concepts/audience-personas.md](concepts/audience-personas.md) | C-Level value props (CMO / CTO / CFO-CEO) and required tone |

### Patterns (< 200 lines each)

| File | Purpose |
|------|---------|
| [patterns/slide-deck-types.md](patterns/slide-deck-types.md) | 8 deck types with content maps and slide-type assignments |
| [patterns/content-templates.md](patterns/content-templates.md) | Pre-written pt-BR slide content blocks for every common slide |
| [patterns/pt-br-formatting.md](patterns/pt-br-formatting.md) | Brazilian Portuguese formatting rules (currency, phone, chips, UI strings) |

---

## Quick Reference

- [quick-reference.md](quick-reference.md) — Canonical numbers, flow steps, monetization models, tech stack

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Tagline** | *"Wi-Fi que paga a conta."* (login.jsx:77) |
| **5-step portal flow** | connecting (3.1s) → form → ad (30s/60s) → connected (30 min) → renew |
| **LGPD-anonymized form** | 4 fields only: name + age_band + gender + neighborhood (NFR-005, FR-023) |
| **Multi-tenant SaaS** | Shared DB, row-level isolation via `organization_id` FK (BD-08, TD-08) |
| **4 monetization models** | CPV (R$ 0,20) / Pacote (R$ 50/10h) / Híbrido / Mensal (R$ 299) |
| **3 audience tiers** | Administrador / Anunciante / Visualizador (BD-03) |
| **21 endpoints** | FastAPI async, 9 clusters (verified vs `backend/main.py`) |

---

## Learning Path

| Level | Files |
|-------|-------|
| **Start here** | quick-reference.md → concepts/product-identity.md |
| **Pitch decks (C-Level)** | concepts/audience-personas.md → patterns/content-templates.md |
| **Architecture decks** | concepts/multi-tenant-architecture.md → concepts/captive-portal-flow.md |
| **Compliance decks** | concepts/lgpd-anonymization.md → patterns/content-templates.md (LGPD section) |
| **Slide generation** | patterns/slide-deck-types.md → patterns/content-templates.md → patterns/pt-br-formatting.md |

---

## Agent Usage

| Agent | Primary Files | Use Case |
|-------|---------------|----------|
| mkt-wifi-slide-builder | All files in this KB | Generate factually accurate, LGPD-respectful HTML slide decks in pt-BR |

---

## Design System Reference

This KB supplements — but does not replace — the AIDE design system. The agent must read these in addition to the KB above:

| AIDE KB File | Purpose |
|--------------|---------|
| `.claude/kb/aide-slides/quality-rules.md` | Layout, typography, screen-filling rules |
| `.claude/kb/aide-slides/design-system.md` | Navy/cyan/gold palette, Instrument Serif |
| `.claude/kb/aide-slides/component-library.md` | 20+ CSS components |
| `.claude/kb/aide-slides/slide-types.md` | Slide type layouts |
| `.claude/kb/aide-slides/advanced-visuals.md` | SVG pipelines, glassmorphism |
| `.claude/kb/aide-slides/template.md` | HTML skeleton |
| `.claude/kb/aide-slides/slide-engine.md` | SlideEngine JS |
| `.claude/kb/aide-slides/animation-patterns.md` | Shimmer, pulse-glow, bar-fill |

> **Fallback:** If `.claude/kb/aide-slides/` does not exist on disk, fall back to `.claude/kb/slide-presentations/` (concepts/visual-design.md, concepts/slide-anatomy.md, concepts/narrative-arc.md, patterns/revealjs-html-scaffold.md, patterns/narrative-pitch.md, patterns/review-rubric.md). State the fallback explicitly in the completion message.
