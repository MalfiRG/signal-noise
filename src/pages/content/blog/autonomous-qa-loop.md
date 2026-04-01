---
title: "I Built an Autonomous QA Agent That Develops Its Own Fixes"
slug: "autonomous-qa-loop"
date: 2026-04-01
tags: ["AI", "QA", "automation", "Claude", "Playwright"]
category: "AI & Automation"
reading_time: "~8 min"
description: "How a 30-minute autonomous loop screenshotted my frontends, found bugs, fixed them, built 8 new pages, wired up an Apify scraper, and scraped 254 real jobs — all in one session."
og_image: "<!-- PLACEHOLDER: Terminal screenshot showing the agent sync file with cycle count at 14 -->"
draft: true
---

What happens when you give an AI agent a Playwright browser, two React frontends, and tell it to run every 30 minutes?

It finds bugs. It fixes them. And when there's nothing left to fix, it starts building new features. Then it wires up a scraper to a cloud API, debugs its own integration errors, and scrapes 254 real job listings from the internet. Fourteen cycles. One session. A product that didn't exist when I started.

This is the story of how I set up an autonomous QA and development loop that runs on a cron job, coordinates through a JSON file, and shipped an entire job aggregator frontend — including a working scraper — while I mostly watched.

## The Dumbest Coordination Protocol That Actually Works

Most people hear "agent coordination" and think distributed systems — message queues, Redis pub/sub, webhook endpoints, the whole enterprise circus. I needed something simpler. Something that would survive a WSL2 reboot, a power outage, or me just forgetting it was running.

So I wrote a JSON file.

```json
{
  "status": "working",
  "cycle_count": 14,
  "last_result": "254 jobs scraped from HN Who Is Hiring in 9.5s",
  "needs_human_input": false
}
```

That's it. That's the entire coordination layer. A file called `.agent-sync.json` sitting in the workspace root. The protocol is dead simple: if `status` is `working`, another agent is already active — skip. If it's `needs-human-input`, something's blocked — skip. If it's `idle`, `finished`, or `error` — claim it, set to `working`, increment the cycle count, and go.

> **🔥 Hot Take:** The best distributed system for a single-user dev workflow is a file. Not Kafka. Not RabbitMQ. A file. Fight me.

The cron job fires every 30 minutes. Each cycle reads the sync file, claims ownership, does its work, writes results back. Fourteen cycles ran in this session — zero coordination failures. Sometimes the boring solution is the right one.

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

And it actually did it. The backend had full CRUD APIs for everything — sites, jobs, scraping, analytics, user profiles — but the frontend was three pages: login, register, and a dashboard with placeholder cards. The agent read the PRD, identified the requirements, and started shipping.

| Cycle | What Shipped | PRD Requirement |
|-------|-------------|-----------------|
| 7 | Site Configuration Management | FR-UI-003 |
| 8 | Job Listings (search, filters, sort, pagination) | FR-UI-001 + FR-UI-002 |
| 9 | Blog portfolio data (3 projects) | — |
| 10 | Scrape Monitoring (trigger + history) | FR-UI-004 |
| 12 | Profile & Settings (CV upload, password change) | FR-UI-006 |
| 13 | Analytics (jobs by month/company, score distribution) | FR-UI-005 |

Six development cycles. Eight new pages. Every single PRD UI requirement (FR-UI-001 through FR-UI-007) covered. The dashboard went from three placeholder cards to a fully functional navigation hub. And every page was responsive — table view on desktop, card view on mobile — without me specifying that requirement. The agent just... did it.

<!-- IMAGE: Dashboard screenshot showing all three feature cards as clickable links — Site Configs, Job Listings, Monitoring -->

## And Then It Wired Up a Scraper

This is where it got properly wild. The PRD specified Apify as the scraping engine, but no integration code existed. The backend had a `POST /api/scrape/trigger` endpoint that created a run record but didn't actually scrape anything.

I gave the agent an Apify API key and said "go for it."

It built a scraper service that transforms CSS selectors from the site config into a JavaScript `pageFunction`, sends it to Apify's Web Scraper actor via REST API, waits for completion, fetches results from the dataset, deduplicates jobs by URL, and stores them in the database. All using `httpx` — no Apify SDK, no extra dependencies.

The debugging progression is the best part. The monitoring page captured the entire story:

1. **12:03 — failed, 0 jobs, 0s.** The actor ID used `apify/web-scraper` but Apify's naming convention requires a tilde: `apify~web-scraper`. Classic integration bug. HTTP 404.

2. **12:05 — success, 0 jobs, 37s.** The API call worked! The actor ran for 37 seconds! But the CSS selectors for RemoteOK had unescaped slashes in a jQuery attribute selector. Zero matches.

3. **12:06 — success, 254 jobs, 9s.** Switched to Hacker News "Who is Hiring" with simpler selectors. Two hundred and fifty-four job listings scraped in under ten seconds, stored in the database, visible through the Jobs page with full pagination and search.

> **⚙️ Tech Note:** The monitoring UI doesn't just show "success" or "failed" — it shows the debugging history. Three runs, three different failure modes, captured in production data. The agent's mistake log became the product's feature.

And the moment I opened the Jobs page and saw 13 pages of real job listings with sortable columns and search — that was it. The pipeline was alive. Site config → Apify actor → database → paginated frontend. End to end.

The Analytics page lit up too. Jobs by month: 2026-04 → 254. Jobs by company: 20 unique posters. Score distribution: empty — no AI analysis yet, but the infrastructure is there. A bar chart that's waiting for data is still a bar chart that works.

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

Having the PRD as a development roadmap was critical. Without it, the agent would just polish existing code — tweaking padding, adjusting colors, making things marginally better but not meaningfully different. The PRD gave it a clear list of what to build next, in order, with acceptance criteria. The agent even used it to prioritize: site configs before jobs (you need sites to scrape), jobs before monitoring (you need jobs to monitor), profile before analytics (you need CV text for AI analysis).

And the file-based sync? It's perfect for one user. But if I ever wanted multiple agents working in parallel — say one on frontend, one on backend — I'd need actual locking. A file with a status field doesn't handle concurrent writes. For now, though? It's exactly right.

---

Fourteen cycles. One session. Five bugs fixed, eight pages built, one scraper integrated, 254 jobs scraped. The frontend went from 3 pages to 8. The dashboard went from placeholder cards to a functioning job aggregator.

The thing that sticks with me isn't any individual feature — it's the continuity. The agent didn't just do QA or just do development. It did QA, and when the QA was clean, it built. When the building was done, it QA'd what it built. When the QA passed, it built more. The cycle didn't stop because the task changed — it adapted.

QA and development aren't separate workflows. They're the same loop at different confidence levels. And honestly? Watching an AI agent figure that out on its own — following the gradient from uncertainty to progress, from testing to building to testing again — that's the part I didn't expect to find beautiful.

But it kind of is.
