# Slide Presentations Knowledge Base

> **Purpose**: Narrative arc, slide formats, visual design, and accessibility guidance for the slide-presentation-expert agent across PLANNER / BUILDER / FIXER / REVIEWER capabilities.
> **MCP Validated**: 2026-04-30

## Format Compatibility

| Format | Source File | Best For |
|--------|-------------|----------|
| Marp | `.md` + YAML | Markdown-first, diff-friendly decks |
| Slidev | `slides.md` | Vue-powered developer talks |
| reveal.js | `index.html` | Web-native, animation-heavy decks |
| PPTX | `python-pptx` script | Office handoff, corporate audiences |
| Google Slides | manual / API | Real-time collaboration |

## Quick Navigation

### Concepts (≤ 150 lines each)

| File | Purpose |
|------|---------|
| [concepts/narrative-arc.md](concepts/narrative-arc.md) | Pitch, inform, status, technical talk structures |
| [concepts/slide-anatomy.md](concepts/slide-anatomy.md) | Title, body, visual hierarchy, speaker notes, 6×6 rule |
| [concepts/formats-overview.md](concepts/formats-overview.md) | Marp vs Slidev vs reveal.js vs PPTX tradeoffs |
| [concepts/audience-targeting.md](concepts/audience-targeting.md) | Executive, technical, mixed, training audiences |
| [concepts/visual-design.md](concepts/visual-design.md) | Typography, color contrast, whitespace |
| [concepts/accessibility.md](concepts/accessibility.md) | Alt text, WCAG AA, screen-reader considerations |

### Patterns (≤ 200 lines each)

| File | Purpose |
|------|---------|
| [patterns/marp-deck-scaffold.md](patterns/marp-deck-scaffold.md) | Marp YAML, separators, scoped directives |
| [patterns/slidev-deck-scaffold.md](patterns/slidev-deck-scaffold.md) | slides.md frontmatter, layouts, components |
| [patterns/revealjs-html-scaffold.md](patterns/revealjs-html-scaffold.md) | Section blocks, fragments, vertical slides |
| [patterns/pptx-from-python.md](patterns/pptx-from-python.md) | python-pptx script emitting `.pptx` |
| [patterns/narrative-pitch.md](patterns/narrative-pitch.md) | Problem → Stakes → Solution → Proof → Ask |
| [patterns/review-rubric.md](patterns/review-rubric.md) | 5-axis review with scoring template |

## Quick Reference

- [quick-reference.md](quick-reference.md) — Format / narrative / fix decision matrix

## Agent Usage

| Agent | Primary Files | Capability |
|-------|---------------|------------|
| slide-presentation-expert | concepts/narrative-arc.md, patterns/narrative-pitch.md | PLANNER |
| slide-presentation-expert | patterns/marp-deck-scaffold.md, patterns/slidev-deck-scaffold.md | BUILDER |
| slide-presentation-expert | concepts/visual-design.md, concepts/accessibility.md | FIXER |
| slide-presentation-expert | patterns/review-rubric.md, concepts/slide-anatomy.md | REVIEWER |
