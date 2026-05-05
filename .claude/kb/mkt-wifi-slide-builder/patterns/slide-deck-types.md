# Slide Deck Types

> **Purpose**: 8 deck types with content maps, slide-type assignments, and target audiences for the MKT WiFi platform
> **MCP Validated:** 2026-05-04

## When to Use

- When the user asks for any presentation, slides, or deck about MKT WiFi
- When clarifying scope: ask which deck-type matches the user's audience
- When user says "pitch" / "C-Level" / "investor" → use `executive-pitch`
- When user says "captive portal" / "5-step flow" → use `captive-portal-flow`
- When user says "architecture" / "multi-tenant" / "RLS" → use `multi-tenant-architecture`
- When user says "monetization" / "pricing" / "ROI" → use `monetization-models`
- When user says "LGPD" / "compliance" / "DPO" / "Legal" → use `lgpd-compliance`

## The 8 Deck Types

### 1. `executive-pitch`

**Audience:** C-Level (CMO/CTO/CFO/CEO)
**Core message:** Multi-tenant SaaS as competitive moat, ROI, LGPD risk-mitigation, First-Party Data
**Slide count:** 8–10 slides
**Output path:** `presentation/mkt-wifi/executive-pitch/executive-pitch-slides.html`

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "Wi-Fi que paga a conta." + brand mark + animated radar | `title` (title-standard) |
| 2 | Hook: "82% do tráfego físico não vira lead" or similar | `hook-quote` (giant-quote-mark) |
| 3 | Three-persona value prop (CMO/CTO/CFO) | `method-grid` (center-divider, 3 cols) |
| 4 | 5-step captive-portal flow (compressed) | `flow-architecture` (svg-pipeline-horizontal) |
| 5 | 4 monetization models | `tier-cards` (4-tier grid) |
| 6 | Multi-tenant architecture (subdomain → RLS) | `flow-architecture` |
| 7 | LGPD 3-tier (Coletamos / Não coletamos / Como garantimos) | `tier-cards` |
| 8 | ROI projection (CPV vs Mensal scenarios) | `bar-chart` (animated-bars) |
| 9 | Closing CTA: "Pronto para transformar Wi-Fi em receita?" | `closing-quote` (gold-quote) |

---

### 2. `product-overview`

**Audience:** Prospects, sales enablement
**Core message:** Three pillars (video monetization, lead capture, MikroTik fleet) + screen tour
**Slide count:** 12–15 slides
**Output path:** `presentation/mkt-wifi/product-overview/product-overview-slides.html`

| Focus | Slide types |
|-------|-------------|
| Title + tagline | `title` |
| Three pillars | `method-grid` (3 cols, icon badges) |
| Captive-portal flow | `flow-architecture` |
| Admin SPA tour | `stat-cards` + `table` for KPIs and screens |
| Monetization | `tier-cards` |
| MikroTik integration | `method-grid` |
| Closing | `closing-quote` |

---

### 3. `captive-portal-flow`

**Audience:** Product / UX / sales demo
**Core message:** 5-step end-user experience with iOS-frame mockups
**Slide count:** 8–10 slides
**Output path:** `presentation/mkt-wifi/captive-portal-flow/captive-portal-flow-slides.html`

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "Do toque na rede ao acesso liberado em 5 passos" | `title` |
| 2 | Flow overview SVG — 5 iOS-frame insets, viewBox=1200 | `flow-architecture` |
| 3 | Step 1 detail: `connecting` (3.1s splash + radar) | `method-grid` |
| 4 | Step 2 detail: `form` — 4 anonymized fields + LGPD consent | `tier-cards` (form anatomy) |
| 5 | Step 3 detail: `ad` — 30s first / 60s renewal | `stat-cards` |
| 6 | Step 4 detail: `connected` — 30 min countdown, circular timer | `stat-cards` |
| 7 | Step 5 detail: `renew` — "Assistir e renovar" loop | `method-grid` |
| 8 | LGPD anonymization mandate slide | `tier-cards` (3-tier) |
| 9 | Closing: visual recap + tag list | `closing-quote` |

---

### 4. `multi-tenant-architecture`

**Audience:** CTO / engineering reviewers
**Core message:** Postgres RLS, subdomain resolution, `organization_id` FK, device→venue→org chain
**Slide count:** 10–12 slides
**Output path:** `presentation/mkt-wifi/multi-tenant-architecture/multi-tenant-architecture-slides.html`

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "Um deployment. N operadores. Zero vazamento." | `title` |
| 2 | Two resolution paths (subdomain + device-chain) | `flow-architecture` (split SVG) |
| 3 | RLS policy diagram | `flow-architecture` |
| 4 | Tenant-owned tables matrix | `table` |
| 5 | Postgres RLS vs SQLAlchemy event-hook trade-off | `tier-cards` |
| 6 | Tech stack (FastAPI / React / Postgres / SQLAlchemy / Alembic) | `method-grid` |
| 7 | Risks R15-R17 + mitigations | `tier-cards` (risk-mitigation pairs) |
| 8 | Closing | `closing-quote` |

---

### 5. `monetization-models`

**Audience:** CFO / commercial team
**Core message:** CPV / Pacote / Híbrido / Plano fixo with ROI scenarios
**Slide count:** 6–8 slides
**Output path:** `presentation/mkt-wifi/monetization-models/monetization-models-slides.html`

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "Quatro modelos. Um operador. Receita previsível." | `title` |
| 2 | 4-tier model grid with default prices | `tier-cards` |
| 3 | When to pitch each (decision matrix) | `table` |
| 4 | ROI scenario: CPV vs Mensal R$ 299 ARR | `bar-chart` (animated-bars) |
| 5 | FR-122 non-retroactivity callout | `method-grid` |
| 6 | Closing | `closing-quote` |

---

### 6. `lgpd-compliance`

**Audience:** DPO / Legal / risk reviewers
**Core message:** Privacy-by-design, anonymization mandate, CI guardrails, Legal sign-off
**Slide count:** 8–10 slides
**Output path:** `presentation/mkt-wifi/lgpd-compliance/lgpd-compliance-slides.html`

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "Privacy-by-design, validado pelo Jurídico." | `title` |
| 2 | The 3-tier mandate (Coletamos / Não coletamos / Como garantimos) | `tier-cards` |
| 3 | The 4 collected fields detail | `table` |
| 4 | The forbidden fields detail (with reason for each) | `table` |
| 5 | Enforcement layers: Pydantic + Literal + grep_pii_check.sh | `method-grid` |
| 6 | Legal sign-off: 2026-05-03 + R3 risk register | `stat-cards` |
| 7 | Closing | `closing-quote` |

---

### 7. `feature-deep-dive`

**Audience:** Product / engineering reviewers
**Core message:** One section in depth (campaigns, leads, devices, notifications, reports, monetization config)
**Slide count:** 6–10 slides
**Output path:** `presentation/mkt-wifi/feature-deep-dive/{feature-name}-slides.html`

Use slide types appropriate to the feature: `table` for entity matrices, `flow-architecture` for workflows, `stat-cards` for KPIs, `tier-cards` for option comparisons. Always footnote with FR-IDs.

---

### 8. `full-platform`

**Audience:** Conference, board, fundraising
**Core message:** End-to-end thesis-grade narrative
**Slide count:** 18–25 slides (combination of all 7 above)
**Output path:** `presentation/mkt-wifi/full-platform/full-platform-slides.html`

Recommended structure: title → hook → product identity → 5-step portal → architecture → monetization → LGPD → ROI → roadmap → closing.

## File Naming Convention

```
presentation/mkt-wifi/
├── executive-pitch/executive-pitch-slides.html
├── product-overview/product-overview-slides.html
├── captive-portal-flow/captive-portal-flow-slides.html
├── multi-tenant-architecture/multi-tenant-architecture-slides.html
├── monetization-models/monetization-models-slides.html
├── lgpd-compliance/lgpd-compliance-slides.html
├── feature-deep-dive/{feature-name}-slides.html
└── full-platform/full-platform-slides.html
```

## See Also

- [patterns/content-templates.md](content-templates.md) — Pre-written slide content blocks
- [patterns/pt-br-formatting.md](pt-br-formatting.md) — pt-BR formatting rules
- [concepts/audience-personas.md](../concepts/audience-personas.md) — C-Level personas
