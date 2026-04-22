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

Parsed 30 days of my Claude Code JSONL transcripts. Two factors independently drive prompt-cache TTL drift: how long your session runs, and whether it runs inside a git worktree. Worktrees add roughly 39 percentage points of 5-minute-TTL cache share at any session size. Together these two effects explain half the variance across 110 sessions. Here's the data, the formal test, a short primer on Analysis of Covariance because it somehow didn't come up in my own stats training despite the PhD, and the single-layer fix that makes the whole thing go away.

## What I measured

Every Claude Code session writes a transcript to `~/.claude/projects/<slug>/<session-id>.jsonl`. Each assistant message's `usage` block contains a `cache_creation` field with two counters: `ephemeral_5m_input_tokens` (writes tagged with the 5-minute TTL) and `ephemeral_1h_input_tokens` (writes tagged with the 1-hour TTL). The 1-hour bucket costs 2× a 5-minute write, but at the 14× read-to-write ratio I see on interactive sessions, it amortizes to roughly 9× cheaper per sustained workload. Every percentage point of cache mass in the 5-minute bucket instead of the 1-hour one is a proportional chunk of that discount that's gone.

I aggregated every ScoutQL session over the 30-day window that had non-zero cache creation. 110 sessions total — 101 in the main checkout of the repo, 9 inside git worktrees of the same repo. For each session I recorded three things: how many events were in the session (proxy for length, from 4 to ~7000), whether the session was inside a worktree (nominal, Main vs Worktree), and the per-session 5-minute-TTL share as `e5 / (e5 + e1)` ∈ [0, 1].

## The question I was actually asking

The obvious hypothesis is that worktree sessions drift to 5-minute TTL because worktrees house longer sessions than main-checkout work does, and long sessions drift regardless of location. If that's the whole story, the worktree effect is a confound of session length and should disappear once you control for it. If it isn't the whole story — if worktrees drift more than equivalently-long main-checkout sessions — then worktrees are doing something independently bad, and that changes the fix.

Formally:

**H₀ (null hypothesis)**: After controlling for session length, there is no difference in 5-minute-TTL cache share between Main and Worktree sessions. The two regression lines of `share_5m ~ log₁₀(events)` have the same intercept.

**H₁ (alternative)**: The intercepts differ. Worktree sessions have a non-zero additive offset in 5-minute share that exists at every session length.

The research questions this test answers, in the order the analysis actually needs to resolve them:

1. Does session size matter at all? (If it doesn't, there's nothing to control for.)
2. Does worktree-vs-main matter *independently* of session size?
3. Is the worktree effect constant across session lengths (additive offset) or does it grow with session length (interaction)?
4. Is the extreme-cell pairwise difference large enough to matter, or a small-sample artifact?
5. Together, how much of the per-session variation do these two factors explain?

## A short primer on Analysis of Covariance

If you came out of a biology or medicine PhD the way I did, the statistical toolkit you got was probably: Student's t for two-group means, one-way ANOVA for three-or-more-group means, Tukey or Bonferroni for post-hoc comparisons, a chi-square somewhere for contingency tables, and the Kruskal-Wallis non-parametric version for when the Gaussian assumption collapsed. Maybe a two-way ANOVA if your thesis committee was generous. That was roughly my toolkit. Analysis of Covariance — ANCOVA — was not in it. I'd never heard the name until I needed it for this post.

ANCOVA keeps ANOVA's continuous response and categorical factor, but it also admits **continuous predictors** alongside the factor — *covariates*. The covariate's variance gets subtracted from the response *before* the categorical factor is tested. In our case: session length is continuous, it varies a lot, and worktrees may just host longer sessions. The way to ask "does location still matter after I've accounted for length?" is ANCOVA.

What ANCOVA fits is **one regression line per group** on the covariate. The test on the factor checks whether those lines share the same intercept. The test on the interaction checks whether they share the same slope. Different intercept, same slope = additive group effect, parallel lines. Different slope = the groups respond to the covariate differently. That intercept/slope language is exactly what the Results section uses. One precondition: you need enough overlap in the covariate's range across groups that length-effect and location-effect can be told apart. My data had it — barely, on the worktree side, but enough.

The other gift ANCOVA gives you over bucketed ANOVA is that it keeps the covariate continuous. If I'd bucketed session length into five ordinal bins (tiny / short / medium / long / xlong) and run a two-way ANOVA, I'd have discarded all the within-bucket variation — which is information ANCOVA uses for free. The post-hoc supporting two-way ANOVA I ran came out to the same qualitative conclusion but with weaker effect-size estimates, exactly because of this.

## Results

### Descriptive — cache share climbs with session size, worktrees sit uniformly higher

Mean per-session 5-minute-TTL share by size bucket and location, with standard-error error bars and per-cell n labels:

![Bucket means — cache share by session size and location, showing the worktree offset at every bucket](/images/blog/claude-code-cache-ttl-worktree-trap/fig2_bucket_means.png)

```
location   size_bucket        n   mean_5m    sd
Main       tiny (<10)        40     0.000  0.000
Main       short (10-49)     33     0.099  0.289
Main       medium (50-199)   13     0.347  0.377
Main       long (200-499)     7     0.536  0.462
Main       xlong (500+)       8     0.466  0.162
Worktree   tiny               4     0.250  0.500
Worktree   medium             1     1.000    n/a
Worktree   long               1     1.000    n/a
Worktree   xlong              3     0.974  0.045
```

Main-checkout tiny sessions are at zero percent 5-minute share — short sessions cache everything to the 1-hour bucket and read it back. As session size grows, the main-checkout curve climbs to about 47% at xlong (500+ events). Worktrees start at 25% in the tiny bucket and climb to 97% at xlong. The worktree curve is visually parallel to the main curve but offset upward by roughly 39-50 percentage points across the whole range. That's the parallel-lines shape ANCOVA tests formally.

### ANCOVA — the formal test

Fit `share_5m ~ log10(events) + C(location)` on all 110 sessions. This is the model that pulls the session-length effect into a continuous covariate and tests the location factor independently:

![ANCOVA parallel lines — Main vs Worktree regression lines with the +39 pp vertical offset annotated](/images/blog/claude-code-cache-ttl-worktree-trap/fig1_ancova_parallel_lines.png)

```
Response:   share_5m
Predictors: log10(events), continuous covariate
            location, 2-level nominal factor
n = 110

Effect          SS      df    F        p              partial η²
log10(events)   4.54    1     73.65    < 1×10⁻¹²      0.407
Location        1.22    1     19.75    2.2×10⁻⁵       0.156
Residual        6.60    107
R² = 0.503 (adjusted 0.493)
```

Both predictors are highly significant. The size effect is F(1, 107) = 73.65, p < 10⁻¹². The location effect is F(1, 107) = 19.75, p = 2.2×10⁻⁵. Together the model explains about half the variance in per-session 5-minute share (R² = 0.50).

The fitted coefficient on `Worktree` is +0.389. That's what the blue-to-red vertical distance in Figure 1 is showing: at any given session size, a worktree session sits about 39 percentage points higher in 5-minute-TTL share than a main-checkout session.

Running the interaction model `share_5m ~ log10(events) * C(location)` gives a non-significant interaction term (F = 1.66, p = 0.20). The two lines are statistically parallel — the worktree effect is a uniform additive offset across session length, not a shift that grows or shrinks with size. This is the cleanest version of the finding you can get: *one number, additive, at every session length*. I'd expected the worktree effect to grow with session size (longer session → more dynamic churn → more 5-minute writes); the data said no, it's the same ~39 pp whether your session is 10 events or 1000.

### xlong cell — the pairwise sanity check

The xlong bucket is where both populations are furthest from baseline. Pairwise Welch's t-test on Main xlong (n = 8) vs Worktree xlong (n = 3):

![xlong cell dot plot — individual sessions, Main cluster wide at 47 %, Worktree cluster tight at 97 %](/images/blog/claude-code-cache-ttl-worktree-trap/fig3_xlong_distributions.png)

Main xlong: mean 0.466, sd 0.162. Worktree xlong: mean 0.974, sd 0.045. Welch's t = −8.07, p < 0.0001, Cohen's d = 3.51. Mann-Whitney U non-parametric check gives p = 0.019 even with n = 3 on the worktree side.

The Cohen's d of 3.51 is absurd by conventional standards (the "large effect" threshold is 0.8). It's absurd because the worktree xlong cluster is *tight* — three sessions, all within 4.5 percentage points of 97%. The distance between means is about 0.5, and the pooled standard deviation is about 0.14, hence d ≈ 3.5. If worktree sessions were as variable as main sessions, d would be about 1.5 for the same mean difference — still "huge" but less eye-popping. The tight cluster is itself real information: the worktree trap produces a near-deterministic outcome rather than a stochastic one.

### Effect sizes — both predictors are "large" by Cohen's convention

![Effect-size bar chart — session size and location both exceed the 0.14 "large effect" threshold](/images/blog/claude-code-cache-ttl-worktree-trap/fig4_effect_sizes.png)

Partial η² for session size is 0.407, for location is 0.156. Cohen's conventions for partial η² in an ANOVA/ANCOVA are 0.01 (small), 0.06 (medium), and 0.14 (large). Both of our effects are above the large threshold — session size very large, location comfortably large. That's the effect-size picture that corresponds to the highly significant p-values.

### Robustness checks

Three worth naming.

First: the response is a proportion ∈ [0, 1], which technically violates OLS's Gaussian-residuals assumption. Re-running after an arcsine-square-root transform gives essentially identical F-statistics. Not an artifact of the distribution assumption.

Second, the worktree sample is small (n = 9) and unbalanced. The additive-model ANCOVA uses all 110 sessions across the continuous covariate, so it's less affected than the pairwise t-test. But the ~39 pp point estimate has a wider confidence interval than the single number suggests; replicating on a larger worktree sample would narrow it. Qualitative direction should hold.

Third, and most importantly: this is observational data. I didn't randomly assign sessions to worktrees. There could be unmeasured confounders I haven't modeled — task type, tool mix, time of day, mental state while coding. ANCOVA controls for the one continuous confounder I measured (session length). It can't control for what I didn't measure.

## What this means mechanistically

Claude Code tags stable prefix content of each model request (system prompt, tool schemas, CLAUDE.md, SessionStart hook stdout) with 1-hour TTL and the dynamic per-turn content with 5-minute TTL. The caching heuristic keys on prefix-hash stability — large stable preambles get big 1-hour anchors that amortize across every subsequent read; sessions without preamble see each turn's changing prefix written to 5-minute instead.

The main lever for the 1-hour anchor is SessionStart hooks. They're configurable emit-points that inject deterministic bash-script output into the session's system context. A hook that outputs 10 KB of backlog summary, lessons file, or architecture-doc slice adds 10 KB of stable prefix that lands in the 1-hour bucket and gets read back 14 times over the session.

Claude Code resolves project root via `git rev-parse --show-toplevel`. Git worktrees are their own top-level — each worktree has an independent working-tree root as far as git is concerned, even though its `.git` file points back at the parent repo's object database. So when Claude Code starts from `<repo>/.claude/worktrees/<name>/`, the project root it resolves to is the worktree directory. The `.claude/settings.json` it loads is the one at the worktree root — a minimal stub auto-propagated by `git worktree add`, usually containing a plugin toggle and nothing else. No hooks. The rich project-level config in the parent `<repo>/.claude/settings.local.json` is never consulted. CLAUDE.md discovery probably bifurcates the same way — the worktree's tracked CLAUDE.md bytes are there because git tracks them, but any `settings.local.json`-directed additional-context paths are not.

The ANCOVA's ~39 pp coefficient quantifies how much 1-hour-anchoring content the worktree is silently missing.

## The fix

User-level `~/.claude/settings.json` is the only Claude Code config layer loaded regardless of which project root the session resolves to. Moving the SessionStart hook chain there means every session — main checkout, worktree, nested sub-repo, arbitrary cwd — gets the same deterministic preamble anchored into the 1-hour bucket.

One gotcha on the migration. Claude Code merges hooks additively across user / project / project-local layers. Union, not override. If you add user-level hooks without stripping pre-existing project-level copies, each hook fires twice per session. I measured this in my own setup — doubled hooks added about $0.11 per session in redundant 1-hour writes, invisible unless you count `hook_success` records in the JSONL transcript. Strip the lower-layer duplicates after migration; keep user-level as the single authority.

For worktree sessions specifically, the user-level hooks pull the ~97 % xlong-worktree 5-minute share down toward whatever curve main-checkout sessions already sit on. For main-checkout sessions, they extend the 1-hour anchor beyond Claude Code's default preamble, pulling the xlong-main ~47 % share down toward near-zero.

## Limitations worth saying out loud

The worktree sample is small (n = 9 sessions, one project), and the analysis treats `log10(events)` as linear. On both counts: replicating on more projects and sessions would tighten the 39 pp estimate and surface any non-linearity (drift saturating at high session sizes, say) that the current model shape can't capture. My worktrees happen to host long feature-branch sessions; someone using worktrees for short-lived hotfix work might see a smaller effect because short sessions don't drift much regardless of location. The bucket descriptive in Figure 2 looks roughly linear in log space over the range I observed, but I can't claim that strongly from one dataset.

This is observational, not experimental. ANCOVA controls for the one continuous confounder I measured. It can't control for what I didn't measure. The conclusions should be read as "at a 30-day sample of my workload, location independently predicts cache drift after controlling for session length" — not as "worktrees *cause* cache drift." The mechanism section makes the causal claim plausible, but the formal inference is associational.

## What I learned along the way

Three things, aimed at anyone doing similar analysis on their own setup.

If you're parsing developer-tool telemetry and your aggregate number splits by some rollup key, decompose by the key before trusting the aggregate. My original framing had ScoutQL at 52 % 5-minute share and MetaOrchestrator at 33 %, and I wrote an entire first-draft blog post about the 19-point gap. The gap turned out to be a label-function artifact that was rolling worktree slugs under their parent project — the main-checkout number was actually 33.4 %, indistinguishable from the baseline. A four-line change to one Python function turned a fake 19-point anomaly into a real 39 pp one, in a different place.

If your "categorical" variable is actually a bucketing of a continuous one, ANCOVA beats bucketed ANOVA almost always. Bucketing discards within-bucket variance; ANCOVA uses it. The exception is when the relationship is genuinely non-linear in the covariate — and even then, log-transforming or splining the covariate beats bucketing.

If a statistical method exists for your data shape and you didn't learn it in your PhD, that's not unusual. ANOVA shows up in biology coursework because the classical experimental design — randomize subjects to discrete treatment groups — maps onto it directly. ANCOVA shows up in fields where the "treatment" is observational and the "treatment assignment" is correlated with other things you can measure, which is more of an economics or psychology problem than a classical biology one. It's a gap in the curriculum, not a limitation of the method. Good to know it exists for the next time the data has this shape.

The whole analysis — data collection, model fitting, figure generation — took about two hours once I knew what to run. The JSONL transcripts were already on my laptop. Your telemetry probably is too.
