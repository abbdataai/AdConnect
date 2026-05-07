# Narrative Arc

> **Purpose**: Choose a story structure that fits the goal of the talk so each slide earns its place.
> **Confidence**: 0.95
> **MCP Validated**: 2026-04-30

## Overview

A deck without a narrative arc is a list of slides. The arc is the spine that gives the audience a reason to keep listening. Pick the pattern from the speaker's goal — not from the volume of content available — and let it dictate the slide count and order.

## The Four Patterns

| Goal | Pattern | First Slide | Last Slide |
|------|---------|-------------|------------|
| Persuade / pitch | Problem → Stakes → Solution → Proof → Ask | A pain the audience feels | The specific ask |
| Inform / educate | Hook → Map → Concept → Example → Recap | A surprising fact or question | A 1-slide recap |
| Status review | Were → Are → Going → Risks → Asks | Last review's commitments | Decisions needed |
| Technical talk | Why → Mental model → Demo → Edge cases → Takeaways | Why this matters | Three takeaways |

## When to Use Each

### Pitch / Persuade

The audience has a budget, headcount, or approval to give. Open with the problem they recognize, escalate the stakes, then offer your solution as relief. Proof comes after solution (not before — they need to want the answer first). End with one specific ask.

### Inform / Educate

The audience has time but no urgency. Hook them with a surprise, give them a map of where the talk is going, then proceed concept → example → concept → example. Close with a recap they can screenshot.

### Status Review

The audience already has context. Skip the warm-up. Anchor on prior commitments, show current state, project forward, surface risks honestly, end with the decisions you need from them.

### Technical Talk

The audience can follow depth but needs the **why** before the **what**. Establish the mental model before code. Demos go in the middle (peak attention). Edge cases prove you've thought it through. Takeaways are the three things to remember tomorrow.

## Quick Reference

| Audience State | Pick |
|----------------|------|
| Skeptical, holds budget | Pitch |
| Curious, no prior context | Inform |
| Has context, needs decisions | Status |
| Technical peers, wants depth | Technical |

## Common Mistakes

### Wrong: Pitch without an Ask

```text
Slide 1: Problem
Slide 2: Stakes
Slide 3: Our cool solution
Slide 4: Look how cool it is
Slide 5: Thanks!
```

The deck ends without telling anyone what to do. No decision is made.

### Correct: Pitch with a Specific Ask

```text
Slide 1: Problem (data quality SLA misses)
Slide 2: Stakes ($X/quarter in rework)
Slide 3: Solution (CrewAI triage agent)
Slide 4: Proof (pilot reduced misses 60%)
Slide 5: Ask: approve $Y for 6-month rollout
```

The last slide has a single sentence the decider can say "yes" or "no" to.

### Wrong: Technical Talk That Opens with Code

```python
# Slide 1
@agent
def triage(...):
    ...
```

The audience doesn't yet know why they should care about this code.

### Correct: Technical Talk That Opens with the Why

```text
Slide 1: "Pipelines failed silently for 4 hours last quarter"
Slide 2: Mental model — agents as on-call rotation
Slide 3: Demo — agent catches a fail, opens an issue
Slide 4: Edge cases — what if the agent itself fails?
Slide 5: Takeaways
```

## Sizing the Arc

| Pattern | Min Slides | Max Slides |
|---------|------------|------------|
| Pitch | 5 | 10 |
| Inform | 8 | 15 |
| Status | 5 | 8 |
| Technical | 12 | 25 |

If your content forces more than the max, split into sections with a recap slide between each.

## Related

- [audience-targeting](audience-targeting.md)
- [slide-anatomy](slide-anatomy.md)
- [narrative-pitch pattern](../patterns/narrative-pitch.md)
