# Content Templates

> **Purpose**: Pre-written slide content for all major RBD project topics
> **MCP Validated:** 2026-04-14

## When to Use

Use these templates as starting text. Adapt wording for audience but never alter the numbers.

## Title Slide Templates

### Benchmark Results Title
```
Headline:   "Beating Ko et al. — 0.856 ± 0.013 N3 vs REM Accuracy"
Subtitle:   "5-fold cross-validation on 100 MESA subjects | XGBoost + temporal features"
Tags:       [RBD Detection] [MESA Dataset] [Sleep Staging] [XGBoost]
```

### Pipeline Architecture Title
```
Headline:   "From MESA CSV to RBD Diagnosis in 8 Steps"
Subtitle:   "A reproducible extraction, staging, and detection pipeline"
Tags:       [Cole-Kripke] [Pydantic v2] [Butterworth Filter] [Parquet]
```

### Feature Engineering Title
```
Headline:   "Why Temporal Position Unlocks 85.6% Accuracy"
Subtitle:   "When N3 and REM look the same — the model learned *when*, not *how much*"
Tags:       [g_wide_range] [epoch_position] [elapsed_hours] [XGBoost gain]
```

### Clinical Interpretation Title
```
Headline:   "RBD Detection from Actigraphy — 13.2% Event Rate in MESA-0144"
Subtitle:   "Consistent with Frauscher et al. 2012 clinical range (10–30%)"
Tags:       [RBD] [REM sleep] [Frauscher 2012] [MESA-0144]
```

---

## Core Result Slides

### Benchmark Result Slide
```
Headline:   "0.856 ± 0.013 — N3 vs REM Accuracy"
Sub:        "5-fold stratified cross-validation on 83 MESA subjects with labeled REM"
Stat 1:     "0.856"  label: "Mean accuracy"
Stat 2:     "+34%"   label: "Over Ko et al."
Stat 3:     "0.842–0.878"  label: "Fold range"
Stat 4:     "5/5"    label: "Folds beat threshold"
Bottom:     "The Ko et al. (2022) threshold was 0.6402.
             All five folds individually surpass it.
             Tags: [XGBoost] [5-fold CV] [MESA] [N3 vs REM]"
Animation:  pulse-glow on "0.856" stat card
```

### Per-Fold Results Slide
```
Headline:   "Consistency Across All 5 Folds"
Folds:      0.853 / 0.842 / 0.878 / 0.865 / 0.844 — all beat 0.6402
Bottom:     "std = 0.013. Tags: [5-fold CV] [stratified] [random_state=42]"
```

### Ko et al. Comparison Slide
```
Headline:   "34% Relative Improvement Over State of the Art"
Visual:     Animated horizontal bars — Ko et al. bar fills to 64.0%, our bar fills to 85.6%
Bar 1:      Ko et al. (2022) — 64.0%  (shorter, labeled: "64.0% — prior state of the art")
Bar 2:      This work — 85.6%  (longer, labeled: "85.6% — +34% relative improvement")
Bottom:     "Ko et al. 2022: wearable actigraphy + machine learning for RBD screening.
             Our improvement: temporal position features (epoch_position, elapsed_hours).
             Tags: [XGBoost] [Ko 2022] [Biosensors] [+34%]"
Animation:  bars fill left-to-right on slide entry; gold pulse-glow on 85.6% bar
```

---

## Feature Importance Slides

### Feature Importance Bar Chart Slide
```
Headline:   "Top 5 Features by XGBoost Gain"
Visual:     Horizontal animated bars — 5 rows
Row 1:      g_wide_range        0.156  ████████████████
Row 2:      total_sleep_hours   0.140  ██████████████
Row 3:      elapsed_hours       0.133  █████████████
Row 4:      epoch_position      0.115  ████████████
Row 5:      g_wide_std          0.091  █████████
Bottom:     "Three of the top 5 are temporal (position in the night).
             g_wide_range (±15 min range) ranks #1: N3 epochs are stable,
             REM epochs have occasional burst activity.
             Tags: [g_wide_range] [temporal] [XGBoost gain] [feature importance]"
Animation:  bars fill left-to-right sequentially; pulse-glow on g_wide_range bar
```

### Temporal Feature Insight Slide
```
Headline:   "The Critical Triad: Features 9, 13, and 14"
Sub:        "Remove them — accuracy drops to 0.589. Keep them — 0.856."
Card 1:     Feature 9 | epoch_position | "Relative [0,1] night position"
Card 2:     Feature 13 | elapsed_hours | "Absolute hours since sleep onset"
Card 3:     Feature 14 | total_sleep_hours | "Night duration (the denominator)"
Insight:    "epoch_position needs elapsed_hours to work:
             0.5 in a 4-hour night ≠ 0.5 in an 8-hour night.
             XGBoost learns the interaction."
Bottom:     "Without all three together: 0.589. With all three: 0.856.
             Tags: [epoch_position] [elapsed_hours] [total_sleep_hours] [interaction]"
Animation:  pulse-gold on center insight text
```

### N3 vs REM Confusion Slide
```
Headline:   "N3 and REM Are Indistinguishable by Amplitude"
Type:       method-grid (center-divider)
Left:       N3 — first 1/3 of night — G-value near zero
Right:      REM — last 1/3 of night — G-value near zero
Center:     "Both → near-zero G. Separator is *when*, not *how much*."
Bottom:     "Tags: [N3] [REM] [actigraphy] [temporal position]"
```

---

## Pipeline Architecture Slides

### Pipeline Overview Slide
```
Headline:   "From MESA CSV to RBD Diagnosis in 8 Steps"
Visual:     SVG horizontal pipeline — 8 nodes, viewBox=1100
Nodes:      [A: Filter] → [B: Cole-Kripke] → [C: NSRR Align] → [D: Validate]
            → [E: Features] → [F: XGBoost] → [G: REM Detect] → [H: Dashboard]
Colors:     Nodes: navy-dark bg, cyan border; arrows: SVG path with glow filter
Text:       Node label 16px, description 11px, text color #c8d8e8
Bottom:     "All 104 tests pass before any subject is processed.
             Full pipeline runtime: ~5–15 min for 100 subjects (I/O bound extraction).
             Tags: [SOS Filter] [Cole-Kripke] [Pydantic v2] [Parquet]"
```

### Dataset Statistics Slide
```
Headline:   "2,251,782 Epochs — 100 MESA Subjects"
Stats:      2,251,782 total | 100 subjects | 83 with REM | 7,939 REM epochs
Table:      N2=29,744 | REM=7,939 | N3=6,065 | N1=4,624 | AWAKE=12,605
Bottom:     "AWAKE excluded from training. Tags: [MESA] [NSRR] [Profusion XML] [Parquet]"
```

---

## Dashboard and Clinical Slides

### Dashboard Overview Slide
```
Headline:   "Diagnostic Dashboard — Subject MESA-0144"
Type:       flow-architecture (glassmorphism × 3)
Panel 1:    Hypnogram — 865 PSG epochs; REM windows (blue) dominate late night
Panel 2:    Accelerometry — 243 REM epochs; 32 flagged red (13.2%); ▼ twitch markers; ±3σ gold lines
Panel 3:    Status — "DISORDER EVENT IDENTIFIED" (red alert box)
Bottom:     "13.2% matches Frauscher 2012 (10–30%). Tags: [MESA-0144] [32/243] [twitch detector]"
Animation:  pulse-glow on Panel 3
```

### Clinical Validation Slide
```
Headline:   "13.2% Event Rate — Within Clinical Range"
Sub:        "Frauscher et al. 2012: 10–30% of REM epochs show phasic activity in confirmed RBD"
Tier 1:     Below 10% | "Unlikely RBD — low event rate"
Tier 2:     10–30%    | "Consistent with confirmed RBD (Frauscher 2012)" ← MESA-0144: 13.2%
Tier 3:     Above 30% | "Severe RBD or detection artifact"
Bottom:     "MESA-0144's 13.2% falls in the middle of the clinical range.
             The detector is not over-firing or under-firing.
             Tags: [Frauscher 2012] [RBD] [clinical validation] [10–30%]"
Animation:  pulse-gold on Tier 2 card
```

---

## Hook and Closing Slides

### Hook Slide
```
Type:       hook-quote (giant-quote-mark)
Quote:      "Ko et al. (2022) set the bar at 64%. We achieved 85.6% — same modality,
             same task, one insight: *when* in the night each epoch occurs."
Attribution: "NFR-002 target: beat 0.6402. Result: 0.856 ± 0.013."
```

### Closing Slide
```
Type:       closing-quote (gold-quote)
Quote:      "The 34% improvement is a feature engineering insight, not a model win.
             N3 and REM have the same amplitude. They differ in *when* they occur."
Result:     "0.856 ± 0.013 | +34% | All 5 folds beat the threshold"
Tags:       [XGBoost] [temporal features] [MESA] [RBD detection]
```

## See Also

- [patterns/slide-deck-types.md](slide-deck-types.md) — Deck content maps
- [concepts/benchmark-results.md](../concepts/benchmark-results.md) — Canonical numbers
- [quick-reference.md](../quick-reference.md) — Fast lookup
