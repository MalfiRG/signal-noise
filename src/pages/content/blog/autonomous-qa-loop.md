---
title: "I Built an Autonomous QA Agent That Develops Its Own Fixes"
slug: "autonomous-qa-loop"
date: 2026-04-01
tags: ["AI", "QA", "automation", "Claude", "Playwright"]
category: "AI & Automation"
reading_time: "~7 min"
description: "How I set up a 30-minute autonomous loop that screenshots my frontends, finds visual bugs, fixes them, commits, and then builds new features when everything's clean."
og_image: "<!-- PLACEHOLDER -->"
draft: true
---

What happens when you give an AI agent a Playwright browser, two React frontends, and tell it to run every 30 minutes?

It finds bugs. It fixes them. And when there's nothing left to fix, it starts building new features.

## The Setup: File-Based Agent Synchronization

<!-- STUB: Describe the .agent-sync.json protocol — status flags (idle/working/finished/needs-human-input), cycle counting, the cron job, and why file-based sync beats anything more complex for a single-user dev workflow. -->

> **Tech Note:** The sync file is dead simple — a JSON with a status field. If another agent is already working, skip. If it needs human input, skip. Otherwise, claim it and go. No message queues, no Redis, no overthinking.

## The QA Loop: Screenshots as Ground Truth

<!-- STUB: Describe the Playwright-in-WSL2 setup (extracted .deb libs, LD_LIBRARY_PATH hack), the screenshot scripts, the breakpoint matrix (29 viewports), and the visual inspection workflow. Mention the [redacted-employer] scrub check as a recurring audit. -->

<!-- STUB: Talk about the hierarchy of what to test — content rendering and interactive flows FIRST, static page shells last. This was a hard-learned lesson (the "test actual content" feedback). -->

## The Fix Loop: See It, Fix It, Verify It

<!-- STUB: Walk through actual bugs found and fixed in real-time:
- LoginPage: sr-only labels → visible labels (accessibility)
- Touch targets: py-2 → py-3 (WCAG 2.5.5 minimum 44px)
- Blog tables: horizontal scroll on mobile
- [redacted-employer] references: scrubbed from about/data.ts and skills/data.ts
Each fix: screenshot → edit code → restart Vite (HMR doesn't work cross-filesystem in WSL2) → re-screenshot → commit -->

## The Development Pivot: When QA Goes Green

<!-- STUB: The interesting part — when QA finds nothing, the agent pivots to development work. Reading the PRD, identifying the next Phase 2 feature, implementing it, screenshotting to verify, committing. Four cycles shipped four major pages:
- Cycle 7: Site Configuration Management (FR-UI-003)
- Cycle 8: Job Listings with search/filter/sort (FR-UI-001)
- Cycle 9: Blog projects data population
- Cycle 10: Scrape Monitoring with trigger button (FR-UI-004)
-->

> **Key Insight:** The agent doesn't just find problems — it builds solutions when there are no problems left. That's the real value proposition. QA and development aren't separate workflows; they're the same loop at different confidence levels.

## The WSL2 Tax: Everything That Went Wrong

<!-- STUB: The gotchas that made this harder than it should be:
- npm --no-bin-links on Windows filesystem
- Vite HMR doesn't detect inotify across /mnt/c/ boundary
- Windows git.exe for identity/credentials, WSL git for speed
- CRLF noise after Windows git pull (90+ files "modified")
- Playwright Chromium missing shared libraries (the .deb extraction hack)
- PEP 668 blocking pip install
-->

## What I'd Do Differently

<!-- STUB: Reflections on the workflow:
- The sync file protocol is overkill for one user but would scale to multi-agent
- Screenshot-based QA catches layout bugs but misses logic bugs
- The 30-minute cycle is about right — shorter wastes time on server restarts, longer loses momentum
- Having the PRD as a development roadmap is critical — without it the agent just polishes existing code
-->

---

<!-- STUB: Natural closing connecting to broader theme of AI-assisted development being a force multiplier, not a replacement. The agent does the mechanical work (screenshots, responsive testing, boilerplate wiring), the human provides judgment (what to build, design decisions, when to stop). -->
