# Marp Deck Scaffold

> **Purpose**: Scaffold a Markdown-first slide deck that builds to HTML, PDF, and PPTX from a single source file.
> **MCP Validated**: 2026-04-30

## When to Use

- Default choice for technical decks committed to a repo (diff-friendly)
- Need to export to PDF or PPTX from a single Markdown source
- Audience is internal / technical and tooling is available locally
- Speed of iteration matters more than visual polish

## Implementation

```markdown
---
marp: true
theme: default
paginate: true
size: 16:9
header: 'Module 1 Demo'
footer: 'Prossolo · 2026-04-30'
style: |
  section { font-size: 28px; }
  section h1 { font-size: 44px; }
  section.lead { text-align: center; }
  code { font-size: 0.85em; }
---

<!-- _class: lead -->

# Module 1: Workforce & Attendance

A 10-minute walkthrough for the engineering team.

<!--
Speaker note: thank the team, set the scope (10 min + Q&A).
-->

---

# Why this matters

- Manual time tracking costs ~6 hrs/week
- Reconciliation errors hit payroll monthly
- Auditors flagged the gap last quarter

<!--
Lead with the pain. Cite the audit finding by date if asked.
-->

---

## Mental model

![Three-tier architecture: PWA, FastAPI, Postgres](./arch.png)

<!--
Walk through left-to-right. PWA → API is the only auth boundary.
-->

---

# Demo

```python
@router.post("/checkin")
async def checkin(payload: CheckInPayload):
    return await service.record(payload)
```

<!--
Live demo here. Fall back to screenshot if wifi fails.
-->

---

<!-- _class: lead -->

# Three takeaways

1. Single source of truth for hours
2. PWA works offline
3. Reports auto-generated weekly

<!--
End on a high. Pause 2 seconds before "questions?"
-->
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `marp: true` | required | Activates Marp parser on this file |
| `theme` | `default` | `default`, `gaia`, `uncover`, or custom CSS |
| `paginate` | `false` | Show page numbers |
| `size` | `16:9` | Aspect ratio (`16:9`, `4:3`, or custom WxH) |
| `header` / `footer` | none | Repeated text top / bottom |
| `style` | none | Inline CSS, scoped via `section` selectors |

## Scoped Directives

Per-slide overrides use the underscore prefix in HTML comments:

| Directive | Example | Effect |
|-----------|---------|--------|
| `_class` | `<!-- _class: lead -->` | Apply CSS class to this slide only |
| `_backgroundColor` | `<!-- _backgroundColor: #1a1a1a -->` | Dark background, this slide |
| `_color` | `<!-- _color: white -->` | Text color, this slide |
| `_paginate` | `<!-- _paginate: false -->` | Hide page number on this slide |

Without the underscore the directive applies to the rest of the deck from that point onward.

## Build Commands

```bash
# Install once
npm install -g @marp-team/marp-cli

# HTML output
marp deck.md -o deck.html

# PDF output
marp deck.md --pdf -o deck.pdf

# PPTX output (limited fidelity, but works for Office handoff)
marp deck.md --pptx -o deck.pptx

# Watch mode for live preview
marp -w deck.md
```

## Example Usage

```markdown
---
marp: true
theme: gaia
paginate: true
class: lead
---

# Pitch deck

---

<!-- _class: lead -->

# Problem

Manual reconciliation costs $X/quarter.

---

# Solution

Three-tier system, PWA-first, API-driven.

---

# Ask

Approve $Y for 6-month rollout.
```

Build with `marp pitch.md -o pitch.html` — reviewable in any browser, diffable in any PR.

## Common Pitfalls

| Don't | Do |
|-------|-----|
| Mix YAML frontmatter and `marp` config in package.json | Keep all config in the `.md` frontmatter |
| Use `<!-- class: lead -->` (no underscore) on one slide | Use `<!-- _class: lead -->` (underscore = scoped) |
| Set `font-size: 18pt` for body | Floor at 24pt; 28pt is safer for projection |
| Use `![]()` without alt text | Always describe the image for accessibility |
| Forget `paginate: true` for long decks | Audience loses position without page numbers |

## See Also

- [slidev-deck-scaffold](slidev-deck-scaffold.md)
- [revealjs-html-scaffold](revealjs-html-scaffold.md)
- [formats-overview concept](../concepts/formats-overview.md)
- Official docs: <https://marpit.marp.app/directives>
