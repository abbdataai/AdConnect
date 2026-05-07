# Feature Engineering

> **Purpose**: 15-feature matrix design, temporal discriminators, and N3 vs REM confusion
> **Confidence**: 0.97
> **MCP Validated:** 2026-04-14

## Overview

The core challenge of RBD actigraphy classification is that N3 (slow-wave sleep) and REM
share near-zero G-values — both stages involve minimal physical movement. Standard amplitude
features cannot separate them. The breakthrough is exploiting **temporal position** within the
sleep cycle, where N3 and REM are physiologically segregated.

## The N3 vs REM Confusion Problem

| Stage | Typical G-value | Night position |
|-------|----------------|----------------|
| N3 | Near zero | First 1/3 of night (homeostatic drive highest) |
| REM | Near zero | Last 1/3 of night (lengthens each cycle) |
| N2 | Low-moderate | Throughout night |

Both N3 and REM produce near-zero actigraphy values. Amplitude-only classification treats
them as the same class — yielding accuracy near chance (0.589 without temporal features).

**The solution:** Features 9, 13, and 14 encode *when* in the night the epoch occurs.

## The 15 Features

| # | Feature | What it measures | Why it matters |
|---|---------|-----------------|----------------|
| 1 | `g_value` | Raw 30-second epoch activity count | Base actigraphy signal |
| 2 | `g_value_log1p` | log1p(g_value) | Reduces right skew from movement bursts |
| 3 | `heart_rate_bpm` | Optical PPG HR | All zeros in MESA (no PPG sensor) |
| 4 | `rr_interval_ms` | Mean RR interval | All zeros in MESA (no PPG sensor) |
| 5 | `g_rolling_mean` | ±2.5 min local mean (±5 epoch window) | Local activity level |
| 6 | `g_rolling_std` | ±2.5 min variability | Short-term movement variability |
| 7 | `g_rolling_max` | ±2.5 min peak | Short-term movement peaks |
| 8 | `g_delta` | g[i] − g[i−1] | Epoch-to-epoch momentum |
| **9** | **`epoch_position`** | **Relative position [0,1] within PSG night** | **KEY: night-normalized time** |
| 10 | `g_wide_mean` | ±15 min mean (±30 epoch window) | Long-horizon baseline |
| 11 | `g_wide_std` | ±15 min variability | Long-horizon movement variability |
| 12 | `g_wide_range` | ±15 min max − min | Top feature by XGBoost gain (0.156) |
| **13** | **`elapsed_hours`** | **Absolute hours since first labeled epoch** | **KEY: absolute time scale** |
| **14** | **`total_sleep_hours`** | **Total PSG night span in hours** | **KEY: denominator for position** |
| 15 | `g_wide_mean_deriv` | g_wide_mean[i] − g_wide_mean[i−1] | Activity trend direction |

Features are computed **per subject** — temporal features are anchored to each individual's
own PSG night, not averaged across subjects.

## Why Features 9, 13, and 14 Are Critical

### The interaction XGBoost learns

`epoch_position` (feature 9) alone is not sufficient because it loses absolute scale:
- Position 0.5 in a 4-hour night = 2 hours in → low REM probability
- Position 0.5 in an 8-hour night = 4 hours in → moderate REM probability

`elapsed_hours` (feature 13) restores absolute scale. `total_sleep_hours` (feature 14)
gives XGBoost the denominator separately, enabling it to learn the interaction between
absolute elapsed time and relative night position.

### Ablation result

| Features | Accuracy |
|----------|----------|
| All 15 features | **0.856** |
| Without features 9, 13, 14 | **0.589** |
| Improvement | +0.267 (45% relative) |

### Slide narrative (use this wording)

> "N3 and REM share near-zero G-values. The model learned *when* in the night an epoch
> occurs — not *how much* movement it contains."

## Top 5 Features by XGBoost Gain

| Rank | Feature | Gain | Category |
|------|---------|------|----------|
| 1 | `g_wide_range` | 0.156 | Long-horizon amplitude |
| 2 | `total_sleep_hours` | 0.140 | Temporal (critical triad) |
| 3 | `elapsed_hours` | 0.133 | Temporal (critical triad) |
| 4 | `epoch_position` | 0.115 | Temporal (critical triad) |
| 5 | `g_wide_std` | 0.091 | Long-horizon variability |

Three of the top 5 features are temporal. `g_wide_range` leading is notable: the ±15-minute
activity range distinguishes N3 (stable near-zero) from REM (occasional movement bursts).

## AWAKE Exclusion

AWAKE epochs are excluded from training because:
- Cole-Kripke "false-sleeps" (low G-value, early night position) overlap N3's feature space
- Including AWAKE introduces mislabeled training examples that degrade accuracy
- The Ko et al. protocol also evaluates only N3 vs REM — AWAKE exclusion ensures comparability

## Common Mistakes

### Wrong
Framing N3 vs REM as "amplitude-based classification" or showing them as separable by G-value.

### Correct
Both stages have near-zero G-values. Temporal position is the true discriminator. Always
show `epoch_position` / `elapsed_hours` as the core insight.

### Wrong
Saying features 3 and 4 (heart_rate_bpm, rr_interval_ms) contribute to the result.

### Correct
These features are all zeros in MESA (no PPG sensor). They are structural placeholders for
a complete feature schema — not contributors to the 0.856 result.

## Related

- [concepts/benchmark-results.md](benchmark-results.md) — The 0.856 result these features produce
- [concepts/pipeline-architecture.md](pipeline-architecture.md) — Step E (feature matrix) in pipeline
- [patterns/slide-deck-types.md](../patterns/slide-deck-types.md) — feature-engineering deck
