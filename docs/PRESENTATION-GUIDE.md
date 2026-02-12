# Emergency Meeting -- Hackathon 2026 Presentation Guide

---

## The Central Argument

**The stewardship engagement problem is real.** When organizations decentralize data stewardship -- pushing record matching, validation, and enrichment out to business users across departments -- participation drops and quality suffers. Stewards see it as a chore. Reviewers rubber-stamp. The data stays dirty.

**Gamification is the answer, and the inefficiency is the point.** A game mechanic takes longer than a bulk-approve button. But that friction is *productive friction*. It forces the steward to actually look at the data, make a deliberate decision, and feel the consequence of getting it wrong. The result: higher engagement, higher accuracy, and measurable quality metrics per steward -- not just per dataset.

**This demo proves the concept.** We rebuilt the Among Us Skeld experience in the browser and embedded real patient-record matching directly into the gameplay. The wiring task *is* a stewardship task. The game *is* the workflow.

---

## Why Gamification Works for Decentralized Stewardship

### The Problem with Traditional Stewardship UIs

- Stewards are usually business users, not data professionals
- Stewardship queues look like spreadsheets -- low engagement, high fatigue
- Decentralization multiplies the problem: more stewards, less training, less motivation
- No visibility into *who* is doing quality work vs. who is clicking through

### What Game Mechanics Solve

| Challenge | Game Mechanic | Outcome |
|-----------|---------------|---------|
| Low engagement | Tasks feel like gameplay, not chores | Stewards *want* to complete tasks |
| Rubber-stamping | Deliberate drag-and-drop matching forces attention | Each decision is intentional |
| No accountability | Per-steward accuracy tracking (right/wrong/retry) | Quality metrics by person |
| Invisible effort | Task completion scores, streaks, leaderboards | Recognition and friendly competition |
| Training gap | Wrong-match feedback teaches correct answers | Stewards learn the domain as they play |
| Reviewer burden | Accuracy scores identify who needs review vs. who is trusted | Risk-based review allocation |

### The Efficiency Trade-off

Yes, dragging a wire takes longer than clicking a checkbox. That is a feature, not a bug:

- **Checkbox stewardship:** 200 records/hour, 60% accuracy, no learning
- **Gamified stewardship:** 80 records/hour, 95% accuracy, stewards improve over time
- **Net effect:** Fewer downstream errors, less rework, lower cost of poor data quality
- The throughput "loss" is recovered many times over in reduced remediation

---

## Quality Metrics Enabled by Game Mechanics

### Per-Steward Metrics (the "Player Stats" model)

- **Accuracy rate** -- % of tasks completed correctly on first attempt
- **Retry rate** -- how often a steward gets it wrong before getting it right (learning signal)
- **Completion velocity** -- time per task (identifies both expertise and disengagement)
- **Streak tracking** -- consecutive correct completions (engagement indicator)
- **Domain proficiency** -- accuracy broken down by data domain (patient, product, location)

### Per-Reviewer Metrics

- **Override rate** -- how often a reviewer changes a steward's answer
- **Agreement rate** -- how often reviewer confirms steward was correct
- **Review throughput** -- reviews completed per session
- **Steward trust score** -- derived from accuracy; high-trust stewards need less review

### Organizational Metrics

- **Engagement rate** -- % of assigned stewards who actively complete tasks
- **Quality trend** -- accuracy over time by team, department, or domain
- **Training effectiveness** -- retry rate decreasing over time = stewards are learning
- **Decentralization health** -- quality held constant (or improving) as steward count grows

### How Among Us Mechanics Map to These Metrics

- **Task complete / wrong wires** = accuracy tracking per steward
- **Randomized records** = prevents memorization, tests real understanding
- **Visual feedback (glow, "Task Complete")** = dopamine loop that sustains engagement
- **Room-based tasks** = domain-specific stewardship (Electrical = patient data, other rooms = other domains)
- **Crewmate identity** = steward identity; every action is attributable

---

## What the Demo Shows Today

### The Skeld Map -- Stewardship as a World

- Full recreation of The Skeld (2048x1872 px), procedurally generated
- 15 named rooms representing potential stewardship domains
- Real-time crewmate movement (WASD), collision, room detection HUD
- Each room can host a different stewardship task type

### The Wiring Task -- Patient Record Matching

- Glowing panel in Electrical room; proximity-activated, click to open
- Among Us-styled task panel with real WiresPanel game texture
- **Left side:** Field labels (First Name, Last Name, Date of Birth, Blood Type)
- **Right side:** Shuffled realistic patient values
- **Drag-and-drop wires** (red, blue, yellow, pink) -- steward must deliberately connect each field to its value
- **Wrong-match feedback:** "Wrong wires -- try again!" (forces correction, creates retry metric)
- **"TASK COMPLETE" button** only appears on correct match (satisfaction loop)
- **6 randomized patient records** -- different data every time

### Profisee x InnerSloth Branding

- Partnership logos on main menu with animated starfield
- "Emergency Meeting -- Hackathon 2026" subtitle
- Authentic Among Us art style throughout

### Asset Browser

- 140+ cataloged Among Us game assets with search, preview, and metadata

---

## Suggested Presentation Flow

### Slide 1 -- Title

**"Emergency Meeting: Gamifying Data Stewardship"**

- Profisee x InnerSloth logos
- Team: Stephen Vick, Darius Brown
- Subtitle: "Because stewards shouldn't dread their queue"

### Slide 2 -- The Decentralization Problem

"As organizations scale MDM, stewardship has to move out of central IT and into the business. But business stewards don't engage with traditional UIs. Completion rates drop. Accuracy drops. The data stays dirty -- and now it's *everyone's* fault instead of no one's."

Key stat to cite: industry surveys show stewardship task completion rates below 40% in decentralized models without engagement incentives.

### Slide 3 -- The Gamification Thesis

"What if stewardship tasks felt like gameplay instead of homework? Game mechanics -- deliberate interaction, immediate feedback, visible progress, measurable accuracy -- solve the engagement and quality problem simultaneously."

Core message: **The inefficiency is worth it.** Slower per-task, but dramatically higher accuracy and engagement. The cost of poor data quality dwarfs the cost of a few extra seconds per record.

### Slide 4 -- The Among Us Analogy

"Among Us already solved this problem. Every crewmate has tasks. Tasks require physical presence and deliberate action. Skip a task and everyone notices. The ship doesn't survive. Sound familiar?"

- Crewmate = Data Steward
- Task = Stewardship workflow
- Room = Data domain
- Impostor = Bad data / unengaged steward
- Emergency Meeting = Data quality review

### Slide 5 -- Live Demo: Walk the Ship

Open the Skeld map. Walk through rooms. Show room detection, collision, the HUD. Point out: "Each room is a stewardship domain. Electrical is patient data. Admin could be customer data. Navigation could be product data."

### Slide 6 -- Live Demo: Complete the Task

Navigate to Electrical. Click the glowing panel. Drag wires to match "First Name" to "Sarah", "Blood Type" to "AB+". Intentionally get one wrong -- show the "Wrong wires" feedback. Fix it. Complete the task.

Script: "Notice what just happened. The steward had to *look* at the data. They had to make a deliberate connection. When they got it wrong, they got immediate feedback and had to try again. That retry is a data point. That correct completion is a data point. Every interaction is measurable."

### Slide 7 -- The Metrics Model

"Game mechanics give us something stewardship UIs never had: **per-person quality metrics.**"

Present the metrics framework:

- **Steward accuracy** -- first-attempt success rate
- **Retry rate** -- learning signal; decreasing over time = training is working
- **Completion velocity** -- expertise indicator
- **Streak tracking** -- engagement sustainer
- **Trust score** -- high-accuracy stewards get less reviewer oversight
- **Reviewer override rate** -- identifies where review effort should concentrate

Script: "You can't manage what you can't measure. Traditional stewardship gives you dataset-level quality. Gamified stewardship gives you *steward-level* quality. Now you know who your best stewards are, who needs training, and where to focus review."

### Slide 8 -- The ROI Argument

"Yes, dragging a wire takes longer than clicking a checkbox."

- Checkbox: 200 records/hour, 60% accuracy
- Gamified: 80 records/hour, 95% accuracy
- **60% accuracy at scale = massive downstream remediation cost**
- **95% accuracy at scale = trusted master data**
- The throughput delta is recovered in reduced rework, fewer downstream errors, and higher steward retention

### Slide 9 -- Vision: What's Next

- **More rooms, more task types:** merge/split records (Reactor), golden record selection (Navigation), survivorship rules (Admin), address standardization (Communications)
- **Leaderboards and streaks:** team-based competition across departments
- **Adaptive difficulty:** high-accuracy stewards get harder records; struggling stewards get guided tasks
- **Reviewer dashboard:** risk-based review queue driven by steward trust scores
- **Profisee integration:** game tasks backed by real Profisee matching and survivorship APIs

### Slide 10 -- Thank You / Q and A

---

## Key Talking Points for the Verbal Script

- **"Decentralization fails without engagement."** Pushing stewardship to business users only works if those users actually do the work. Gamification makes them want to.
- **"Friction is a feature."** Drag-and-drop is slower than bulk-approve. That's the point. Every second of friction is a second the steward is *looking at the data.*
- **"Every interaction is a metric."** Right, wrong, retry, time-to-complete, streak -- game mechanics produce per-steward quality data that traditional UIs cannot.
- **"Trust scores reduce reviewer burden."** When you know which stewards are accurate, you can skip review for their work and focus reviewer time where it matters.
- **"Stewards improve over time."** Wrong-match feedback is training. Retry rates decrease as stewards learn the domain. The game teaches while it measures.
- **"The ship metaphor works."** Among Us tasks keep the ship running. Stewardship tasks keep the data running. Skip your tasks and the impostor (bad data) wins.

## Key Stats for the Deck

- 2048 x 1872 pixel map, procedurally generated from collision geometry
- 15 rooms = 15 potential stewardship domains
- 6 randomized patient records per session (prevents memorization)
- 4 fields per task, drag-and-drop matching with immediate feedback
- Per-steward metrics: accuracy, retry rate, velocity, streak, trust score
- Zero game engine -- pure React 19 + TypeScript + SVG + Vite
