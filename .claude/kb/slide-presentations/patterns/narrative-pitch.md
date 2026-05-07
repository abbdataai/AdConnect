# Narrative Pitch Pattern

> **Purpose**: Apply Problem → Stakes → Solution → Proof → Ask to a real pitch deck so the audience leaves having made a decision.
> **MCP Validated**: 2026-04-30

## When to Use

- The audience holds budget, headcount, or approval authority
- You need a specific decision in the room (not "I'll think about it")
- Time budget is short (5–10 min, sometimes 15)
- The deck is one-shot — there is no follow-up unless they say yes

## Implementation

The five-act structure, one act per 1–2 slides:

| Act | Slides | Purpose |
|-----|--------|---------|
| 1. Problem | 1–2 | Name a pain the audience already feels |
| 2. Stakes | 1 | Quantify the cost of doing nothing |
| 3. Solution | 1–2 | Your answer, in one sentence + a diagram |
| 4. Proof | 1–2 | Pilot data, customer voice, comparable result |
| 5. Ask | 1 | One specific decision in one sentence |

Total: 5–8 slides. Anything beyond that dilutes the pitch.

## Worked Example: Module 1 Pitch (Marp)

```markdown
---
marp: true
theme: default
paginate: true
---

<!-- _class: lead -->

# Workforce & Attendance

A 7-minute pitch · Engineering leadership · 2026-04-30

<!--
Open with: "I have one ask. I'll get to it in 7 minutes."
-->

---

# Today, time tracking is manual

- Site managers tally hours in spreadsheets
- HR reconciles weekly by hand
- Discrepancies surface only at payroll

<!--
Pause. Let the room confirm — most know this already.
-->

---

# The cost is $X / quarter

- 6 hrs/week per manager × 12 sites = 72 hrs/week
- Payroll corrections average $4.2k/month
- Q3 audit flagged 3 missing timesheets

<!--
The number is the slide. Cite the audit by date if asked.
-->

---

# A PWA + API + report engine

![Three-tier architecture: PWA, FastAPI, Postgres](./arch.png)

- Manager checks in / out from phone
- API records, validates, audits
- Reports auto-generated weekly

<!--
One sentence per tier. Don't get lost in implementation.
-->

---

# Pilot reduced misses 60%

- 4-week pilot at the Recife site
- 124 check-ins, 0 manual corrections
- Manager time saved: 5.5 hrs/week

<!--
Real numbers from the pilot. Have the spreadsheet ready
in case anyone asks for the source.
-->

---

<!-- _class: lead -->

# Approve $Y for 6-month rollout

12 sites · go-live in 8 weeks · ROI in Q2

<!--
End on the ask. Pause 3 seconds. Then: "Questions?"
-->
```

## Configuration

| Setting | Recommended | Why |
|---------|-------------|-----|
| Total slides | 5–8 | Anything more loses focus |
| Time per slide | ~45–60s | Pitch pace, not lecture pace |
| Bullets per slide | ≤ 4 | Density slows the pitch |
| One number per slide | yes | Audiences remember one fact |
| Speaker notes | required on every slide | The pitch is mostly the talk, not the slide |

## Anti-Pattern: Pitch Without an Ask

```markdown
---
# Solution
A great new system

---
# Proof
It works

---
# Thanks!
Q&A
```

The audience walks out without knowing what you wanted. **No decision is made.**

## Anti-Pattern: Stakes Buried

```markdown
---
# Module 1
A workforce attendance system

---
# Architecture
PWA + API + DB
[ 3 slides of diagrams ]

---
# Cost of doing nothing
$X / quarter   ← This slide arrived too late.
```

The audience checked out before they knew the stakes. **Stakes go on slide 2 or 3, never later.**

## Variations by Audience

| Audience | Adjust |
|----------|--------|
| C-suite (CFO, CEO) | Stakes slide is the **money number** in 80pt type |
| VP Eng | Solution slide gets the architecture diagram |
| Board | Skip technical proof; cite analogous companies |
| Customer | Replace "stakes" with "outcome they'll experience" |

## Common Pitfalls

| Don't | Do |
|-------|-----|
| Open with "Hi, I'm X, and today I'll cover…" | Open with the problem |
| Spend 3 slides on the team | Save credentials for after the ask, if at all |
| Hide the ask in slide-deck appendix | The ask is one of 5 acts; never optional |
| Show 5 alternatives evaluated | Show your choice; alternatives go in appendix |
| Lead with the solution | Without the problem first, the solution has no weight |

## See Also

- [narrative-arc concept](../concepts/narrative-arc.md)
- [audience-targeting concept](../concepts/audience-targeting.md)
- [marp-deck-scaffold](marp-deck-scaffold.md)
- [review-rubric](review-rubric.md)
