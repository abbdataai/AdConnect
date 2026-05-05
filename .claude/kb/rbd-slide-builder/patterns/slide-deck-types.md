# Slide Deck Types

> **Purpose**: 5 deck types with content maps, slide-type assignments, and narrative arcs
> **MCP Validated:** 2026-04-14

## When to Use

- When user requests any presentation, slides, or deck about the RBD project
- When clarifying scope: ask the user which deck type they need
- When user says "slides about feature importance" → use `feature-engineering` deck
- When user says "presentation for the committee" → use `benchmark-results` or `full-project`

## The 5 Deck Types

### 1. `benchmark-results`

**Audience:** Researchers, thesis committee, reviewers
**Core message:** We beat Ko et al. 0.6402 with 0.856 ± 0.013 — here is how and why
**Slide count:** 8–10 slides

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "Beating Ko et al. — 0.856 N3 vs REM Accuracy" | `title` (title-standard) |
| 2 | Hook: giant quote mark — "+34% over the state of the art" | `hook-quote` |
| 3 | The goal: NFR-002 — beat 0.6402 | `stat-cards` |
| 4 | Dataset stats: 2.25M epochs, 83 subjects with REM | `stat-cards` (stat-card-4line) |
| 5 | XGBoost config + feature matrix (48,372 × 15) | `table` |
| 6 | Per-fold results: 0.853 / 0.842 / 0.878 / 0.865 / 0.844 | `stat-cards` |
| 7 | Feature importance bar chart (top 5 by gain) | `bar-chart` (animated-bars) |
| 8 | Comparison: 0.640 vs 0.856 animated bars | `bar-chart` |
| 9 | Closing: "All 5 folds beat the threshold. +34% relative improvement." | `closing-quote` (gold-quote) |

**SVG required on:** slides 8 (animated comparison bars)

---

### 2. `pipeline-architecture`

**Audience:** Technical reviewers, engineers, thesis technical chapter
**Core message:** 8 rigorous steps from raw MESA data to reproducible diagnostic output
**Slide count:** 10–12 slides

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "From MESA CSV to RBD Diagnosis in 8 Steps" | `title` |
| 2 | Pipeline overview SVG — 8 nodes horizontal | `flow-architecture` (svg-pipeline-horizontal) |
| 3 | Steps A+B: Signal filter + Cole-Kripke | `method-grid` |
| 4 | Step C: NSRR clock-time alignment detail | `pipeline` |
| 5 | Step D: Pydantic v2 schema validation | `table` |
| 6 | Steps E+F: Feature matrix → XGBoost | `stat-cards` |
| 7 | Step G: REM isolation + twitch detector | `method-grid` |
| 8 | Step H: 3-panel dashboard overview | `flow-architecture` (glassmorphism × 3) |
| 9 | Data directory structure | `table` |
| 10 | Full command sequence (5 commands) | `table` or `pipeline` |
| 11 | Reproducibility: random_state=42, 104 tests pass | `stat-cards` |

**SVG required on:** slide 2 (8-node pipeline), slide 8 (3-panel glassmorphism)

---

### 3. `feature-engineering`

**Audience:** Data scientists, ML reviewers
**Core message:** Temporal position unlocks 85.6% accuracy — not amplitude
**Slide count:** 8–10 slides

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "Why Temporal Position Unlocks 85.6% Accuracy" | `title` |
| 2 | Hook: "N3 and REM both have near-zero G-values" | `hook-quote` |
| 3 | Sleep architecture: N3 first 1/3, REM last 1/3 | `method-grid` (center-divider) |
| 4 | The 15 features — full table | `table` |
| 5 | Feature importance bar chart — animated bars | `bar-chart` (animated-bars) |
| 6 | The critical triad: features 9/13/14 | `stat-cards` |
| 7 | Ablation result: 0.589 → 0.856 | `bar-chart` |
| 8 | Why epoch_position needs elapsed_hours (interaction) | `method-grid` |
| 9 | Closing: "The model learned *when*, not *how much*" | `closing-quote` |

**SVG required on:** slide 5 (animated bars), slide 7 (ablation comparison bars)

---

### 4. `clinical-interpretation`

**Audience:** Clinical collaborators, medical reviewers
**Core message:** 13.2% RBD event rate is clinically valid; detection is within Frauscher 2012 range
**Slide count:** 8–10 slides

| Slide | Content | AIDE Slide Type |
|-------|---------|----------------|
| 1 | Title: "RBD Detection from Actigraphy — Clinical Validation" | `title` |
| 2 | What is RBD: loss of REM atonia, abnormal motor activity | `hook-quote` |
| 3 | Normal sleep architecture: N3 first 1/3, REM last 1/3 | `method-grid` |
| 4 | Clinical reference range: 10–30% (Frauscher 2012) | `tier-cards` (3-tier comparison) |
| 5 | MESA-0144 hypnogram description — REM windows late night | `flow-architecture` |
| 6 | Dashboard Panel 2: 243 REM epochs, 32 flagged red (13.2%) | `stat-cards` |
| 7 | Dashboard status panel: "DISORDER EVENT IDENTIFIED" | `stat-cards` |
| 8 | MESA data caveat: no raw 250 Hz waveforms | `table` |
| 9 | Closing: "13.2% is within clinical range — detector is valid" | `closing-quote` |

**SVG required on:** slide 5 (hypnogram schematic)

---

### 5. `full-project`

**Audience:** Thesis defense, conference presentation, general stakeholders
**Core message:** End-to-end story from MESA raw data to +34% improvement over state of the art
**Slide count:** 16–20 slides (combination of all 4 above)

**Recommended structure:**
1. Title + project overview
2. Problem: RBD prevalence + screening gap
3. Dataset: MESA — 2.25M epochs, 100 subjects
4. Pipeline overview SVG (8 nodes)
5. Signal processing: filter + Cole-Kripke
6. PSG alignment and validation
7. Feature matrix: 15 features
8. The temporal insight: N3 vs REM confusion
9. Feature importance: g_wide_range #1
10. Benchmark result: 0.856 ± 0.013
11. Per-fold results: all 5 beats Ko et al.
12. Ko et al. comparison: animated bars
13. RBD event detection: twitch detector
14. Dashboard: MESA-0144 case
15. Clinical validation: Frauscher 2012 range
16. Next steps / future work
17. Closing quote: "+34%"

## Narrative Arc (Use Across All Decks)

The consistent project narrative is:

> **The problem:** N3 and REM look identical in actigraphy (both near-zero G-values).
> Ko et al. (2022) achieved 64% accuracy — near chance.
>
> **The insight:** They differ in *when* they occur during the night.
>
> **The result:** 0.856 ± 0.013 — +34% relative improvement — all 5 folds beat the threshold.
>
> **The validation:** MESA-0144 shows 13.2% RBD event rate, matching Frauscher 2012's 10–30%.

## File Naming Convention

Output files go in:
```
presentation/rbd/
├── benchmark-results/benchmark-results-slides.html
├── pipeline-architecture/pipeline-architecture-slides.html
├── feature-engineering/feature-engineering-slides.html
├── clinical-interpretation/clinical-interpretation-slides.html
└── full-project/full-project-slides.html
```

## See Also

- [patterns/content-templates.md](content-templates.md) — Pre-written slide content
- [concepts/benchmark-results.md](../concepts/benchmark-results.md) — Canonical numbers
- [quick-reference.md](../quick-reference.md) — Fast lookup
