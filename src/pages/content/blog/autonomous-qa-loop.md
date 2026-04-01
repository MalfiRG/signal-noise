---
title: "I Built an Autonomous QA Agent That Develops Its Own Fixes"
slug: "autonomous-qa-loop"
date: 2026-04-01
tags: ["AI", "QA", "automation", "Claude", "Playwright"]
category: "AI & Automation"
reading_time: "~7 min"
description: "How I set up a 30-minute autonomous loop that screenshots my frontends, finds visual bugs, fixes them, commits, and then builds new features when everything's clean."
og_image: "<!-- PLACEHOLDER: Terminal screenshot showing the agent sync file with cycle count incrementing -->"
draft: true
---

What happens when you give an AI agent a Playwright browser, two React frontends, and tell it to run every 30 minutes?

It finds bugs. It fixes them. And when there's nothing left to fix, it starts building new features. I watched it ship four major pages in four cycles — site configuration management, job listings with search and filters, a scrape monitoring dashboard, and a populated portfolio page — all without me touching the keyboard.

This is the story of how I set up an autonomous QA and development loop that runs on a cron job, coordinates through a JSON file, and has genuinely better taste in responsive design than I expected.

## The Dumbest Coordination Protocol That Actually Works

Most people hear "agent coordination" and think distributed systems — message queues, Redis pub/sub, webhook endpoints, the whole enterprise circus. I needed something simpler. Something that would survive a WSL2 reboot, a power outage, or me just forgetting it was running.

So I wrote a JSON file.

```json
{
  "status": "working",
  "cycle_count": 10,
  "last_result": "QA pass clean. Built monitoring page...",
  "needs_human_input": false
}
```

That's it. That's the entire coordination layer. A file called `.agent-sync.json` sitting in the workspace root. The protocol is dead simple: if `status` is `working`, another agent is already active — skip. If it's `needs-human-input`, something's blocked — skip. If it's `idle`, `finished`, or `error` — claim it, set to `working`, increment the cycle count, and go.

> **🔥 Hot Take:** The best distributed system for a single-user dev workflow is a file. Not Kafka. Not RabbitMQ. A file. Fight me.

The cron job fires every 30 minutes. Each cycle reads the sync file, claims ownership, does its work, writes results back. Ten cycles ran in this session — zero coordination failures. Sometimes the boring solution is the right one.

## Playwright in WSL2: A Story of Extracted Libraries

Here's where it gets spicy. I needed headless Chromium running in WSL2 to take screenshots. No `sudo` access. No package manager. No Chrome installed.

The solution was beautifully hacky: download the `.deb` packages for Chromium's dependencies, extract the shared libraries with `dpkg-deb -x`, dump them into a user directory, and point Playwright at them with `LD_LIBRARY_PATH`.

```bash
LD_LIBRARY_PATH=/home/piotr/chromium-libs/usr/lib/x86_64-linux-gnu \
  node screenshot-blog.js
```

It works. It's ugly. I love it.

The screenshot scripts hit each frontend across multiple viewports — desktop (1280px), tablet (768px), mobile (375px). Twenty-nine breakpoints in the full matrix, covering every Tailwind breakpoint plus custom boundaries and common devices from iPhone SE to Full HD. The agent reads each PNG with its vision capabilities and checks for broken layouts, missing styles, overlapping elements, and — critically — any mention of my employer's name that shouldn't be in public content.

<!-- IMAGE: Side-by-side comparison of a visual bug found and fixed — the LoginPage before/after visible labels -->

## What It Actually Found (And Fixed)

The agent didn't just rubber-stamp everything. Across 250+ screenshots in the first few cycles, it caught real issues:

**LoginPage accessibility.** The login form had `sr-only` labels — screen reader only, invisible to sighted users. The register page had visible labels. Inconsistency. The agent spotted it, made the labels visible, separated the cramped input group into properly spaced fields with `space-y-4`, and committed the fix.

**Touch targets too small.** Both login and register pages had `py-2` on inputs and buttons — roughly 36px. WCAG 2.5.5 says interactive elements need at least 44px. The agent bumped everything to `py-3`, checked the rendered height, confirmed it cleared the threshold. Two commits, two pages fixed.

**Table overflow on mobile.** The blog's style-test post has a table that was wider than the viewport on mobile. The agent removed `min-w-full` from the table element and added `whitespace-nowrap` on `<th>` elements so the horizontal scroll wrapper could do its job.

**Employer name in public content.** The about section and skills page both referenced my employer by name. Global obfuscation rule says zero references in any output. The agent found both, scrubbed them to generic phrasing ("at work" instead of the company name), committed separately.

> **💡 Key Insight:** The agent caught things I'd been staring at for weeks. Fresh eyes — even artificial ones — matter. It prioritized content rendering and interactive flows over static page shells, which is exactly right. Testing a login form that actually submits is more valuable than testing whether a 404 page has the right font.

## The Development Pivot: When QA Goes Green

This is the part that surprised me most. The loop's mandate was: QA first, development second. If no issues are found, read the PRD and build the next feature.

And it actually did it. Here's what shipped across four consecutive cycles:

**Cycle 7 — Site Configuration Management.** The backend already had full CRUD for site configs. The agent created TypeScript types matching the Pydantic schemas, wired up an API service, built a page with table view (desktop), card view (mobile), create/edit modal with JSON editors, delete confirmation, and an active toggle switch. One commit, one push.

**Cycle 8 — Job Listings.** Same pattern. Types, API service, page component. But this one was more complex — search bar, status filter, sortable column headers with visual indicators, expandable row details showing the full description and AI analysis, pagination. All responsive. Desktop gets a data table, mobile gets compact cards.

**Cycle 9 — Blog Projects.** The portfolio page was empty. The agent populated it with three real projects (ScoutQL, The Digital Matrix, Whispr Local), each with descriptions, tech stack badges, and GitHub links. Verified no employer references in the descriptions.

**Cycle 10 — Scrape Monitoring.** Trigger button, run history with status badges (running pulse animation, success green, partial yellow, failed red), expandable per-site breakdown, pagination. The "Run Scrape Now" button actually hits the backend and creates a run record.

Four cycles. Four pages. The dashboard went from three placeholder cards to three functional navigation links. The frontend went from 3 pages to 6 pages in about two hours of autonomous operation.

<!-- IMAGE: Dashboard screenshot showing all three feature cards as clickable links — Site Configs, Job Listings, Monitoring -->

## The WSL2 Tax: Everything That Went Sideways

Let me be honest about the pain points, because this wasn't all smooth sailing.

**HMR doesn't work across filesystems.** Vite's Hot Module Replacement relies on `inotify` events. When you edit a file on `/mnt/c/` (Windows NTFS) from WSL, those events don't propagate. The fix? Restart the entire dev server after every edit. The agent learned this the hard way — and then just automated the restart.

**CRLF noise everywhere.** After pulling with Windows git, 90+ files showed as "modified" because of line ending differences. The fix: `git checkout -- .` to reset CRLF noise, then stage specific files only. Every. Single. Time.

**Two gits, one repo.** Windows `git.exe` has the identity and credentials configured. WSL git doesn't. So commits go through `/mnt/c/Program Files/Git/bin/git.exe` while everyday operations use WSL git for speed. It's not elegant, but it works.

**npm symlinks fail on Windows filesystem.** `npm install` from WSL on `/mnt/c/` creates symlinks that Windows can't follow. The flag `--no-bin-links` fixes it but has to be remembered every time.

> **⚙️ Tech Note:** If you're doing cross-platform dev in WSL2, accept that the filesystem boundary is a leaky abstraction. Plan for it. Automate around it. And never, ever assume `inotify` works on `/mnt/c/`.

## What I'd Do Differently

The 30-minute cycle is about right. Shorter wastes time on server restarts and Playwright cold boots. Longer loses momentum and makes the sync file stale. But there are things I'd change.

The screenshot-based QA catches visual bugs brilliantly but misses logic bugs entirely. A form that renders perfectly but submits to the wrong endpoint? Invisible. The next iteration should include light functional testing — fill a form, click submit, verify the response.

Having the PRD as a development roadmap was critical. Without it, the agent would just polish existing code — tweaking padding, adjusting colors, making things marginally better but not meaningfully different. The PRD gave it a clear list of what to build next, in order, with acceptance criteria.

And the file-based sync? It's perfect for one user. But if I ever wanted multiple agents working in parallel — say one on frontend, one on backend — I'd need actual locking. A file with a status field doesn't handle concurrent writes. For now, though? It's exactly right.

---

The thing that sticks with me is the pivot. QA and development aren't separate workflows — they're the same loop at different confidence levels. When confidence is low (new code, untested views), the loop does QA. When confidence is high (everything renders clean), it does development. The agent doesn't switch modes. It just follows the gradient from uncertainty to progress.

That's not a replacement for human judgment. I still decide what to build, how to prioritize, when the design is wrong. But the mechanical work — screenshots, responsive testing, type definitions, API wiring, boilerplate pages — that's the agent's territory now. And honestly? It's better at the responsive design part than I am.
