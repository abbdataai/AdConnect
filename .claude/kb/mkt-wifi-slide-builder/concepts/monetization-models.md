# Monetization Models

> **Purpose**: The four pricing models MKT WiFi offers operators (FR-120 → FR-123)
> **Confidence**: 0.95
> **MCP Validated:** 2026-05-04

## Overview

MKT WiFi offers four monetization models, and each operator selects exactly one as their active plan. The four are CPV (cost-per-view), Pacote de tempo (bulk hours), Híbrido (view + tempo), and Plano fixo mensal (flat monthly). Plan changes do **not** retroactively affect campaigns already in flight (FR-122).

## The Four Models

| Model | Default Price | FR-ID | What it bills on |
|-------|---------------|-------|------------------|
| **Por visualização (CPV)** | **R$ 0,20 / view** | FR-120 | Each non-skippable ad view delivered at a captive portal |
| **Pacote de tempo** | **R$ 50 / 10h** Wi-Fi | FR-121 | Bulk-time package, sold in 10-hour blocks |
| **Híbrido** | View + tempo (custom) | FR-122 | Combination of CPV and pacote billed concurrently |
| **Plano fixo mensal** | **R$ 299 / mês** | FR-123 | Flat monthly subscription, no per-view billing |

## When To Pitch Each

| Audience signal | Recommended model |
|-----------------|-------------------|
| Operator wants pay-as-you-grow with no upfront commitment | CPV |
| Operator runs occasional events and wants block-billing predictability | Pacote |
| Operator wants both campaign performance billing and time guarantees | Híbrido |
| Operator wants ARR-style flat predictable cost | Plano fixo mensal |

## Plan-Change Non-Retroactivity (FR-122)

When an operator switches plan:

| Behavior | Detail |
|----------|--------|
| Campaigns in flight | Continue billing under the **previous** plan until they end |
| New campaigns | Bill under the **new** plan from creation timestamp forward |
| Reporting | Shows both plans during the transition period |

This rule is critical for operator trust — they should never be surprised by retroactive billing.

## pt-BR Currency Formatting

All monetization values displayed to the operator must follow Brazilian conventions:

| Format | Correct | Wrong |
|--------|---------|-------|
| Currency symbol | `R$ ` (with space) | `R$0,20` (no space) |
| Decimal separator | comma `,` | dot `.` |
| Thousands separator | dot `.` | comma `,` |

Examples:

| Value | pt-BR display |
|-------|---------------|
| 0.20 | `R$ 0,20` |
| 50.00 | `R$ 50,00` |
| 299.00 | `R$ 299,00` |
| 1500.00 | `R$ 1.500,00` |

See [patterns/pt-br-formatting.md](../patterns/pt-br-formatting.md) for the full formatting reference.

## Common Mistakes

### Wrong

Showing CPV to a CFO without an ARR comparison; omitting the FR-122 non-retroactivity footnote when describing a plan change; rendering currency as `R$0.20` (US style).

### Correct

Always pair CPV with a Mensal R$ 299 ARR scenario when pitching a CFO. Always footnote FR-122 on slides that show "Plan change" or "Switch plan". Always use `R$ XX,XX` with space + comma.

## Related

- [concepts/product-identity.md](product-identity.md) — Where monetization sits in the product
- [concepts/audience-personas.md](audience-personas.md) — CFO/CEO value-prop framing
- [patterns/content-templates.md](../patterns/content-templates.md) — Monetization 4-tier slide content
- [patterns/pt-br-formatting.md](../patterns/pt-br-formatting.md) — Currency formatting rules
