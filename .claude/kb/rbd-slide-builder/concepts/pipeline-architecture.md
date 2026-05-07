# Pipeline Architecture

> **Purpose**: 8-step MESA processing pipeline from raw CSV to diagnostic dashboard
> **Confidence**: 0.97
> **MCP Validated:** 2026-04-14

## Overview

The RBD Actigrafia pipeline transforms three MESA file types (actigraphy CSV, Profusion XML,
NSRR XML) into a diagnostic artifact (3-panel PNG dashboard) through exactly 8 steps labeled
A through H. All 104 unit tests must pass before any subject data is processed.

## The 8 Steps

### Step A — Signal Filtering

| Property | Value |
|----------|-------|
| Filter type | Butterworth 4th-order bandpass |
| Frequency range | 0.5–8 Hz |
| Implementation | SOS (Second-Order Sections) form — numerically stable at low normalized frequencies |
| Input | Raw MESA actigraphy CSV (30-second epochs) |
| Output | 4 × 7-second filtered sub-segments (1,750 samples at 250 Hz; last 500 discarded) |
| Code | `src/preprocessing/filtering.py` |

### Step B — Cole-Kripke Sleep/Wake Scoring

| Property | Value |
|----------|-------|
| Algorithm | Cole & Kripke (1992) — classic actigraphy sleep scoring |
| Window | ±4 epochs (±2 minutes at 30-second resolution) |
| Method | 9-weight linear convolution over G-value sequence |
| Decision | D < 1.0 → SLEEP; D ≥ 1.0 → WAKE |
| Output | Binary SLEEP/WAKE label per epoch |
| Code | `src/extractor/cole_kripke.py` |

### Step C — PSG Stage Alignment

| Property | Value |
|----------|-------|
| Purpose | Align PSG sleep stage labels (from Profusion XML) to actigraphy epoch timeline |
| Clock-time source | NSRR XML — provides absolute recording start times |
| Fallback | Index-0 alignment if NSRR XML is absent (less accurate) |
| PSG codes | 0=Wake, 1=N1, 2=N2, 3=N3, 4=N3(old N4), 5=REM, 9=unscored |
| REM post-processing | Onset guard 45 min (90 epochs), min bout 5 min (10 epochs), gap bridge 3 min (6 epochs) |
| Output | `final_sleep_stage` per epoch (AWAKE/N1/N2/N3/REM/None) |
| Code | `src/extractor/stage_labeler.py`, `src/extractor/mesa_parser.py` |

### Step D — Pydantic Validation

| Property | Value |
|----------|-------|
| Schema | `EpochRecord` (Pydantic v2) |
| Quality threshold | >20% epoch failure rate → `SubjectQualityError` (subject excluded) |
| Output | `output/epochs.parquet` (snappy-compressed), `output/mesa.db` (SQLite) |
| Code | `src/extractor/validator.py`, `src/extractor/writer.py` |

### Step E — Feature Matrix Construction

| Property | Value |
|----------|-------|
| Input | `EpochRecord` scalar fields from epochs.parquet |
| Output | 48,372 × 15 float32 feature matrix |
| AWAKE excluded | Yes — AWAKE causes feature-space overlap with N3 |
| Temporal features | Computed per subject, anchored to each individual's PSG night |
| Code | `src/training/feature_builder.py` |

### Step F — XGBoost Classification

| Property | Value |
|----------|-------|
| Model | XGBoost `multi:softprob` |
| CV strategy | StratifiedKFold, 5 folds, random_state=42 |
| n_estimators | 500 |
| max_depth | 5 |
| Result | **0.856 ± 0.013** N3 vs REM accuracy |
| Output | `output/results.json`, `output/xgboost_staging.json` (best model) |
| Code | `src/models/xgboost_classifier.py` |

### Step G — REM Isolation and Twitch Detection

| Property | Value |
|----------|-------|
| Input | Epochs with `final_sleep_stage == REM` |
| RBD criterion 1 | G-value > 1500 (never fires in MESA — all REM G-values ≤ 1.0) |
| RBD criterion 2 | Z-score > 3σ for ≥ 25 contiguous samples (100 ms at 250 Hz) |
| Combination | OR logic — either criterion triggers RBD event flag |
| Benchmark result | 32 of 243 REM epochs flagged for MESA-0144 (13.2%) |
| Code | `src/detection/rem_filter.py`, `src/detection/twitch_detector.py` |

### Step H — Diagnostic Dashboard

| Property | Value |
|----------|-------|
| Script | `scripts/generate_benchmark_dashboard.py` |
| Output | `output/benchmark_dashboard.png` |
| Panel 1 | Hypnogram — full PSG night, REM windows shaded blue |
| Panel 2 | Concatenated REM accelerometry signal; RBD events shaded red; ▼ twitch onset markers |
| Panel 3 | Status alert — "DISORDER EVENT IDENTIFIED" (red) or "NO DISORDER EVENTS" (green) |
| MESA note | No raw 250 Hz waveforms in MESA → dashboard uses synthesized signals with real G-values |

## Pipeline Flow Diagram (for SVG slides)

```
MESA CSV + Profusion XML + NSRR XML
    │
    ├─ A: Butterworth Filter (0.5–8 Hz SOS)
    │       └─ 4×7s sub-segments
    │
    ├─ B: Cole-Kripke 1992 (9-weight convolution)
    │       └─ SLEEP/WAKE per epoch
    │
    ├─ C: NSRR Align + Profusion XML parse
    │       └─ final_sleep_stage per epoch
    │
    ├─ D: Pydantic v2 EpochRecord validation
    │       └─ epochs.parquet (2,251,782 rows)
    │
    ├─ E: 15-feature matrix builder
    │       └─ 48,372 × 15 float32
    │
    ├─ F: XGBoost 5-fold CV
    │       └─ 0.856 ± 0.013
    │
    ├─ G: REM isolation + twitch detector
    │       └─ 32/243 RBD events (MESA-0144)
    │
    └─ H: 3-panel diagnostic dashboard
            └─ benchmark_dashboard.png
```

## Input Files

| File type | NSRR path pattern | Subjects |
|-----------|-------------------|---------|
| Actigraphy CSV | `actigraphy/mesa-sleep-{id}.csv` | 100 |
| Profusion XML | `polysomnography/annotations-events-profusion/mesa-sleep-{id}-profusion.xml` | 100 |
| NSRR XML | `polysomnography/annotations-events-nsrr/mesa-sleep-{id}-nsrr.xml` | 100 (optional) |

## Related

- [concepts/feature-engineering.md](feature-engineering.md) — Step E detail
- [concepts/benchmark-results.md](benchmark-results.md) — Step F result
- [concepts/clinical-context.md](clinical-context.md) — Step H interpretation
