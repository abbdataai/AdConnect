# Slide Formats Overview

> **Purpose**: Pick the right slide format so the deck is buildable, reviewable, and presentable in the user's environment.
> **Confidence**: 0.95
> **MCP Validated**: 2026-04-30

## Overview

Five families of slide tools dominate practical use: Marp, Slidev, reveal.js, PPTX (via python-pptx), and Google Slides. They differ in source format, build complexity, and where the deck ultimately runs. Choosing the wrong family forces a rewrite later — choose deliberately at the start.

## The Five Formats

| Format | Source | Output | Editable in | Best For |
|--------|--------|--------|-------------|----------|
| Marp | Markdown | HTML / PDF / PPTX | Any text editor | Markdown-first technical docs |
| Slidev | Markdown + Vue | Web app / PDF | Any text editor | Developer demos with code |
| reveal.js | HTML | Static site | Any text editor | Web-native animation-rich talks |
| PPTX | python-pptx script | `.pptx` | PowerPoint / Keynote | Office handoff, corporate audiences |
| Google Slides | Web UI / API | Cloud doc | Browser | Real-time collaboration |

## Tradeoffs

### Marp

Strengths: single `.md` file, diff-friendly, exports to HTML/PDF/PPTX from one source. Per-slide directives via HTML comments (`<!-- _class: lead -->`) keep the markdown clean. Frontmatter is YAML at the top of the file.

Limits: layout is theme-driven; complex per-slide layout requires custom CSS. No interactive components.

### Slidev

Strengths: Vue components per slide, syntax-highlighted code with line highlighting, presenter mode, drawings, exports to PDF and SPA. Layouts (`cover`, `two-cols`, `image-right`) are declared in per-slide frontmatter. Slot syntax (`::right::`) places content into named regions.

Limits: requires Node.js toolchain; build is heavier than Marp. Steeper learning curve.

### reveal.js

Strengths: web-native, vertical slides (nested `<section>` blocks), fragment animations (`class="fragment"`), plugin ecosystem. Handles complex animation sequences best.

Limits: HTML source is verbose; harder to diff. Markup hierarchy is `.reveal > .slides > section`.

### PPTX (python-pptx)

Strengths: emits real `.pptx` consumable by PowerPoint, Keynote, Google Slides import. Required when a corporate audience expects an editable file. Always emit the **script**, never the binary.

Limits: layout via slide layout placeholders, not free-form positioning. Limited to features python-pptx supports (1.0.0 covers most needs).

### Google Slides

Strengths: real-time co-editing, comments, no build step. Required when multiple authors edit live.

Limits: not version-controllable as text; agent cannot directly produce a Google Slides deck — only an export script via the Slides API.

## Quick Reference

| Need | Pick | Why |
|------|------|-----|
| Code-heavy demo | Slidev | Code blocks with line highlighting are first-class |
| Single source → PDF + HTML | Marp | One markdown file, three outputs |
| Animations / vertical nav | reveal.js | Fragments + nested sections |
| Corporate `.pptx` deliverable | python-pptx | Real `.pptx` from script |
| Live co-edit during draft | Google Slides | Only option for real-time |

## Common Mistakes

### Wrong: Defaulting to PPTX

```text
User: "Make me 10 slides on Module 1"
Agent: writes a python-pptx script
```

Loses diff-ability, harder to review in PRs, slower iteration.

### Correct: Default to Markdown-Based

```text
User: "Make me 10 slides on Module 1"
Agent: scaffolds Marp .md (single file, version-controlled)
       — switches to PPTX only if user requests Office format
```

### Wrong: Using reveal.js for a 5-Slide Pitch

```text
3 minute pitch → reveal.js with fragments and vertical sections
```

Over-engineered. Marp would ship in 1/4 the time.

### Correct: Match Format to Talk Length and Type

```text
3 minute pitch → Marp (5 slides, simple)
30 minute technical demo → Slidev (code components)
60 minute conference talk → reveal.js (animations, vertical sections)
Board meeting → python-pptx (corporate deliverable)
```

## Related

- [slide-anatomy](slide-anatomy.md)
- [marp-deck-scaffold pattern](../patterns/marp-deck-scaffold.md)
- [slidev-deck-scaffold pattern](../patterns/slidev-deck-scaffold.md)
- [revealjs-html-scaffold pattern](../patterns/revealjs-html-scaffold.md)
- [pptx-from-python pattern](../patterns/pptx-from-python.md)
