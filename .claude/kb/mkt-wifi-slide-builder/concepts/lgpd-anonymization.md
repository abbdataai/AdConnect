# LGPD Anonymization Mandate

> **Purpose**: The non-negotiable LGPD-by-design mandate for the MKT WiFi captive portal
> **Confidence**: 0.98
> **MCP Validated:** 2026-05-04

## Overview

Under FR-023, FR-024, and NFR-005, the MKT WiFi captive portal is forbidden from collecting any personally-identifying field beyond a strictly anonymized 4-field set. The Departamento Jurídico signed off on the platform on **2026-05-03** *conditioned on this anonymization*. CI guardrail `backend/scripts/grep_pii_check.sh` (AT-015) blocks any PR that re-introduces a forbidden field. **This concept is CRITICAL — slides must never imply collection of any forbidden field.**

## What the Portal Collects (the only 4)

| Field | Type | Allowed Values |
|-------|------|----------------|
| `name` | first name only | free text |
| `age_band` | chip group (`Literal`) | `18-24` / `25-34` / `35-50` / `50+` |
| `gender` | chip group (`Literal`) | `Feminino` / `Masculino` / `Prefiro não informar` |
| `neighborhood` | select (`Literal`) | `Centro` / `Zona Norte` / `Zona Sul` / `Zona Leste` / `Zona Oeste` / `Praia` |

Plus: a **mandatory** LGPD consent checkbox. Submit is disabled until the checkbox is checked.

## What the Portal MUST NEVER Collect

The portal MUST NOT collect, request, store, or display any of:

| Forbidden Field | Why it is forbidden |
|-----------------|---------------------|
| Phone | Direct PII; not anonymizable |
| Email | Direct PII; not anonymizable |
| CPF | Direct PII (Brazilian national ID); strictly forbidden |
| Last name (sobrenome) | Combined with first name → identifiable |
| Exact birthdate | Combined with neighborhood → re-identifiable |
| MAC address visible to user | Device-identifier; cannot be shown in UI |

> **Note:** The MAC address may exist in backend telemetry for technical reasons but is **never** displayed or requested in the user-facing portal.

## Enforcement Mechanism

Three layers enforce this mandate:

| Layer | Mechanism | Code |
|-------|-----------|------|
| Schema | Pydantic `model_config = ConfigDict(extra="forbid")` on the form payload model | `backend/schemas/portal.py` |
| Type | `Literal[...]` constrains chip-group and select values | `backend/schemas/portal.py` |
| CI | `grep_pii_check.sh` scans diff for the forbidden tokens (phone, email, CPF, sobrenome, birthdate, MAC) | `backend/scripts/grep_pii_check.sh` (AT-015) |

If any of these layers detects a regression, the PR is blocked.

## Legal Sign-Off

| Fact | Value |
|------|-------|
| Sign-off body | Departamento Jurídico |
| Sign-off date | **2026-05-03** |
| Condition | Anonymization as documented in NFR-005 + FR-023 + FR-024 |
| Risk register reference | R3 (LGPD non-compliance) |

The sign-off is **conditional**: any change that loosens anonymization invalidates it and requires re-review by Legal.

## Slide Pattern: 3-Tier Comparison

LGPD compliance slides use a 3-tier `tier-cards` layout:

| Tier | Heading | Content |
|------|---------|---------|
| 1 | "Coletamos" | Nome (primeiro), Faixa etária (chips), Gênero (chips), Bairro (select) |
| 2 | "Não coletamos" | Telefone, Email, CPF, Sobrenome, Data de nascimento, MAC visível |
| 3 | "Como garantimos" | Pydantic `extra="forbid"`, `Literal` types, `grep_pii_check.sh` em CI |

Bottom panel must include: "Sign-off do Departamento Jurídico em 2026-05-03 condicionado à anonimização" plus tags `[LGPD] [NFR-005] [FR-023] [AT-015]`.

## Common Mistakes

### Wrong

Listing "phone (optional)" or "email (optional)" anywhere; showing CPF on a screenshot; describing the form as "lightweight" without naming the LGPD mandate; omitting the Legal sign-off date.

### Correct

The 4 fields are listed by name, the forbidden list is named explicitly with each item crossed out or framed as "Não coletamos", and the Legal sign-off date `2026-05-03` is cited verbatim with FR-023 / NFR-005 footnotes.

## Related

- [concepts/captive-portal-flow.md](captive-portal-flow.md) — Where the form sits in the flow
- [concepts/product-identity.md](product-identity.md) — Why anonymization is part of positioning
- [patterns/content-templates.md](../patterns/content-templates.md) — LGPD slide content templates
