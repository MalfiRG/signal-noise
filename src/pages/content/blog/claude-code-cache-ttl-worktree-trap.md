---
title: "Two Independent Causes of Claude Code's 5-Minute-TTL Cache Drift — Session Size and Git Worktrees (an ANCOVA)"
slug: "claude-code-cache-ttl-worktree-trap"
date: 2026-04-22
tags: ["ai", "claude-code", "prompt-caching", "git-worktrees", "cost-optimization", "statistics", "ancova"]
category: "AI & Automation"
reading_time: "~14 min"
description: "Parsed 30 days of my local Claude Code JSONL transcripts and ran an ANCOVA on 110 sessions. Two factors independently drive per-session 5-minute-TTL cache share: session length and whether the session ran inside a git worktree. Worktree effect is +39 percentage points at any session size, p = 2×10⁻⁵, partial η² = 0.156. Graphs, tables, hypotheses, a short primer on Analysis of Covariance because it somehow didn't come up in my biotech PhD, and the one-layer fix that resolves it."
og_image: "/images/blog/claude-code-cache-ttl-worktree-trap/fig1_ancova_parallel_lines.png"
draft: true
---

## TL;DR

Parsed 30 days of my Claude Code JSONL transcripts. Two factors independently drive per-session 5-minute-TTL cache share, and controlling for one does not kill the other. Session length matters (F = 73.65, partial η² = 0.41). Git-worktree location matters on top of that (F = 19.75, p = 2.2×10⁻⁵, partial η² = 0.156), shifting the whole drift curve up by about 39 percentage points regardless of how long the session runs. Together the two effects explain roughly half the variance across 110 sessions. Mechanism is `git rev-parse --show-toplevel` returning the worktree dir, so Claude Code treats it as its own project root and never reads the parent repo's `.claude/settings.local.json`. Fix is a user-level `~/.claude/settings.json` hook chain, which is the only config layer loaded regardless of which project root the session resolves to.

## Introduction

Claude Code writes every assistant message's token usage to a local JSONL file under `~/.claude/projects/<slug>/<session>.jsonl`. Inside each `usage` block there are two counters I care about: `ephemeral_5m_input_tokens` and `ephemeral_1h_input_tokens` — these are the two prompt-cache TTL buckets Anthropic charges differently for. The 1-hour bucket costs twice as much per write but pays the author back across any cache read inside the hour. On my real interactive workload I see about 14 cache reads per write, so the 1-hour bucket works out to roughly 9× cheaper per sustained session. Every percentage point of cache mass that lands in the 5-minute bucket instead of the 1-hour one is a proportional chunk of that discount gone.

So when a cost audit showed one of my projects sitting at 52 % 5-minute share while another was at 33 %, the obvious next question was "what's different about the higher one?". The obvious next answer — "that project has longer sessions" — turned out to be only half true. Both factors were real. The aggregate number was hiding the fact that session length and git-worktree location are independent drivers of cache-TTL drift. Untangling them required reaching for a statistical test I'd never used in my biology PhD. This post is the whole debugging loop written up as a mini scientific article, because the data deserved more than hand-waving and a table.

## Methodology

### Data collection

I aggregated every ScoutQL session over the 30-day window ending 2026-04-22 that had non-zero cache creation. 110 sessions total — 101 inside the main checkout of the repo, 9 inside git worktrees of the same repo. For each session I recorded three things:

- **events** — number of assistant messages in the session, proxy for length (range 4 to ~7 000)
- **location** — whether the session ran inside a git worktree (nominal, 2-level: Main / Worktree)
- **share_5m** — the per-session 5-minute-TTL cache share, computed as `e5 / (e5 + e1)` ∈ [0, 1]

### Hypotheses

**H₀ (null):** After controlling for session length, there is no difference in 5-minute-TTL cache share between Main and Worktree sessions. The two regression lines of `share_5m ~ log₁₀(events)` have the same intercept.

**H₁ (alternative):** The intercepts differ. Worktree sessions carry an additive offset in 5-minute share that is present at every session length.

### Research questions

1. Does session size matter at all? If it doesn't, there's nothing to control for.
2. Does worktree-vs-main matter *independently* of session size?
3. Is the worktree effect constant across session lengths (additive offset) or does it grow with session length (interaction)?
4. Is the extreme-cell pairwise difference large enough to matter, or a small-sample artifact?
5. Together, how much of the per-session variation do these two factors explain?

### Why ANCOVA and not ANOVA

If you came out of a biology or medicine PhD the way I did, your statistical toolkit was probably Student's t, one-way ANOVA, Tukey post-hoc, a chi-square somewhere, and Kruskal-Wallis when the distribution wasn't Gaussian. Analysis of Covariance — ANCOVA — wasn't in mine. I'd never heard the name until I needed it for this analysis.

ANOVA's response is continuous, its predictors are categorical only, and its question is "do the group means differ?" ANCOVA keeps the continuous response and keeps the categorical factor, but it also admits **continuous predictors** alongside the factor. Those are called *covariates*. The covariate's variance is subtracted from the response before the factor is tested. Here, session length is continuous, varies a lot, and probably correlates with location — worktrees may just host longer sessions. The way to ask "does location still matter after I've accounted for length?" is ANCOVA.

Geometrically, what ANCOVA fits is **one regression line per group** on the covariate. The test on the factor checks whether the lines share the same intercept. The test on the factor-by-covariate interaction checks whether they share the same slope. Different intercept, same slope = additive group effect, parallel lines. Different slope = the groups respond to the covariate differently. My data had enough overlap in session-length range across groups that both effects were identifiable — barely, on the worktree side, but enough. That overlap is the unspoken precondition ANCOVA needs to work.

The alternative would be to bucket session length into ordinal bins (tiny / short / medium / long / xlong) and run a two-way ANOVA, which I also did as a supporting check. It reaches the same qualitative conclusion with weaker effect-size estimates, because it throws away within-bucket variation that ANCOVA uses for free.

### Model

The **response variable** is `share_5m`, a continuous ratio bounded to *[0, 1]*.

The **continuous covariate** is `log10(events)` — the log-base-10 of how many events the session contained, which handles the three-orders-of-magnitude range (4 events to ~7 000) without letting the few very-long sessions dominate the fit.

The **nominal factor** is `location`, with two levels — *Main* (session ran from the main checkout of the repo) and *Worktree* (session ran from inside a git worktree of that repo).

**Sample size:** *n = 110* sessions over the 30-day window.

The additive model is `share_5m ~ log10(events) + C(location)`. I also fitted the interaction term `log10(events) × C(location)` separately as a parallel-lines test — if it comes back non-significant, the two regression lines have the same slope and the additive summary is the right one.

## Results

### Descriptive — cache share climbs with session size, worktrees sit uniformly higher

Mean per-session 5-minute-TTL share by size bucket and location, with SE error bars and per-cell n labels:

![Bucket means — per-session 5m-TTL share by session size and location, showing the worktree offset at every bucket](/images/blog/claude-code-cache-ttl-worktree-trap/fig2_bucket_means.png)

The full bucket table:

| Location | Bucket (events)  |   n | mean 5m | sd      |
|----------|------------------|----:|--------:|--------:|
| Main     | tiny   (<10)     |  40 |   0.000 |   0.000 |
| Main     | short  (10–49)   |  33 |   0.099 |   0.289 |
| Main     | medium (50–199)  |  13 |   0.347 |   0.377 |
| Main     | long   (200–499) |   7 |   0.536 |   0.462 |
| Main     | xlong  (500+)    |   8 |   0.466 |   0.162 |
| Worktree | tiny             |   4 |   0.250 |   0.500 |
| Worktree | medium           |   1 |   1.000 |   —     |
| Worktree | long             |   1 |   1.000 |   —     |
| Worktree | xlong            |   3 |   0.974 |   0.045 |

Main-checkout tiny sessions sit at zero — short sessions cache everything to the 1-hour bucket and read it back. As session size grows, the main-checkout curve climbs to about 47 % at xlong (500+ events). Worktrees start at 25 % in the tiny bucket and climb to 97 % at xlong. The worktree curve is visually parallel to the main curve but offset upward across the whole range. That's the parallel-lines shape ANCOVA tests formally.

### ANCOVA — the formal test

Fit `share_5m ~ log10(events) + C(location)` on all 110 sessions. This is the model that pulls the session-length effect into a continuous covariate and tests the location factor independently:

![ANCOVA parallel lines — Main and Worktree regression lines with the +39 pp vertical offset annotated](/images/blog/claude-code-cache-ttl-worktree-trap/fig1_ancova_parallel_lines.png)

| Effect          |    SS |   df |       F |         p          | partial η² |
|-----------------|------:|-----:|--------:|-------------------:|-----------:|
| log₁₀(events)   |  4.54 |    1 |   73.65 |    < 1×10⁻¹²       |     0.407  |
| Location        |  1.22 |    1 |   19.75 |       2.2×10⁻⁵     |     0.156  |
| Residual        |  6.60 |  107 |       — |                  — |          — |

R² = 0.503 (adjusted 0.493). Both predictors are highly significant and both clear Cohen's "large effect" threshold (partial η² ≥ 0.14). The fitted coefficient on `Worktree` is +0.389 — at any given session size, a worktree session sits about 39 percentage points higher in 5-minute-TTL share than a main-checkout session.

Running the interaction model `share_5m ~ log10(events) * C(location)` gives a non-significant interaction term (F = 1.66, p = 0.20). The two lines are statistically parallel — the worktree effect is a uniform additive offset across session length, not a shift that grows or shrinks with size. I'd expected the worktree effect to grow with session size (longer session → more dynamic churn → more 5-minute writes); the data said no, it's the same ~39 pp whether the session is 10 events or 1 000.

### xlong cell — pairwise sanity check

The xlong bucket is where both populations are furthest from baseline. Welch's t-test on Main xlong (n = 8) vs Worktree xlong (n = 3):

![xlong cell dot plot — individual sessions; Main cluster wide at 47 %, Worktree cluster tight at 97 %](/images/blog/claude-code-cache-ttl-worktree-trap/fig3_xlong_distributions.png)

Main xlong: mean 0.466, sd 0.162. Worktree xlong: mean 0.974, sd 0.045. Welch's t = −8.07, p < 0.0001, Cohen's d = 3.51. Mann-Whitney U non-parametric check gives p = 0.019 even with n = 3 on the worktree side.

The Cohen's d of 3.51 is absurd by conventional standards — the "large effect" threshold is 0.8. It's absurd because the worktree xlong cluster is *tight* (three sessions within 4.5 percentage points of 97 %), so the pooled standard deviation is about 0.14 and the mean difference of 0.5 blows past every threshold. If worktree sessions were as variable as main sessions, d would be about 1.5 for the same gap — still huge, less eye-popping. The tight cluster is itself real information: the worktree trap produces a near-deterministic outcome, not a stochastic one.

### Effect sizes

![Effect-size bar chart — session size and location both exceed Cohen's 0.14 "large effect" threshold](/images/blog/claude-code-cache-ttl-worktree-trap/fig4_effect_sizes.png)

Partial η² for session size is 0.407, for location is 0.156. Both above Cohen's "large" threshold of 0.14. That's the effect-size picture that corresponds to the highly significant p-values — these are not "statistically detectable but practically tiny" effects, they are genuinely large.

### Robustness

Three checks worth naming. First, the response is a proportion ∈ [0, 1]. OLS regression assumes Gaussian residuals with homoscedastic variance, which a proportion technically violates. Re-running the ANCOVA after an arcsine-square-root transform on the response gives essentially identical F-statistics and the same qualitative conclusion. Not an artifact of the distribution assumption. Second, the supporting two-way ANOVA on bucketed session size (same data, ordinal covariate instead of continuous) reproduces the finding at slightly weaker effect sizes, which is the expected cost of information loss from bucketing. Third, the Mann-Whitney non-parametric pairwise on the xlong cell survives the small-n worktree sample.

## Discussion

### Mechanism — SessionStart hooks anchor the 1-hour cache

Claude Code tags stable prefix content of each model request (system prompt, tool schemas, CLAUDE.md, SessionStart hook stdout) with 1-hour TTL, and dynamic per-turn content with 5-minute TTL. The caching heuristic keys on prefix-hash stability — large stable preambles get big 1-hour anchors that amortize across every subsequent cache read; sessions without preamble see each turn's changing prefix written to 5-minute instead.

The main lever for the 1-hour anchor is SessionStart hooks. They're configurable emit-points that inject deterministic bash-script output into the session's system context. A hook that outputs 10 KB of backlog summary, lessons file, or architecture-doc slice adds 10 KB of stable prefix that lands in the 1-hour bucket and gets read back 14 times over the session. The ANCOVA's ~39 pp worktree coefficient is the quantitative measure of how much of that anchoring content worktree sessions are silently missing.

### The worktree gotcha

Claude Code resolves project root via `git rev-parse --show-toplevel`. Git worktrees are their own top-level — each worktree has an independent working-tree root as far as git is concerned, even though its `.git` file points back at the parent repo's object database. So when Claude Code starts a session from `<repo>/.claude/worktrees/<name>/`, the project root it resolves to is the worktree directory. The `.claude/settings.json` it loads is the one at the worktree root — a minimal stub auto-propagated by `git worktree add`, usually containing a plugin toggle and nothing else. No hooks. The rich project-level config in the parent `<repo>/.claude/settings.local.json` is never consulted. CLAUDE.md discovery probably bifurcates the same way — the worktree's tracked CLAUDE.md bytes are there because git tracks them, but any `settings.local.json`-directed additional-context paths are not.

### The fix

User-level `~/.claude/settings.json` is the only Claude Code config layer loaded regardless of which project root the session resolves to. Moving the SessionStart hook chain there means every session — main checkout, worktree, nested sub-repo, arbitrary cwd — gets the same deterministic preamble anchored into the 1-hour bucket. For worktree sessions specifically, user-level hooks pull the ~97 % xlong-worktree 5-minute share down toward whatever curve main-checkout sessions already run on. For main-checkout sessions, user-level hooks extend the 1-hour anchor beyond whatever default preamble Claude Code provides, pulling the xlong-main ~47 % share toward near-zero.

One migration gotcha. Claude Code merges hooks additively across user, project, and project-local layers — union, not override. If you add user-level hooks without stripping pre-existing project-level copies, each hook fires twice per session. I measured it in my own setup: doubled hooks added about $0.11 per session in redundant 1-hour writes, invisible unless you count `hook_success` records in the JSONL transcript. Strip the lower-layer duplicates after migration; keep user-level as the single authority.

## Limitations

Sample size and log-linearity. The worktree sample is small (n = 9, one project). Replicating on more projects and more worktree sessions would tighten the 39 pp point estimate, and would test whether the magnitude is workflow-specific — my worktrees happen to host long feature-branch sessions, so someone who uses worktrees for short-lived hotfix work might see a smaller effect because short sessions don't drift as much regardless. The analysis also treats `log10(events)` as linear in share_5m. A non-linear relationship (say, drift saturating above a certain session size) wouldn't be captured; splines or a GAM would handle it, but the bucket descriptive data suggests the relationship is roughly linear in log space across the range I observed.

Observational, not experimental. I didn't randomly assign sessions to worktrees — workflow patterns did. ANCOVA controls for the one continuous confounder I measured (session length). It can't control for what I didn't measure. The conclusions should be read as "at a 30-day sample of my workload, location independently predicts cache drift after controlling for session length" — not as "worktrees *cause* cache drift." The mechanism section makes the causal claim plausible, but the formal inference is associational.

## Summary

Three one-liners for anyone doing similar analysis on their own Claude Code telemetry.

If you use Claude Code for sustained interactive development, long sessions drift toward 5-minute TTL by default. The 1-hour cache discount is not automatic — it's a function of how much stable preamble your SessionStart hooks emit.

If you use git worktrees for feature branches, the drift is ~39 percentage points worse than for main-checkout sessions of the same length, and the fix has to be at user level because the worktree doesn't inherit its parent repo's `.claude/settings.local.json`.

If you want to verify this on your own setup, the instrumentation is already on your laptop at `~/.claude/projects/*/<session>.jsonl`, field `message.usage.cache_creation.ephemeral_5m_input_tokens`. Thirty minutes, a Python script, and one ANCOVA tells you whether the same two-effect picture holds for your usage pattern. The whole analysis — data collection, model fitting, figure generation — took about two hours once I knew what to run. Your telemetry is already there.
