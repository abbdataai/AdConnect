# Audience Targeting

> **Purpose**: Adjust depth, jargon, and visuals to match who's in the room — the same content fails or lands based on this calibration.
> **Confidence**: 0.95
> **MCP Validated**: 2026-04-30

## Overview

The same content can succeed or fail based purely on audience match. An executive will tune out architecture diagrams; a senior engineer will tune out a slide that explains what "API" means. Audience-fit is the highest-leverage decision after picking the narrative arc.

## The Four Audience Profiles

| Profile | What They Care About | Time They'll Give You |
|---------|----------------------|----------------------|
| Executive | Outcomes, money, risk, ask | 5–15 min, low patience for setup |
| Technical | Architecture, tradeoffs, depth | 30–60 min if engaged |
| Mixed | Outcomes first, depth on demand | 30 min, must satisfy both halves |
| Training | Step-by-step, repeatable procedure | 60+ min, needs reference material |

## How to Tune for Each

### Executive

- Lead with the outcome ("Module 1 is shipping next sprint")
- Money slides go early ("$X saved", "$Y at risk")
- Charts not tables; one number per slide
- Zero jargon unless the term is the deal itself
- End with a specific decision the room must make

### Technical

- Mental model first, code second
- Show the tradeoffs you considered, not just the choice
- Code on slides only if the audience can read it (≥ 24pt for body, syntax-highlighted)
- Demos > diagrams when possible
- Don't define terms they already know — it signals you misjudged the audience

### Mixed

- Layer the content: top of slide is for executives, detail on the bottom
- Define jargon **on first use**, then use it freely
- Have backup slides for "depth on demand" Q&A
- Pace the talk so non-technical attendees never feel lost for more than 1 slide

### Training

- One concept per slide; never two
- Step numbers visible (`Step 1 of 7`)
- Annotated screenshots over abstract diagrams
- Glossary slide near the front
- Practice / hands-on slide every ~5 concepts
- Reference material handout

## Quick Reference

| Audience | Body Font | Jargon | Slide Density |
|----------|-----------|--------|---------------|
| Executive | 28pt+ | None | 3 bullets max |
| Technical | 24pt+ | Native | 6 bullets, code OK |
| Mixed | 24pt+ | Defined on first use | 4–5 bullets |
| Training | 28pt+ | Glossary upfront | 1 concept/slide |

## Common Mistakes

### Wrong: Generic Deck "for Anyone"

```text
Slide 1: Architecture diagram (loses execs)
Slide 2: Quarterly revenue (loses engineers)
Slide 3: "Our journey" (loses everyone)
```

Trying to please everyone pleases no one.

### Correct: Audience Identified Before Building

```text
Audience: VP Eng + 2 staff engineers (mixed-technical)
→ Lead with outcome (1 slide for the VP)
→ Mental model + code for staff (4 slides)
→ Tradeoffs slide (engages everyone)
→ Ask (decision the VP can make in-room)
```

### Wrong: Jargon Without Definition for Mixed Audience

```text
Slide: "We chose Pub/Sub over RabbitMQ for at-least-once
delivery semantics with native IAM integration."
```

Half the room is now lost.

### Correct: Define on First Use, Then Use Freely

```text
Slide: "We use Pub/Sub (Google's message queue)."
Next slide: "Pub/Sub guarantees at-least-once delivery."
```

The executive understood slide 1; the engineer is not insulted by slide 2.

## Detection Heuristics

Ask the user these three questions if audience is unclear:

1. **Who has decision power in the room?** (executive cue)
2. **Will the audience read code on slides?** (technical cue)
3. **Will the audience reuse the deck as reference material?** (training cue)

If the answers conflict, you have a mixed audience — build for that explicitly.

## Related

- [narrative-arc](narrative-arc.md)
- [visual-design](visual-design.md)
- [slide-anatomy](slide-anatomy.md)
