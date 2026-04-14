# Bug Reporting

A bug report has one job: make someone who has never seen this bug reproduce it and understand why it matters. Everything in the report either serves that goal or is noise.

## The Template

Every bug report I write follows six fields:

- **Title** — `METHOD /endpoint - variable.path short description`. The title IS the description. No separate "Description" section needed.
- **Severity** — Critical, Major, Minor, or Trivial
- **Initial state** — one line, name-agnostic (no specific hostnames or lab names)
- **Steps** — 2-4 lines maximum. Reproducible, not a narrative of your investigation
- **Actual** — what happens, with relevant data
- **Expected** — what should happen
- **Logs** — verbatim excerpts. Stack traces, error messages. Replace hostnames with generic placeholders

That's it. If a bug report needs more than this, you're either explaining too much or the bug is more complex than one report should cover.

## The Rules

**No "Description" section.** I've seen bug reports where the title says "API error" and then there's a three-paragraph Description that actually explains what's happening. Put it in the title: `POST /policies - schedule.dailyType resets to "Everyday" when mode changes`. If the title is specific enough, the developer knows what they're looking at before reading the steps.

**Steps are reproducible, not a narrative.** "I was testing the schedule configuration and noticed that when I changed the mode..." — that's a story, not reproduction steps. Write: "1. Create resource with `schedule.type=Daily`. 2. PUT to change `mode`. 3. GET the resource." The developer should be able to copy your steps and hit the same bug.

**Let logs speak.** Don't re-explain what a stack trace already shows. If the error says `NullReferenceException at ScheduleValidator.Validate()`, include the stack trace and move on. The developer reads stack traces faster than your prose description of one.

**Name-agnostic.** Write "a Windows Server machine", not your lab hostname. The bug exists regardless of which specific machine you tested on. Hostnames make the report harder to parse and leak infrastructure details that don't matter.

**Include the minimal request body.** For API bugs, include the smallest request body that triggers the issue — not your full test spec with 15 optional fields. Strip it down to the fields that matter.

**1-2 sentence descriptions, 2-4 step reproduction.** Brevity is a feature. If your bug report is longer than your screen, the developer will skim it and miss the important part.

**Never set Priority.** This is a triage team decision, not a QA decision. I set Severity (how bad is the impact), not Priority (when should it be fixed). The distinction matters organizationally — it prevents QA engineers from escalating their favorite bugs by marking everything as P1.

**Log excerpts are mandatory.** No bug report without supporting evidence. Screenshots for UI bugs, log excerpts for backend bugs, response bodies for API bugs. "It returned an error" is not evidence.

## The Verification Checklist

Before filing, I run through a systematic checklist to prevent false bug reports. Filing an infrastructure issue as a product bug wastes everyone's time — the developer investigates, finds it's your lab setup, and now your credibility takes a hit.

1. Did you look for already-filed bugs?
2. Did you try it with a fresh database?
3. Are all services running?
4. Is it specific to a deployment mode?
5. Is it specific to a connection type?
6. Is it platform-specific (Linux vs Windows)?
7. Was the bug present in past releases?
8. Did you check the expected behavior in a related product?
9. Does it reproduce via CLI or script?
10. Is the firewall a possible cause?
11. Is there any workaround?

Most false positives die at questions 2-4. A fresh database eliminates stale state. Checking all services running catches the "backend was down" embarrassment. Deployment mode narrows the scope and often reveals the root cause before you even file.

## Severity Classification

The classification is about impact, not about how annoyed you are:

| Severity | Criterion | Examples |
|----------|-----------|---------|
| **Critical** | Feature completely unusable. Data loss or corruption. Security vulnerability | CRUD broken, auth bypass, data deleted without user action |
| **Major** | Significant functionality broken, workarounds exist | Sorting fails, filter returns wrong results, but user can still access data |
| **Minor** | Edge cases, lower likelihood, degraded experience | Boundary value not rejected, optional parameter ignored |
| **Trivial** | Cosmetic issues, the feature works perfectly | Typos, alignment, tooltip text wrong |

When in doubt between two levels, go higher. It's easier to downgrade a severity than to re-escalate after triage already deprioritized it.

## The Bug Lifecycle in Documentation

When I file a bug, it's not just a ticket — it connects to the test plan:

1. Add an index entry: sequential number, method, endpoint, description, date
2. Add the full bug description to the bug record
3. Publish to the work tracking system
4. If the bug maps to specific test cases, mark those cases as FAILED or BLOCKED in the test plan
5. Update statistics only if test cases were modified
6. Bump the test plan version if documents were modified

This connectivity matters because it's how bugs become regression tests. When the fix ships, the test case gets re-executed. If it passes, the bug is verified fixed. If it still fails, the fix didn't work. The test plan is the living record of what works and what doesn't.

## AI-Assisted Quality Review

Before submitting a report, I run it through an AI review pass — not to write the report, but to catch what I missed:

- Is this report clear to someone who hasn't been debugging this for the last hour?
- Are the reproduction steps actually reproducible, or do they assume context?
- Is the expected vs actual behavior stated explicitly?
- Is the environment specified?
- Are log excerpts included?

The AI catches blind spots — especially the assumption of shared context. After spending 45 minutes reproducing a bug, you know exactly what's happening. But the developer reading the report in 3 days doesn't have that context. The review pass catches the gap.
