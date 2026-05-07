# RBD Slide Builder Quick Reference

> Fast lookup tables. For deep detail, see linked concept files.
> **MCP Validated:** 2026-04-14

## Benchmark Numbers (Canonical — Never Contradict)

| Metric | Value | Source |
|--------|-------|--------|
| N3 vs REM accuracy | **0.856 ± 0.013** | notes/07, results.json |
| Ko et al. (2022) threshold | **0.6402** | Ko et al. 2022 |
| Relative improvement | **+34%** | (0.856 − 0.6402) / 0.6402 |
| Fold 1 | 0.853 | results.json |
| Fold 2 | 0.842 | results.json |
| Fold 3 | 0.878 | results.json |
| Fold 4 | 0.865 | results.json |
| Fold 5 | 0.844 | results.json |
| Accuracy without features 9/13/14 | 0.589 | notes/07 D.2 |

## Dataset Statistics (MESA, 100 subjects)

| Fact | Value |
|------|-------|
| Total epochs | 2,251,782 |
| Subjects | 100 |
| Subjects with REM | 83 |
| REM epochs | 7,939 |
| N3 epochs | 6,065 |
| N2 epochs | 29,744 |
| N1 epochs | 4,624 |
| AWAKE epochs | 12,605 |
| Feature matrix (AWAKE excluded) | 48,372 × 15 |

## MESA-0144 (Benchmark Display Subject)

| Fact | Value |
|------|-------|
| Total PSG epochs | 865 |
| REM epochs | 243 |
| RBD events detected | 32 |
| RBD event rate | 13.2% |
| Clinical reference range | 10–30% (Frauscher 2012) |

## Top 5 Features by XGBoost Gain

| Rank | Feature | Gain | What it measures |
|------|---------|------|-----------------|
| 1 | `g_wide_range` | 0.156 | ±15 min max − min activity |
| 2 | `total_sleep_hours` | 0.140 | Night duration in hours |
| 3 | `elapsed_hours` | 0.133 | Hours since first labeled epoch |
| 4 | `epoch_position` | 0.115 | Relative [0,1] night position |
| 5 | `g_wide_std` | 0.091 | ±15 min activity variability |

## 8-Step Pipeline (A through H)

| Step | Component | Output |
|------|-----------|--------|
| A | Butterworth 0.5–8 Hz (4th-order SOS) | Filtered 4×7s sub-segments |
| B | Cole-Kripke 1992 (9-weight ±4 epoch convolution) | SLEEP/WAKE per epoch |
| C | NSRR clock-time alignment + Profusion XML | `final_sleep_stage` per epoch |
| D | Pydantic v2 EpochRecord validation | `output/epochs.parquet` |
| E | 15-feature matrix from EpochRecord scalars | 48,372 × 15 float32 |
| F | XGBoost 5-fold CV (`multi:softprob`, n=500, depth=5) | **0.856 ± 0.013** |
| G | REM isolation + twitch detector (Z>3σ for ≥25 samples) | 32/243 RBD events |
| H | 3-panel diagnostic dashboard | `benchmark_dashboard.png` |

## Slide Type Decision

| RBD Content | AIDE Slide Type |
|-------------|----------------|
| Project title / NFR-002 goal | `title` (title-standard) |
| "Beat Ko et al." hook | `hook-quote` (giant-quote-mark) |
| 0.856 ± 0.013 result | `stat-cards` (stat-card-4line) |
| 8-step pipeline | `flow-architecture` (svg-pipeline-horizontal) |
| 15 features table | `table` (standard) |
| Feature importance ranking | `bar-chart` (animated-bars) |
| Per-fold CV results | `stat-cards` |
| Dashboard 3 panels | `flow-architecture` (glassmorphism × 3) |
| Ko et al. comparison | `bar-chart` (animated-bars) |
| Closing / next steps | `closing-quote` (gold-quote) |

## Related Documentation

| Topic | Path |
|-------|------|
| Full benchmark details | `concepts/benchmark-results.md` |
| Pipeline architecture | `concepts/pipeline-architecture.md` |
| Feature engineering | `concepts/feature-engineering.md` |
| Clinical context | `concepts/clinical-context.md` |
| Deck types + content maps | `patterns/slide-deck-types.md` |
| Pre-written slide content | `patterns/content-templates.md` |
| Full index | `index.md` |
