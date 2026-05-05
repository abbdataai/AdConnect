# Slide Anatomy

> **Purpose**: Decompose a slide into its parts so each can be evaluated and fixed independently.
> **Confidence**: 0.95
> **MCP Validated**: 2026-04-30

## Overview

Every effective slide has the same five parts: title, body, visual hierarchy, optional asset, speaker notes. When a slide feels off, the failure is almost always in one specific part — diagnosing which one is faster than rewriting the whole slide.

## The Five Parts

| Part | Purpose | Limit |
|------|---------|-------|
| Title | One claim or question that the slide answers | ≤ 7 words |
| Body | Bullets / diagram / image that supports the title | 6×6 default |
| Visual hierarchy | Eye path from most → least important | 1 focal point |
| Asset (optional) | Image, chart, or code block | 1 per slide |
| Speaker notes | What the presenter says, not what's on screen | unlimited |

## The 6×6 Rule

The 6×6 rule (also called 1-6-6) is the default density limit: one main idea, ≤ 6 bullets, ≤ 6 words per bullet. Audiences need to grasp a slide in under five seconds; beyond that they read instead of listen, and the speaker becomes redundant.

```text
TITLE: One claim (≤7 words)

- Bullet ≤6 words
- Bullet ≤6 words
- Bullet ≤6 words
- Bullet ≤6 words
- Bullet ≤6 words
- Bullet ≤6 words

[ speaker notes go here, unlimited ]
```

When you must break the rule (code listings, definitions, tables), break it deliberately and commit fully — don't half-break it with 8 cramped bullets.

## Visual Hierarchy

The eye lands on whatever is biggest, brightest, or most isolated. A slide has good hierarchy when the audience looks at the right thing first without thinking. Common hierarchies:

| Layout | Focal Point |
|--------|-------------|
| Title + bullets | Title (largest type) |
| Image-dominant | The image (>50% of slide) |
| Big number | The number (60pt+) |
| Code | The highlighted line |
| Two-column compare | The contrast (color or layout difference) |

## Speaker Notes

Notes are the speaker's safety net. Every slide that has any nuance should have notes:

- The transition phrase from the previous slide
- The point of the slide in one sentence
- The number / fact the speaker must say correctly
- The transition out

Marp uses HTML comments. Slidev has a `<!-- -->` block per slide. reveal.js uses `<aside class="notes">`. PPTX has a dedicated notes pane.

## Quick Reference

| Symptom | Failing Part |
|---------|--------------|
| "I don't get it in 5 seconds" | Title or hierarchy |
| "Too much to read" | Body density (6×6 broken) |
| "Looks ugly" | Visual hierarchy or contrast |
| "Speaker reads from slide" | Body too verbose, no notes |
| "Why is this slide here?" | No clear single claim in title |

## Common Mistakes

### Wrong: Title-as-Topic

```text
Title: "Architecture"
- Microservices
- API gateway
- Event bus
- Cache layer
```

The title is a topic, not a claim. The audience doesn't know what they're supposed to learn.

### Correct: Title-as-Claim

```text
Title: "Event bus decouples our services"
- Producers don't know consumers
- Consumers can be added without redeploys
- Failures are isolated per topic
```

The title makes a point; the bullets prove it.

### Wrong: Slide With No Notes

```markdown
---
# Q3 Results

- Revenue up 12%
- Churn down 3%
- NPS at 42
---
```

The speaker has nothing to lean on if they blank.

### Correct: Slide With Notes

```markdown
---
# Q3 Results

- Revenue up 12%
- Churn down 3%
- NPS at 42

<!--
Open with: "Three numbers tell the Q3 story."
The 12% beats forecast by 4 points — driven by enterprise tier.
NPS at 42 is the highest since launch; cite the survey N=312.
Transition: "Now what's driving these numbers?"
-->
```

## Related

- [narrative-arc](narrative-arc.md)
- [visual-design](visual-design.md)
- [review-rubric pattern](../patterns/review-rubric.md)
