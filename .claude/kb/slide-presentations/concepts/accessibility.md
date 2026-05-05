# Slide Accessibility

> **Purpose**: Make decks usable by everyone — sighted and non-sighted, in-room and remote, native readers and translators.
> **Confidence**: 0.95
> **MCP Validated**: 2026-04-30

## Overview

Accessibility is not a separate workflow — it's a checklist applied to every slide. The rules come from WCAG 2.1 / 2.2 AA, which is the legal standard in most jurisdictions and the practical standard everywhere else. For slides specifically, four areas matter most: contrast, text size, alt text, and reading order.

## The Four Pillars

### 1. Contrast (WCAG 1.4.3)

| Text Type | Minimum Ratio |
|-----------|---------------|
| Normal text | 4.5:1 |
| Large text (≥ 18pt or ≥ 14pt bold) | 3:1 |
| Decorative / logos | None |

The 4.5:1 ratio compensates for vision loss equivalent to ~20/40 acuity (typical for adults around age 80). Use a contrast checker; do not eyeball.

### 2. Text Size

Beyond WCAG, slides have an additional constraint: projection. Body text must be readable from the back of the room. Practical floors:

| Element | Minimum |
|---------|---------|
| Body | 24pt |
| Headings | 36pt |
| Code | 22pt |
| Footnotes | 18pt |

### 3. Alt Text on Images

Every meaningful image needs alt text. Decorative images get empty alt (`alt=""`). What counts:

| Image Type | Alt Text |
|------------|----------|
| Diagram | Describe the structure, e.g., "Three-tier architecture: client, API, database" |
| Chart | State the takeaway, e.g., "Revenue grew 12% Q3" — not the raw values |
| Photo (illustrative) | Brief description |
| Photo (decorative) | `alt=""` |
| Logo | Company name |
| Icon (functional) | What it does, e.g., "Settings" |

Format syntax:

```markdown
<!-- Marp / Slidev / GitHub Markdown -->
![Three-tier architecture diagram](arch.png)

<!-- reveal.js HTML -->
<img src="arch.png" alt="Three-tier architecture diagram">
```

### 4. Reading Order

Screen readers traverse slides in source order. Ensure source order matches visual order — easy to break with absolute positioning, two-column layouts, or PPTX free-form placement. In python-pptx, use slide layout placeholders rather than positioning shapes manually.

## Other Considerations

### Font Choices

- Sans-serif (Inter, Roboto, system-ui) over serif for projection
- Avoid italic for body text (fewer rendering issues, better legibility)
- Avoid all-caps blocks longer than 5 words (screen readers may spell them out)

### Color-Only Information

Never rely on color alone to convey meaning. A red bar and a green bar must also differ in label, pattern, or position.

```text
Wrong: "Red items are blockers, green are done"
Right: "Items marked [BLOCKER] are blockers; [DONE] are done"
```

### Animation

Provide a static fallback. WCAG 2.3.3 (Animation from Interactions) recommends respecting `prefers-reduced-motion`. In reveal.js, use `data-transition="none"` for users who disable animations. Do not autoplay video with sound.

## Quick Reference

| Check | Tool |
|-------|------|
| Contrast ratio | WebAIM Contrast Checker |
| Color-blind safe palette | Coblis simulator |
| Alt text presence | Manual (every image) |
| Reading order | Tab through deck once |
| Font size | Test at projection distance |

## Common Mistakes

### Wrong: Image Without Alt Text

```markdown
![](arch.png)
```

Screen readers announce "image" with no context.

### Correct: Descriptive Alt Text

```markdown
![Three-tier architecture: React client, FastAPI server, Postgres DB](arch.png)
```

### Wrong: Color-Coded Status Without Labels

```text
🟢🟢🟢🟡🔴   (visible to sighted only)
```

### Correct: Color + Label

```text
🟢 Green: shipped (3)
🟡 Yellow: in progress (1)
🔴 Red: blocked (1)
```

### Wrong: 18pt Body Text

```css
.body { font-size: 18pt; }   /* OK on screen, fails projection */
```

### Correct: 24pt+ Body

```css
.body { font-size: 28pt; }   /* projection-safe, WCAG-safe */
```

## Related

- [visual-design](visual-design.md)
- [slide-anatomy](slide-anatomy.md)
- [review-rubric pattern](../patterns/review-rubric.md)
