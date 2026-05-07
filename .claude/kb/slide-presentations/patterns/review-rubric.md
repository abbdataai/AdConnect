# Review Rubric (5-Axis Critique)

> **Purpose**: Audit a finished deck against five fixed axes so feedback is consistent, prioritized, and actionable.
> **MCP Validated**: 2026-04-30

## When to Use

- User shares a finished deck for critique before presenting
- Reviewing a teammate's deck in PR or working session
- Self-review before sending a deck to leadership
- Tightening a deck that "feels off" but the symptom isn't named

## Implementation

### Step 1: Read Straight Through, Cold

Open the deck and click through start to finish without stopping. Note your **first impression** per slide in one phrase: "clear", "confused at slide 4", "lost interest by slide 7", "wanted more depth here". This baseline is the most honest signal you'll get.

### Step 2: Score on Five Axes

Each axis 1–5. Aggregate score / 25 indicates overall health.

| Axis | What It Measures | 1 = Bad | 5 = Good |
|------|------------------|---------|----------|
| Clarity | Can a reader grasp each slide in 5 seconds? | Several slides need re-reading | Every slide is instantly legible |
| Flow | Does each slide earn its place; arc clear? | Slides feel disconnected | Each slide sets up the next |
| Density | Within 6×6 default? Bullet count reasonable? | Walls of text | Lean, audible, well-paced |
| Visual hierarchy | Eye guided to the key idea? | Flat layout, no focal point | Focal point obvious in <1s |
| Audience fit | Depth/tone match the stated audience? | Wrong jargon level | Calibrated to the room |

Score interpretation:

| Total | Status | Action |
|-------|--------|--------|
| 22–25 | Ship it | Tighten only the lowest axis |
| 17–21 | Strong, polish needed | Fix 1–3 highest-leverage edits |
| 12–16 | Restructure required | Re-outline before re-touching slides |
| < 12 | Start over | Save the content, abandon the deck |

### Step 3: Per-Slide Table

For each slide:

| # | Title | Works | To Fix | Severity |
|---|-------|-------|--------|----------|
| 1 | Cover | Title is sharp | Subtitle too vague | improvement |
| 2 | Problem | Hits the audience's pain | None | — |
| 3 | Stakes | Number is bold | Footnote contrast 2.1:1 | blocker |
| 4 | Solution | Diagram strong | Title is a topic, not a claim | improvement |
| 5 | Proof | Real data | Chart axis unlabeled | improvement |
| 6 | Ask | Specific | Reads more like a recap | blocker |

Severity vocabulary:

- **blocker** — must fix before presenting (factual error, accessibility failure, missing ask)
- **improvement** — clearly better if fixed; deck still works without
- **nit** — preference / polish; only fix if other axes are already 5

### Step 4: Top-3 Highest-Leverage Edits

Surface at the **top** of the review. These are what the user should fix even if they ignore everything else. Choose by impact × ease, not by slide order.

```markdown
## Top 3 Edits (apply these first)

1. Slide 6 (Ask): rewrite as "Approve $Y for 6-month rollout."
   The current slide reads as a recap; the audience leaves
   without a decision to make.
2. Slide 3 (Stakes footnote): increase contrast from 2.1:1 to 4.5:1.
   Footnote is the source citation — it must be readable.
3. Slide 4 (Solution title): change "Architecture" → "PWA + API
   replaces manual reconciliation." Title becomes a claim, not a topic.
```

## Output Template

```markdown
# Deck Review: <deck name>

## Top 3 Edits (apply these first)

1. ...
2. ...
3. ...

## Axis Scores (X / 25)

| Axis | Score | Notes |
|------|-------|-------|
| Clarity | 4/5 | Slide 4 title is a topic, not a claim |
| Flow | 4/5 | Slide 7 doesn't earn its place |
| Density | 5/5 | Within 6×6 throughout |
| Visual hierarchy | 3/5 | Three slides have no focal point |
| Audience fit | 4/5 | Slide 5 jargon assumes too much |

## Per-Slide Notes

| # | Title | Works | To Fix | Severity |
|---|-------|-------|--------|----------|
| ... | ... | ... | ... | ... |

## Strengths

- (always cite ≥ 1 — the user needs to know what to keep)

## Confidence and Sources

**Confidence:** {0.00–1.00}
**Sources:** Project: <deck path> | Reference: kb/slide-presentations/concepts/*
```

## Common Pitfalls

| Don't | Do |
|-------|-----|
| Skip "read straight through cold" | The first-impression pass is the only honest one |
| Produce only positive feedback | A real review names ≥ 1 weakness, even on great decks |
| Order by slide number | Order top-3 by leverage (impact × ease) |
| Conflate "blocker" with "I'd do it differently" | Blocker = factual / accessibility / missing-ask only |
| Review without knowing the audience | Audience-fit axis can't be scored without it |

## Worked Score Example

```markdown
Clarity: 4 — slide 4 title is a topic
Flow: 5 — clean arc, no orphan slides
Density: 5 — 6×6 throughout
Hierarchy: 3 — three slides flat
Audience fit: 4 — slide 5 jargon assumes too much

Total: 21/25 → Strong, polish needed.
Action: fix the 3 hierarchy slides, the slide-4 title,
the slide-5 jargon. Skip the rest.
```

## See Also

- [narrative-arc concept](../concepts/narrative-arc.md)
- [slide-anatomy concept](../concepts/slide-anatomy.md)
- [visual-design concept](../concepts/visual-design.md)
- [accessibility concept](../concepts/accessibility.md)
