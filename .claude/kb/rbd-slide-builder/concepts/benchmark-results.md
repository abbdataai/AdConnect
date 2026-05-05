# Benchmark Results

> **Purpose**: Canonical benchmark numbers for the RBD N3 vs REM classification task
> **Confidence**: 0.98
> **MCP Validated:** 2026-04-14

## Overview

The RBD Actigrafia benchmark evaluates XGBoost sleep stage classification on the MESA dataset,
specifically targeting the N3 vs REM discrimination task. The primary result is 0.856 ± 0.013
accuracy under 5-fold stratified cross-validation, beating the Ko et al. (2022) threshold of
0.6402 by a relative margin of +34%.

## The Numbers

### Primary Result

| Metric | Value |
|--------|-------|
| N3 vs REM accuracy (mean) | **0.856** |
| Standard deviation | **± 0.013** |
| Beats Ko et al. (2022) | YES |
| Ko et al. threshold | 0.6402 |
| Relative improvement | +34% |

### Per-Fold Breakdown

| Fold | Accuracy | Beats 0.6402? |
|------|----------|---------------|
| Fold 1 | 0.853 | YES |
| Fold 2 | 0.842 | YES |
| Fold 3 | 0.878 | YES |
| Fold 4 | 0.865 | YES |
| Fold 5 | 0.844 | YES |

**Key narrative:** All five folds individually surpass the Ko et al. threshold. The result is
not a lucky average — it is robust across every partition.

### Training Set

| Fact | Value |
|------|-------|
| Feature matrix shape | 48,372 × 15 |
| Excluded class | AWAKE (causes feature-space overlap with N3) |
| CV strategy | StratifiedKFold(n_splits=5, random_state=42) |
| XGBoost objective | multi:softprob |
| n_estimators | 500 |
| max_depth | 5 |
| learning_rate | 0.05 |
| subsample / colsample_bytree | 0.8 / 0.8 |
| Class weighting | compute_sample_weight("balanced", y) |

## What the Metric Measures

The benchmark metric is computed **only on epochs where the true PSG label is N3 or REM**.
All other sleep stages (N1, N2, AWAKE) are excluded from the denominator. This matches the
Ko et al. (2022) evaluation protocol exactly — making the comparison valid.

## Why This Result Is Significant

N3 (slow-wave sleep) and REM share near-zero actigraphy G-values — both stages involve
very low physical movement. Classifying them by amplitude alone yields accuracy near chance.
The 0.856 result is achieved by exploiting **temporal position within the sleep cycle**,
which reliably separates the two stages. See `concepts/feature-engineering.md` for the
mechanism.

## Reference Coordinates

These exact values appear in `output/results.json` after a full pipeline run:

```json
{
  "n3_vs_rem_mean": 0.8565,
  "n3_vs_rem_std": 0.0134,
  "beats_ko_et_al": true,
  "ko_et_al_threshold": 0.6402,
  "per_fold_scores": [0.853, 0.842, 0.878, 0.865, 0.844]
}
```

If `output/results.json` exists, it overrides notes/07 as the authoritative source.

## Common Mistakes

### Wrong
Stating the improvement as "+21.6 percentage points" (absolute difference 0.856 − 0.640).

### Correct
Stating the improvement as "+34% relative" — calculated as (0.856 − 0.6402) / 0.6402 = 0.337.
Both are defensible, but "+34% relative improvement" matches the project's own framing.

## Related

- [concepts/feature-engineering.md](feature-engineering.md) — Why temporal features produce this result
- [concepts/pipeline-architecture.md](pipeline-architecture.md) — Step F (XGBoost) in context
- [patterns/slide-deck-types.md](../patterns/slide-deck-types.md) — benchmark-results deck layout
