# Emergency Meeting -- Hackathon 2026 Presentation Guide

5 slides, 10 minutes. Stephen carries the thesis, metrics, and rollout. Darias runs the live demo.

---

## Slide 1 -- Title + One-Line Thesis

**Emergency Meeting: Gamifying Data Stewardship**

*Subtitle:* Turning stewardship actions into micro-games that create deliberate review + measurable quality signals

**Team:** Stephen Vick, Darias Brown

### Speaker notes (0:00--0:45) -- Stephen

- "We're not claiming everyone has an engagement problem."
- "We're showing a specific lever: game mechanics can make stewardship more approachable *and* generate quality telemetry."
- "In 10 minutes: the thesis, the demo, the metrics model, and how you deploy it safely."

---

## Slide 2 -- The Gamification Thesis (What game mechanics add)

**Game mechanics we're borrowing (intentionally)**

- **Deliberate interaction** (drag/match, not just click)
- **Immediate feedback** (wrong -> retry loop)
- **Visible completion** (task complete)
- **Identity + attribution** (every action tied to a steward)

**Why this is useful**

- Encourages careful review where correctness matters
- Builds "learning in the flow" (feedback trains)
- Produces measurable signals from normal work

### Speaker notes (0:45--2:15) -- Stephen

- "The core design idea is *productive friction*: slightly slower interaction that nudges attention."
- "Immediate feedback is doing double duty: it improves the current decision and teaches the steward."
- "Identity matters: we can connect outcomes and behaviors to a person -- not to shame, but to target coaching and reduce blanket review."

---

## Slide 3 -- Live Demo (Darias)

**What you'll see**

- Skeld-style navigation (room = domain)
- Electrical -> Fix Wires panel
- Matching fields to values
- Wrong feedback -> correction -> Task Complete

### Speaker notes (2:15--2:30) -- Stephen (handoff)

- "Darias will run the demo."
- "Watch for two things: (1) the forced, deliberate matching and (2) the immediate wrong->retry feedback loop."
- "Those two mechanics are what make measurement and training possible."

*(Darias demo runs ~2:00, then Stephen resumes.)*

---

## Slide 4 -- Quality Telemetry (The Differentiator)

**Traditional stewardship often measures outcomes after the fact.**
**Gamified stewardship measures the interaction.**

**Three primary signals**

- **First-attempt accuracy** -- correctness without assistance
- **Retry rate** -- where learning is happening
- **Time-to-complete** -- confidence/uncertainty proxy

**Derived outputs**

- **Trust score** (accuracy + retries + consistency)
- **Targeted coaching** (which domains/fields cause retries)
- **Risk-based review routing** (focus review where needed)

### Speaker notes (4:30--7:30) -- Stephen

- "This is the centerpiece. The game isn't just 'fun UI' -- it's a measurement system."
- "Accuracy is obvious. Retry rate is the learning signal. Time-to-complete tells you where people hesitate or where the task is ambiguous."
- "From those you can compute trust scores and route reviewer attention intelligently."
- "This is org-friendly: it supports training and quality assurance, not policing. It also helps tune the task itself -- if everyone retries on the same field, your data or instructions need improvement."

---

## Slide 5 -- How You Deploy It (Org-Friendly + Next)

**Low-risk adoption model**

- Start with **one task type** (Fix Wires matching)
- Run an **opt-in pilot** (new stewards, a department, training cohort)
- Expand only where **measured outcomes justify it**

**What's next (examples)**

- Merge/split records (Reactor)
- Golden record selection (Admin/Navigation)
- Address standardization (Comms)

**End state**

- Multiple stewardship task types, all emitting comparable signals
- Reviewer dashboard driven by trust + risk

### Speaker notes (7:30--10:00) -- Stephen

- "This doesn't require governance change on day one."
- "Pilot it like any workflow improvement: baseline, test, measure."
- "If it helps, expand. If not, you've still learned where ambiguity or training gaps exist."
- Close: "We've shown a mechanics-driven way to make stewardship deliberate, teachable, and measurable. Questions."

---

## Talk Track in One Sentence Per Slide

1. **Title:** "We gamified stewardship to make it deliberate and measurable."
2. **Mechanics:** "Productive friction + feedback + identity turns work into training and telemetry."
3. **Demo:** "You'll see those mechanics in Fix Wires."
4. **Metrics:** "Accuracy/retries/time -> trust score -> smarter coaching and review."
5. **Rollout:** "Pilot safely, measure outcomes, expand task types where it works."

---

## Two Non-Assertive but Strong Lines

- "We're not claiming traditional stewardship fails -- this is a targeted option when you want more deliberate review and better signals."
- "The game is not the point. The **telemetry** is the point -- and game mechanics are how we reliably generate it."

---

## Reference: What the Demo Shows

### The Skeld Map

- Full recreation of The Skeld (2048x1872 px), procedurally generated
- 15 named rooms representing potential stewardship domains
- Real-time crewmate movement (WASD), collision, room detection HUD
- Each room can host a different stewardship task type

### The Wiring Task -- Patient Record Matching

- Glowing panel in Electrical room; proximity-activated, click to open
- Among Us-styled task panel with real WiresPanel game texture
- **Left side:** Field labels (First Name, Last Name, Date of Birth, Blood Type)
- **Right side:** Shuffled realistic patient values
- **Drag-and-drop wires** (red, blue, yellow, pink)
- **Wrong-match feedback:** "Wrong wires -- try again!"
- **"TASK COMPLETE" button** only appears on correct match
- **6 randomized patient records** -- different data every time

### Technical Stack

- React 19 + TypeScript + Vite
- Procedural map generation from collision geometry
- SVG-based drag-and-drop wiring engine
- Zero game engine dependencies
