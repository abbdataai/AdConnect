# RBD Slide Builder Knowledge Base

> **Purpose**: Canonical facts, domain knowledge, and slide patterns for the RBD Actigraphy benchmark project
> **MCP Validated:** 2026-04-14

## Quick Navigation

### Concepts (< 150 lines each)

| File | Purpose |
|------|---------|
| [concepts/benchmark-results.md](concepts/benchmark-results.md) | 0.856 accuracy, 5-fold CV, Ko et al. comparison |
| [concepts/pipeline-architecture.md](concepts/pipeline-architecture.md) | 8-step MESA processing pipeline (A through H) |
| [concepts/feature-engineering.md](concepts/feature-engineering.md) | 15 features, temporal discriminators, N3 vs REM confusion |
| [concepts/clinical-context.md](concepts/clinical-context.md) | RBD pathophysiology, Frauscher 2012, MESA-0144 case |

### Patterns (< 200 lines each)

| File | Purpose |
|------|---------|
| [patterns/slide-deck-types.md](patterns/slide-deck-types.md) | 5 deck types with content maps and slide-type assignments |
| [patterns/content-templates.md](patterns/content-templates.md) | Pre-written slide content for all major topics |

---

## Quick Reference

- [quick-reference.md](quick-reference.md) — Fast lookup: numbers, features, pipeline steps

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **N3 vs REM accuracy** | 0.856 ± 0.013 — the primary benchmark metric |
| **Ko et al. threshold** | 0.6402 — the baseline this project beats by +34% |
| **Temporal features** | epoch_position + elapsed_hours + total_sleep_hours are the key discriminators |
| **MESA-0144** | Benchmark display subject: 865 PSG epochs, 243 REM, 32 RBD events (13.2%) |
| **Pipeline steps** | 8 steps: A (filter) through H (dashboard) |

---

## Learning Path

| Level | Files |
|-------|-------|
| **Start here** | quick-reference.md → concepts/benchmark-results.md |
| **Technical depth** | concepts/pipeline-architecture.md → concepts/feature-engineering.md |
| **Slide generation** | patterns/slide-deck-types.md → patterns/content-templates.md |
| **Clinical framing** | concepts/clinical-context.md |

---

## Agent Usage

| Agent | Primary Files | Use Case |
|-------|---------------|----------|
| rbd-slide-builder | All files in this KB | Generate factually accurate HTML slide decks |

---

## Design System Reference

This KB supplements — but does not replace — the AIDE design system:

| AIDE KB File | Purpose |
|--------------|---------|
| `.claude/kb/aide-slides/quality-rules.md` | Layout, typography, screen-filling rules |
| `.claude/kb/aide-slides/design-system.md` | Navy/cyan/gold palette, Instrument Serif |
| `.claude/kb/aide-slides/component-library.md` | 20+ CSS components |
| `.claude/kb/aide-slides/slide-types.md` | 14 slide type layouts |
| `.claude/kb/aide-slides/advanced-visuals.md` | SVG pipelines, glassmorphism |
| `.claude/kb/aide-slides/template.md` | HTML skeleton |
| `.claude/kb/aide-slides/slide-engine.md` | SlideEngine JS |
| `.claude/kb/aide-slides/animation-patterns.md` | Shimmer, pulse-glow, bar-fill |
