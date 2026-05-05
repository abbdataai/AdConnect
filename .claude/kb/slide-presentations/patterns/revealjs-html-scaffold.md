# reveal.js HTML Scaffold

> **Purpose**: Scaffold a web-native deck with fragment animations and vertical (nested) slides.
> **MCP Validated**: 2026-04-30

## When to Use

- Animations and step-through reveals are central to the talk
- Vertical (nested) slides organize an outline well — main topics horizontal, sub-points vertical
- The deck will live as a hosted web page (conference talk archive)
- Audience expects a web-native feel (links, embedded iframes, plugin features)

## Implementation

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Module 1 Walkthrough</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/highlight/monokai.css">
  <style>
    .reveal section { font-size: 28px; }
    .reveal h1 { font-size: 64px; }
    .reveal h2 { font-size: 44px; }
    .reveal pre code { font-size: 0.85em; line-height: 1.3; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">

      <!-- Cover slide -->
      <section>
        <h1>Module 1</h1>
        <h2>Workforce &amp; Attendance</h2>
        <p>Press <kbd>Space</kbd> to advance</p>
        <aside class="notes">
          30-minute walkthrough. Save 5 minutes for Q&amp;A.
        </aside>
      </section>

      <!-- Vertical stack: Architecture + sub-slides -->
      <section>
        <section>
          <h2>Architecture</h2>
          <p>Press <kbd>↓</kbd> for layers</p>
        </section>
        <section>
          <h3>PWA</h3>
          <ul>
            <li class="fragment">Offline-capable</li>
            <li class="fragment">GPS + photo capture</li>
            <li class="fragment">Background sync</li>
          </ul>
        </section>
        <section>
          <h3>API</h3>
          <ul>
            <li class="fragment">FastAPI</li>
            <li class="fragment">Single auth boundary</li>
            <li class="fragment">Pydantic validation</li>
          </ul>
        </section>
        <section>
          <h3>DB</h3>
          <ul>
            <li class="fragment">Postgres source of truth</li>
            <li class="fragment">Append-only audit log</li>
          </ul>
        </section>
      </section>

      <!-- Code with line highlights -->
      <section>
        <h2>Check-in handler</h2>
        <pre><code class="language-python" data-line-numbers="2-4|6|all">
@router.post("/checkin")
async def checkin(
    payload: CheckInPayload,
    user: User = Depends(get_current_user),
):
    return await service.record(user.id, payload)
        </code></pre>
        <aside class="notes">
          Step through with arrow keys. Line 6 is the composition point.
        </aside>
      </section>

      <!-- Closing -->
      <section>
        <h2>Three takeaways</h2>
        <ol>
          <li class="fragment">Offline-first PWA</li>
          <li class="fragment">Single auth boundary</li>
          <li class="fragment">Auto-generated reports</li>
        </ol>
      </section>

    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/highlight/highlight.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/notes/notes.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      slideNumber: 'c/t',
      transition: 'slide',
      plugins: [ RevealHighlight, RevealNotes ],
    });
  </script>
</body>
</html>
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `hash` | `false` | Persist slide position in URL |
| `slideNumber` | `false` | `'c/t'` shows current/total |
| `transition` | `'slide'` | `slide`, `fade`, `none`, etc. |
| `controls` | `true` | Arrow controls in corner |
| `progress` | `true` | Progress bar at bottom |
| `keyboard` | `true` | Keyboard navigation |

## HTML Structure (mandatory)

```text
.reveal
└── .slides
    ├── <section>          ← horizontal slide
    ├── <section>          ← horizontal slide
    │   ├── <section>      ← vertical sub-slide 1
    │   ├── <section>      ← vertical sub-slide 2
    │   └── <section>      ← vertical sub-slide 3
    └── <section>          ← horizontal slide
```

Each `<section>` is one slide. Nesting `<section>` inside `<section>` creates vertical sub-slides; the first child is the entry point and is included in the horizontal sequence.

## Fragments

Add `class="fragment"` to any element to reveal it on a key press:

```html
<ul>
  <li class="fragment">Appears on click 1</li>
  <li class="fragment">Appears on click 2</li>
  <li class="fragment fade-up" data-fragment-index="3">
    Custom order via index
  </li>
</ul>
```

Fragment classes include `fade-in` (default), `fade-up`, `fade-down`, `fade-left`, `fade-right`, `grow`, `shrink`, `highlight-red`. Use `data-fragment-index` to override default order.

## Speaker Notes

```html
<section>
  <h2>Slide content</h2>
  <aside class="notes">
    Notes appear in the speaker view (press 'S' to open).
  </aside>
</section>
```

## Common Pitfalls

| Don't | Do |
|-------|-----|
| Skip the `.reveal > .slides > section` wrapper | The hierarchy is mandatory; reveal.js won't initialize otherwise |
| Use `<div>` instead of `<section>` for slides | Each slide must be a `<section>` |
| Reveal everything at once on dense slides | Use `class="fragment"` to step through |
| Forget `<aside class="notes">` | Speaker view is a major reveal.js feature |

## See Also

- [marp-deck-scaffold](marp-deck-scaffold.md)
- [slidev-deck-scaffold](slidev-deck-scaffold.md)
- Official docs: <https://revealjs.com/markup/>
- Vertical slides: <https://revealjs.com/vertical-slides/>
