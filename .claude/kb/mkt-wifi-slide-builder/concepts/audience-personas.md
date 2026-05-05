# Audience Personas

> **Purpose**: C-Level value-prop framing for MKT WiFi pitch decks (CMO / CTO / CFO-CEO)
> **Confidence**: 0.95
> **MCP Validated:** 2026-05-04

## Overview

MKT WiFi pitches into three C-Level conversations from a single product story. The three persona framings come from `notes/02 - Apresentação.md` (the executive pitch deck spec). Every executive-pitch deck must cover all three; product-overview decks may select one.

## CMO — From Blind Spot to First-Party Data

| Aspect | Value |
|--------|-------|
| Problem framing | Physical foot traffic is a "blind spot" — operators see customers walk in and out without ever capturing intent |
| MKT WiFi answer | The captive portal converts that blind spot into qualified lead capture |
| Key concepts | First-Party Data, proximity marketing automation, real-time demographics (idade, gênero, bairro) |
| Operator outcomes | Captura de leads qualificados em fluxo físico; automação de marketing por proximidade; demografia em tempo real |
| Slide tags | [Multi-tenant] [LGPD] [First-Party Data] [Proximity] |

## CTO — Multi-Tenant SaaS Reliability

| Aspect | Value |
|--------|-------|
| Problem framing | Per-customer provisioning, brittle isolation, manual deploys break as the customer count grows |
| MKT WiFi answer | Multi-tenant SaaS with shared DB, row-level isolation via `organization_id`, subdomain provisioning |
| Key concepts | Postgres RLS, SQLAlchemy 2.x async hooks, subdomain resolution, device-chain resolution, seamless CI |
| Engineering outcomes | Isolamento por `organization_id` (Postgres RLS); provisionamento automático por subdomínio; CI contínua + grep_pii_check.sh em cada PR |
| Slide tags | [Postgres RLS] [SQLAlchemy 2.x async] [TD-08] [TD-09] |

## CFO / CEO — Passive Cost to Revenue Asset

| Aspect | Value |
|--------|-------|
| Problem framing | Wi-Fi has historically been a *passive infrastructure cost* on the operator's P&L |
| MKT WiFi answer | Convert Wi-Fi from cost center to revenue-generating asset, with operational costs **diluted by the multi-tenant deployment model** |
| Key concepts | 4 monetization models (CPV / Pacote / Híbrido / Mensal); shared infra across tenants; predictable ARR option |
| Financial outcomes | 4 modelos de monetização; custo operacional diluído pelo multi-tenant; receita compartilhada entre operador e plataforma |
| Slide tags | [CPV] [ARR] [Multi-modelo] [pt-BR currency] |

## Required Tone (verbatim from notes/02)

The pitch deck spec mandates the following tone characteristics for any C-Level deck:

- **Concise** — every slide answers the executive's first question in one sentence
- **Data-driven** — every claim cites a number (FR-ID, R$ price, %, count)
- **ROI-focused** — every benefit is convertible into either revenue gained or cost avoided
- **Risk-mitigation framing** — LGPD/GDPR compliance is positioned as risk *mitigated*, not feature added
- **Competitive advantage through First-Party Data engineering** — proximity data is framed as a defensible moat, not a checkbox

Slides that violate this tone (e.g., long paragraphs, unanchored claims, "we're really excited about…") are off-spec.

## Three-Persona Slide Structure

A standard `executive-pitch` deck dedicates one slide to a side-by-side persona summary using `method-grid` with center-divider, 3 columns:

| Column | Icon hint | One-line value prop |
|--------|-----------|---------------------|
| CMO | target / radar | "Do blind spot ao First-Party Data" |
| CTO | layers / shield | "SaaS multi-tenant escalável" |
| CFO | trending-up / chart | "De custo passivo a ativo de receita" |

Each column carries 3 supporting bullets and a footnote linking to the relevant FR/NFR/TD ID.

## Common Mistakes

### Wrong

Pitching the same value prop to all three personas; framing LGPD as a feature instead of a mitigated risk; listing CPV without ARR for the CFO; talking pipelines (CTO content) to a CMO.

### Correct

One product, three conversations. CMO gets data + automation. CTO gets isolation + scale + CI. CFO gets ARR + diluted cost + risk mitigated. Every claim cites an ID.

## Related

- [concepts/product-identity.md](product-identity.md) — Product positioning overall
- [concepts/multi-tenant-architecture.md](multi-tenant-architecture.md) — CTO depth content
- [concepts/monetization-models.md](monetization-models.md) — CFO depth content
- [concepts/lgpd-anonymization.md](lgpd-anonymization.md) — Risk-mitigation framing source
- [patterns/content-templates.md](../patterns/content-templates.md) — Three-persona value-prop slide
