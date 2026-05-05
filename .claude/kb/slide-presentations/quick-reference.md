# Slide Presentations Quick Reference

> Fast lookup tables for format choice, narrative pattern, and common fixes.
> **MCP Validated**: 2026-04-30

## Format Decision Matrix

| Need | Pick | Why |
|------|------|-----|
| Markdown-first, version-controlled deck | Marp | Single `.md` file, diff-friendly |
| Developer talk with code components | Slidev | Vue layouts, syntax-highlighted code, presenter mode |
| Web-native, heavy animations / vertical nav | reveal.js | Fragments, vertical slides, plugin ecosystem |
| Corporate / `.pptx` handoff required | python-pptx | Generates real `.pptx` from script |
| Real-time co-editing | Google Slides | Manual or API; not a build artifact |

## Narrative Pattern by Goal

| Goal | Pattern | Slides |
|------|---------|--------|
| Persuade / win budget | Problem → Stakes → Solution → Proof → Ask | 6–10 |
| Inform / educate | Hook → Map → Concept → Example → Recap | 8–15 |
| Status review | Were → Are → Going → Risks → Asks | 5–8 |
| Technical talk | Why → Mental model → Demo → Edge cases → Takeaways | 12–25 |

## Slide Budget by Talk Length

| Duration | Pitch (~40s/slide) | Technical (~75s/slide) |
|----------|--------------------|------------------------|
| 5 min | 6–8 | 4–5 |
| 10 min | 12–15 | 8 |
| 20 min | 25–30 | 16 |
| 45 min | 50+ (split sections) | 30–35 |

## Audience Tone Shift

| Audience | Jargon | Depth | Visual |
|----------|--------|-------|--------|
| Executive | None | Outcomes only | Charts, money figures |
| Technical | Native | Architecture, code | Diagrams, snippets |
| Mixed | Define on first use | Layered (top→detail) | Both |
| Training | Glossary upfront | Step-by-step | Annotated screenshots |

## Density Limits (the 6×6 default)

| Element | Limit | Override When |
|---------|-------|---------------|
| Bullets per slide | ≤ 6 | Code listing, table |
| Words per bullet | ≤ 6 | Quote, definition |
| Body font (projection) | ≥ 24pt | Footnote, citation |
| Heading font | ≥ 36pt | Never below |
| Contrast ratio | ≥ 4.5:1 (WCAG AA) | Decorative only |

## Common Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Content overflows slide | Body text > 24pt limit exceeded by paragraph | Split slide or convert to visual |
| Code block illegible | Default mono font too small | Set `font-size: 0.7em` in slide-scoped style |
| Marp build fails | Missing `marp: true` frontmatter | Add to YAML header |
| Slidev image not found | Path relative to `slides.md` not absolute | Move image into folder next to slides.md |
| reveal.js fragments out of order | Missing `data-fragment-index` | Add explicit index per element |
| `.pptx` shapes overlap | Layout placeholders not used | Use `slide_layouts[N]` not absolute positioning |

## Pre-Flight Checklist

| Check | Required Before |
|-------|-----------------|
| Audience identified | PLANNER, BUILDER |
| Goal in one sentence | PLANNER, BUILDER |
| Duration / slide budget | PLANNER, BUILDER |
| Format chosen | BUILDER |
| Source material present | BUILDER, FIXER |
| Build command verified | BUILDER (after) |
| Read straight through cold | REVIEWER |

## Related Documentation

| Topic | Path |
|-------|------|
| Narrative deep-dive | `concepts/narrative-arc.md` |
| Format tradeoffs | `concepts/formats-overview.md` |
| Review rubric | `patterns/review-rubric.md` |
| Full Index | `index.md` |
