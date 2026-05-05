# Captive-Portal Flow

> **Purpose**: Atomic spec of the 5-step end-user captive-portal experience
> **Confidence**: 0.95
> **MCP Validated:** 2026-05-04

## Overview

The MKT WiFi captive portal is the only surface the end-user (anonymous lead) ever touches. It runs as a separate React 18 + Vite + TypeScript bundle and walks the user through 5 sequenced steps — connecting → form → ad → connected → renew — exchanging 30 minutes of internet access for a 30-second non-skippable ad view and a 4-field LGPD-anonymized form. Visual reference: `notes/MKT WiFi - Captive Portal _standalone_.html`.

## The 5 Steps (FR-020 → FR-039)

| # | id | Duration | Goal |
|---|----|----------|------|
| 1 | `connecting` | ~3.1s scripted (1.4 + 1.0 + 0.7) | Brand splash + radar animation + 3 sequenced messages |
| 2 | `form` | user-paced | Capture only `name + age_band + gender + neighborhood` + LGPD consent |
| 3 | `ad` | **30s** first run / **60s** renewal | Non-skippable advertiser video |
| 4 | `connected` | **30 min** countdown | Free internet with circular SVG timer |
| 5 | `renew` | user-paced | "Assistir e renovar" → loop to step 3 with 60s ad |

## Step 1 — `connecting` (FR-020 → FR-022)

| Property | Value |
|----------|-------|
| Total duration | ~3.1s scripted |
| Sub-timings | 1.4s splash + 1.0s radar + 0.7s message rotation |
| Visual | Brand mark + animated radar |
| Messages | 3 sequenced status lines (e.g., "Conectando…" / "Verificando rede…" / "Quase pronto…") |
| Transition | Auto-advance to `form` |

## Step 2 — `form` (FR-023, FR-024 — LGPD-critical)

The portal **MUST** collect ONLY these 4 fields plus a mandatory consent checkbox:

| Field | Type | Values |
|-------|------|--------|
| `name` | first name only | free text |
| `age_band` | chip group | 18-24 / 25-34 / 35-50 / 50+ |
| `gender` | chip group | Feminino / Masculino / Prefiro não informar |
| `neighborhood` | select | Centro / Zona Norte / Zona Sul / Zona Leste / Zona Oeste / Praia |

The submit button is **disabled** until the consent checkbox is checked. See [lgpd-anonymization.md](lgpd-anonymization.md) for the full forbidden-fields list and CI guardrail.

## Step 3 — `ad` (FR-027, FR-039)

| Property | First run | Renewal |
|----------|-----------|---------|
| Duration | **30s** | **60s** |
| Skippable? | No (non-skippable) | No (non-skippable) |
| Source | Advertiser video bound to operator's active campaign | Same |
| On complete | `POST /api/sessions/{id}/ad-complete` | `POST /api/sessions/{id}/ad-complete` |

## Step 4 — `connected` (FR-091)

| Property | Value |
|----------|-------|
| Internet duration | **30 min** per cycle |
| Visual | Circular SVG timer + welcome line "Aproveite, {firstName}!" |
| End-state | Timer reaches zero → user prompted to renew |

## Step 5 — `renew`

| Property | Value |
|----------|-------|
| CTA | "Assistir e renovar" |
| Effect | Loops user back to step 3 (`ad`) with 60s renewal ad |
| Reward | "+30 min acesso" chip on success |
| Backend | `POST /api/sessions/{id}/renew` |

## Backend Endpoints (Captive-Portal Cluster)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/portal/bootstrap` | Resolve device → venue → organization, return campaign + ad assets |
| `POST /api/connect` | Submit anonymized form, start session, return `session_id` |
| `POST /api/sessions/{id}/ad-complete` | Mark first-run ad as watched, unlock 30 min internet |
| `POST /api/sessions/{id}/renew` | Mark renewal ad as watched, extend 30 min internet |

## Common Mistakes

### Wrong

Showing a phone, email, or CPF field on the form slide; using a skippable video player; setting the renewal ad shorter than the first-run ad.

### Correct

Only the 4 anonymized fields. Non-skippable player. **First-run ad = 30s, renewal ad = 60s** (renewal is longer to disincentivize gaming the system).

## Related

- [concepts/lgpd-anonymization.md](lgpd-anonymization.md) — Forbidden fields, CI guardrail, Legal sign-off
- [concepts/product-identity.md](product-identity.md) — Tagline, audiences, tech stack context
- [patterns/content-templates.md](../patterns/content-templates.md) — Pre-written portal-flow slide content
- [patterns/pt-br-formatting.md](../patterns/pt-br-formatting.md) — Chip values and UI strings
