# PPTX from Python

> **Purpose**: Generate `.pptx` files from a versionable script using python-pptx — never write the binary directly.
> **MCP Validated**: 2026-04-30

## When to Use

- Audience expects an editable `.pptx` (corporate, board, customer handoff)
- Deck must integrate with a brand template (`.pptx` template file)
- The deck content comes from structured data (DB, JSON, CSV)
- Reproducibility matters — the script is the source of truth, not the binary

## Implementation

```python
"""
Generate Module 1 deck from a Python script.
Run: python build_deck.py
Output: ./build/module1.pptx
"""
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

OUTPUT = Path(__file__).parent / "build" / "module1.pptx"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def add_title_slide(prs: Presentation, title: str, subtitle: str) -> None:
    layout = prs.slide_layouts[0]  # 0 = title slide
    slide = prs.slides.add_slide(layout)
    slide.shapes.title.text = title
    slide.placeholders[1].text = subtitle


def add_bullets_slide(prs: Presentation, title: str, bullets: list[str]) -> None:
    layout = prs.slide_layouts[1]  # 1 = title + content
    slide = prs.slides.add_slide(layout)
    slide.shapes.title.text = title

    body = slide.placeholders[1]
    tf = body.text_frame
    tf.text = bullets[0]  # first bullet seeds the frame
    for bullet in bullets[1:]:
        p = tf.add_paragraph()
        p.text = bullet
        p.level = 0

    # Enforce body font size for projection legibility
    for paragraph in tf.paragraphs:
        for run in paragraph.runs:
            run.font.size = Pt(28)


def add_section_divider(prs: Presentation, label: str) -> None:
    layout = prs.slide_layouts[5]  # 5 = title only (use as divider)
    slide = prs.slides.add_slide(layout)
    slide.shapes.title.text = label
    title_run = slide.shapes.title.text_frame.paragraphs[0].runs[0]
    title_run.font.size = Pt(54)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(0x2C, 0x3E, 0x50)


def build() -> None:
    # Use a brand template if available, else default
    template = Path(__file__).parent / "template.pptx"
    prs = Presentation(str(template)) if template.exists() else Presentation()

    add_title_slide(
        prs,
        title="Module 1: Workforce & Attendance",
        subtitle="Engineering review · 2026-04-30",
    )

    add_section_divider(prs, "Why this matters")

    add_bullets_slide(
        prs,
        title="The pain today",
        bullets=[
            "Manual time tracking costs ~6 hrs/week",
            "Reconciliation errors hit payroll monthly",
            "Auditors flagged the gap last quarter",
        ],
    )

    add_section_divider(prs, "Architecture")

    add_bullets_slide(
        prs,
        title="Three tiers",
        bullets=[
            "PWA — offline check-in",
            "FastAPI — single auth boundary",
            "Postgres — source of truth",
        ],
    )

    add_bullets_slide(
        prs,
        title="Three takeaways",
        bullets=[
            "Offline-first PWA",
            "Single auth boundary",
            "Auto-generated reports",
        ],
    )

    prs.save(str(OUTPUT))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    build()
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `slide_layouts[0]` | Title slide | Title + subtitle placeholders |
| `slide_layouts[1]` | Title + Content | Most common bullet layout |
| `slide_layouts[5]` | Title Only | Section dividers |
| `Pt(N)` | — | Font size in points (use ≥ 24pt for body) |
| `Inches(N)` | — | Position / size in inches |

Layout indices are template-dependent. With a custom template, inspect them once:

```python
prs = Presentation("template.pptx")
for i, layout in enumerate(prs.slide_layouts):
    print(i, layout.name)
```

## Text Hierarchy

python-pptx text lives in three levels:

```text
Shape.text_frame
└── TextFrame.paragraphs (list)
    └── _Paragraph.runs (list — formatting unit)
```

Set `paragraph.level = 0..8` for bullet indentation. Set `run.font.size`, `run.font.bold`, `run.font.color.rgb` per run for fine control.

## Build Commands

```bash
# Install once
pip install python-pptx

# Generate deck
python build_deck.py

# Verify output (opens in default app)
open build/module1.pptx
```

## Example: Data-Driven Deck

```python
import json
from pathlib import Path
from pptx import Presentation
from pptx.util import Pt

data = json.loads(Path("agenda.json").read_text())
prs = Presentation()

for item in data["slides"]:
    layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(layout)
    slide.shapes.title.text = item["title"]
    body = slide.placeholders[1].text_frame
    body.text = item["bullets"][0]
    for b in item["bullets"][1:]:
        body.add_paragraph().text = b

prs.save("data_driven.pptx")
```

## Common Pitfalls

| Don't | Do |
|-------|-----|
| Position shapes with absolute `Inches()` for layout | Use slide layout placeholders — the template defines positions |
| Set text via `shape.text = "..."` then assume formatting persists | `text =` resets paragraph formatting; iterate runs after |
| Skip `.parent.mkdir(parents=True, exist_ok=True)` for output | Save fails silently on missing parent directory |
| Hardcode `slide_layouts[1]` without inspecting the template | Template index order varies; check first |
| Generate the binary committed to git | Commit the `.py` script, gitignore the `.pptx` |

## See Also

- [marp-deck-scaffold](marp-deck-scaffold.md) — Markdown alternative
- [formats-overview concept](../concepts/formats-overview.md)
- Official docs: <https://python-pptx.readthedocs.io/en/latest/user/quickstart.html>
