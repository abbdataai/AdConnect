# Visual Design

> **Purpose**: Apply typography, color, and whitespace rules so slides are legible from the back of the room.
> **Confidence**: 0.95
> **MCP Validated**: 2026-04-30

## Overview

Visual design is not decoration — it's the difference between a slide that lands and a slide that loses the audience. Three measurable rules cover ~90% of design problems on technical slides: typography minimums, contrast minimums, and disciplined whitespace.

## Typography Minimums

For a slide projected in a room (the worst-case viewing condition):

| Element | Minimum | Recommended |
|---------|---------|-------------|
| Body text | 24pt | 28–32pt |
| Headings | 36pt | 44pt+ |
| Code blocks | 22pt | 24–28pt |
| Footnotes | 18pt | 20pt |
| Big-number callout | 60pt | 80–120pt |

WCAG defines "large text" as 18pt+ or 14pt+ bold; below that, contrast requirements tighten. For projection specifically, 24pt body / 36pt heading is the floor — go higher when the room is large or the projector is dim.

## Color Contrast (WCAG AA)

| Text Type | Minimum Ratio | Notes |
|-----------|---------------|-------|
| Normal body text | 4.5:1 | WCAG 1.4.3 (Contrast Minimum) |
| Large text (≥ 18pt or ≥ 14pt bold) | 3:1 | Large text is easier to read |
| Decorative / non-essential | None | Logos, dividers |

Test pairs with a contrast checker before committing to a theme. Common failures: light gray on white (#999 on #FFF is 2.85:1 — fails), pastels on pastels, brand colors that look great in a logo but fail on text.

## The Whitespace Rule

Whitespace is content. A crowded slide signals to the audience that they should read; a slide with breathing room signals that they should listen.

| Region | Reserve |
|--------|---------|
| Top + bottom margins | ≥ 5% of slide height each |
| Left + right margins | ≥ 5% of slide width each |
| Around the focal point | ≥ 1× the focal element's size |
| Between bullets | ≥ 0.5× line height |

## Visual Hierarchy via Type Scale

Use a typographic scale (each step ~1.25–1.5× the previous) so the eye lands in the right order:

```text
DECK TITLE     | 60pt
Slide title    | 44pt
Subtitle       | 32pt
Body           | 28pt
Caption        | 22pt
```

Pick three sizes per slide, not five. More sizes flatten hierarchy.

## Quick Reference

| Symptom | Cause | Fix |
|---------|-------|-----|
| Text unreadable from back of room | Body < 24pt | Bump to 28pt+ |
| Code block illegible | Default mono < 22pt | Set explicit `font-size: 0.7em` |
| Slide feels cluttered | Margins < 5%, no breathing room | Reduce content, increase margins |
| Title doesn't pop | Same size as body | Make title 1.5× body |
| Light gray sub-text fades | < 4.5:1 contrast | Use #555 on #FFF (7.5:1) |

## Common Mistakes

### Wrong: Brand Colors Without Contrast Check

```css
.slide { background: #F0F4F8; }
.body  { color: #B0C4D9; }  /* 1.7:1 — FAILS WCAG AA */
```

The slide looks "on-brand" but body text is unreadable for ~5% of the audience.

### Correct: Verify Contrast First

```css
.slide { background: #F0F4F8; }
.body  { color: #2C3E50; }  /* 9.1:1 — PASSES AA + AAA */
```

### Wrong: Five Type Sizes on One Slide

```text
Title       (44pt)
Subtitle    (28pt)
Section     (24pt)
Body        (20pt)
Footnote    (16pt)
```

The eye can't decide where to land.

### Correct: Three Sizes Maximum

```text
Title       (44pt)
Body        (28pt)
Footnote    (20pt)
```

### Wrong: Margins Eaten by Logos / Footers

```text
[ HUGE LOGO ] Slide title in 24pt
              Body text squished into bottom 60% of slide
```

### Correct: Reserve Margins; Logo Goes Small

```text
                Slide title (44pt, centered top)

                Body content (28pt, breathing room)

                                            [logo, 24pt corner]
```

## Related

- [accessibility](accessibility.md)
- [slide-anatomy](slide-anatomy.md)
- [audience-targeting](audience-targeting.md)
