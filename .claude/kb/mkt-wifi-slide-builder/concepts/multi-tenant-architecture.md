# Multi-Tenant Architecture

> **Purpose**: Shared-database row-level isolation model for MKT WiFi (TD-08, TD-09, BD-08)
> **Confidence**: 0.95
> **MCP Validated:** 2026-05-04

## Overview

MKT WiFi runs as a single deployment that serves N independent operators (cafés, lojas, hotéis, redes de varejo) — each operator is a Tenant. Architecture decision BD-08 + TD-08 + TD-09 mandate a **shared-database row-level isolation** model: every table owned by an operator carries an indexed `organization_id` foreign key, and every read/write is filtered by the resolved tenant. There is no per-tenant schema and no per-tenant database.

## The Two Tenancy Resolution Paths

MKT WiFi resolves the active tenant differently depending on which surface the request comes from:

| Surface | Resolution Path | Example |
|---------|-----------------|---------|
| Admin SPA | **Subdomain** → tenant | `acme.mktwifi.com.br` → `organization_id = acme` |
| Captive Portal | **Device chain** → tenant | `device_id → venue_id → organization_id` |

The portal cannot use a subdomain because the end-user is anonymous and arrives via a device-issued URL.

## Row-Level Isolation Pattern

Every operator-owned table carries an `organization_id` FK. Examples (non-exhaustive):

| Table | `organization_id` FK | Notes |
|-------|----------------------|-------|
| `campaigns` | yes (indexed) | One row per campaign |
| `leads` | yes (indexed) | One row per captive-portal submission |
| `devices` | yes (indexed) | MikroTik routers, etc. |
| `venues` | yes (indexed) | Physical locations |
| `monetization_plans` | yes (indexed) | One active plan per tenant |
| `reports` | yes (indexed) | Tenant-scoped aggregates |

## Enforcement Mechanism

Two implementation options on the table; defaults marked:

| Mechanism | How it enforces | Trade-offs |
|-----------|-----------------|------------|
| **Postgres RLS** (default per BD-08) | Database-side `CREATE POLICY` on each tenant-owned table | Strongest guarantee, slight planner overhead, harder to bypass for analytics |
| SQLAlchemy event hooks | Application-side `before_compile` filter injecting `WHERE organization_id = :tenant` | Faster to evolve, easier to audit in code, but bypassable by raw SQL |

> The default is Postgres RLS (TD-09). The SQLAlchemy event-hook approach is documented as a fallback when a query path needs cross-tenant analytics under explicit super-user context.

## Architecture Diagram (for SVG slides)

```
[acme.mktwifi.com.br]      [device_id from MikroTik]
       │                            │
       ▼                            ▼
 [JWT auth header]            [GET /api/portal/bootstrap]
       │                            │
       └────────┬───────────────────┘
                ▼
        [resolve organization_id]
                │
                ▼
        [Postgres RLS filter on every query]
                │
                ▼
        [tenant-scoped rows only]
```

For a 4-node SVG slide, use viewBox ≥ 900; for a fuller diagram with subdomain + device chain side-by-side, use viewBox ≥ 1200.

## Risks (R15-R17 from summary-requiments.md §13)

| Risk ID | Concern | Mitigation |
|---------|---------|------------|
| R15 | RLS policy missing on a new table → cross-tenant leak | CI test asserts `pg_policies` covers every tenant-owned table |
| R16 | Subdomain spoofing → wrong tenant resolved | Validate subdomain against `organizations.subdomain` allow-list at auth time |
| R17 | Device-chain misconfiguration → portal serves wrong campaign | Bootstrap endpoint asserts `device_id` resolves to exactly one `organization_id` |

## Common Mistakes

### Wrong

Pitching the architecture as "schema-per-tenant" or "database-per-tenant" — it is neither. Forgetting the device-chain path and pretending subdomain resolution is the only resolution mechanism.

### Correct

**One database, one schema, one row per operator's record — filtered by `organization_id` at every layer.** Two resolution paths: subdomain (admin) and device chain (portal). RLS by default; event-hook fallback for super-user analytics.

## Related

- [concepts/product-identity.md](product-identity.md) — Tech stack and architecture summary
- [concepts/captive-portal-flow.md](captive-portal-flow.md) — Where the device chain runs
- [patterns/content-templates.md](../patterns/content-templates.md) — Multi-tenant architecture slide content
