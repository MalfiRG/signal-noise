# Blog Architecture Doc Deduplication — Design Spec

**Status:** Rev 2 — post-adversarial-review (2026-04-28). 1 BLOCKING + 6 HIGH + 16 MEDIUM + 10 LOW findings consolidated across 4 reviewers (2 spec + 2 plan) and applied. HARD SPEC — pre-implementation. Authoritative source of truth for the doc-deduplication migration until landed.
**Date:** 2026-04-28
**Owner:** Piotr Tarach (operator) + Claude Code (implementer)
**Repos:** `the-digital-matrix` (submodule, primary surgery) + MetaOrchestrator (outer, memory/* deletion)

**Rev 2 changes (vs Rev 1 commit `46acaea`):**
- Memory deletion scope expanded from 2 → **7 files** (adversarial review surfaced 5 untouched stale files; `project-owner.md` additionally violates the workspace-global [redacted-employer]-obfuscation rule).
- ARCHITECTURE.md inbound-reference count corrected from `~14` → **20** (across 5 files including `the-digital-matrix/CLAUDE.md`).
- DESIGN.md §Motion absorption strategy fixed: pointer to **existing** `### Subtle vs cyber stagger variants` subsection instead of creating a duplicate (would have violated the spec's own dedup goal).
- Spec line-patch wave moved from Wave 3 → **Wave 1** (per §3.2 "same/adjacent commit" timing rule; previous placement left 8-task window of broken inbound refs).
- Author-override deletion choice resolved: **keep first occurrence** (source-order convention; both copies are byte-identical so no content-distinguisher exists).
- §11.3 acceptance criteria expanded from 13 → 15 (added §-order check + ARCHITECTURE-section-count check at gate, not only task-end).
- Volatile line numbers replaced with grep anchors per `lessons/lesson-docs-drop-volatile-line-numbers-2026-04-16.md`.
- Word-delta math recomputed: `-870 to -1,370` (was incorrectly cited as `-1,000 to -1,500`).

---

## 1. Problem statement

The blog's architecture-tier docs have entered a **3-tier echo failure mode**: the same domain knowledge (visual identity, project structure, architecture decisions) lives in three places — a canonical doc, a "summary-for-context-budget" mirror, and a third restatement embedded in the agent-instructions doc. Each layer drifts independently. The duplication has rotted: two of the mirror files describe a different codebase entirely.

### Inventory (pre-migration, 2026-04-28)

| Doc | Lines | Words | Repo | Role |
|---|---|---|---|---|
| `the-digital-matrix/ARCHITECTURE.md` | 756 | 6,806 | inner | Canonical engineering architecture (13 sections; §12 has 28 implementation-note sub-sections) |
| `the-digital-matrix/DESIGN.md` | 369 | 2,760 | inner | Canonical visual/UX design system (11 sections) |
| `the-digital-matrix/CLAUDE.md` | 312 | 2,062 | inner | Agent instructions; restates stack, structure, routes, decisions, styling |
| `technical-blog/memory/architecture.md` | 129 | 644 | outer | Compressed mirror — describes `wouter`/`MatrixRain`/`LanguageProvider`/`client/src/` (none exist in current code) |
| `technical-blog/memory/content-pipeline.md` | 113 | ~640 | outer | Content-pipeline reference; uses DEPRECATED labeled-callout convention (`💡 Key Insight`) per workspace `TechnicalBlog/CLAUDE.md` "Callout Convention (Updated 2026-04-04)" |
| `technical-blog/memory/deployment.md` | 89 | ~480 | outer | Deployment reference; says Vite port 5173 (current: 8080), output `dist/public` (likely `dist/`), Docker+Nginx alt-deploy (not in current code), missing current env vars (`VITE_MOTION_OVERRIDE`, `VITE_VERCEL_ENV`) |
| `technical-blog/memory/design-system.md` | 92 | 518 | outer | Compressed mirror — describes green Matrix palette `#22b455` (replaced by Night City `#f3e600`) |
| `technical-blog/memory/portfolio-reference.md` | 109 | ~770 | outer | Documents original fork-source (dar-kow/Portfolio); references removed components (`MatrixRain`, `Wouter`, `shared/` structure) |
| `technical-blog/memory/project-owner.md` | 37 | ~260 | outer | Operator profile; **violates workspace-global [redacted-employer]-obfuscation rule** (line 4: "Role: QA Engineer at [redacted-employer]") in addition to being stale |
| `technical-blog/memory/tech-stack.md` | 52 | ~410 | outer | Tech-stack reference; says **Wouter 3.6.0** (current: React Router DOM 6), Vite 6 (current: Vite 7), `shared/components/ui/` (current: `src/components/ui/`), references Drizzle/Express/Passport (none in current code) |
| `the-digital-matrix/README.md` | 16 | 28 | inner | Tech-stack one-pager (overlaps `CLAUDE.md` "Tech Stack") |

**Total: ~14,400 words across 11 docs.** (Memory directory has all 7 `.md` files dated 2026-03-12, evidently from a single context-pipeline export. The 5 newly-discovered files were uncovered during adversarial plan review.)

### Confirmed duplication (cross-doc)

| Domain | Should be canonical in | Currently echoed in |
|---|---|---|
| Visual identity (palette, typography, motion, components) | `DESIGN.md` | `memory/design-system.md` (stale mirror) + `CLAUDE.md` "Visual Identity & Theme" + `CLAUDE.md` "Styling Rules" |
| Project structure | `ARCHITECTURE.md §2` | `memory/architecture.md` "Module Organization" + `CLAUDE.md` "Project Structure" |
| Routing | `ARCHITECTURE.md §3` | `CLAUDE.md` "Routes" |
| Architecture decisions | `ARCHITECTURE.md §10 + §12` | `memory/architecture.md` (stale mirror) + `CLAUDE.md` "Architecture Decisions" |
| Tech stack | `README.md` (target) | `CLAUDE.md` "Tech Stack" (verbatim) |
| Content pipeline | `ARCHITECTURE.md §4` | `CLAUDE.md` "Content Pipeline (Blog Posts)" |

### Confirmed self-duplication (intra-doc)

`CLAUDE.md` lines 286 + 296 contain the **"Author override — quick reference"** subsection twice, verbatim. Pure copy-paste artifact.

### Confirmed staleness (all 7 memory/* files describe a different codebase)

All 7 files in `technical-blog/memory/` were created on 2026-03-12 (same-day timestamps suggest a single context-pipeline export). All 7 share the same staleness pattern. **Verification: `grep -rE '(wouter|MatrixRain|LanguageProvider|BackgroundProvider|GA4 PageTracker)' the-digital-matrix/src/` returns 0 matches** (run 2026-04-28); none of the symbols enumerated below exist in current code.

**`memory/architecture.md` references that don't exist in current code:**
- `wouter` Switch (current: React Router DOM 6)
- `MatrixRain` component (removed in PR #27)
- `LanguageProvider` for pl/en (no language toggle exists)
- `BackgroundProvider` (does not exist)
- `client/src/` directory layout (current: flat `src/`)
- `features/articles/` (current: `features/blog/`)
- Routes `/articles`, `/references`, `/how-i-do-it/:page` (current: `/blog`, `/blog/:slug`, `/how-i-do-it`, `/how-i-do-it/:slug`)
- GitHub API integration for projects, seasonal mode detection, GA4 PageTracker (none exist)

**`memory/design-system.md` describes the OLD green palette:**
- `--matrix-primary: #22b455`, `--matrix-hover: #92e5a1` (current: Night City `#f3e600` primary + `#52e3c8` accent + `#f78a1a` learning)
- Light shadcn theme + system sans-serif body font (current: dark theme + Chakra Petch / Orbitron / Rajdhani / Share Tech Mono / Atkinson Hyperlegible)

**`memory/content-pipeline.md` uses DEPRECATED callout convention:**
- Lists `💡 Key Insight`, `🔥 Hot Take`, `⚙️ Tech Note` labeled callouts — explicitly DEPRECATED per `TechnicalBlog/CLAUDE.md` "Callout Convention (Updated 2026-04-04)" which mandates *"Do NOT use labeled callout boxes"*. Following this file's guidance would silently regress the post-2026-04-04 voice convention.

**`memory/deployment.md` describes wrong infrastructure:**
- Says `Vite dev server (localhost:5173)` (current: port 8080)
- Says output `dist/public` (current: likely `dist/` — verify via `cat the-digital-matrix/vercel.json` + `cat the-digital-matrix/vite.config.ts` at execution time)
- Includes Docker + Nginx alt-deploy setup (not in current code; current is Vercel-only)
- Missing current env vars `VITE_MOTION_OVERRIDE` + `VITE_VERCEL_ENV`

**`memory/tech-stack.md` describes the wrong stack:**
- `Wouter 3.6.0` (current: React Router DOM 6)
- `Vite 6.2.2` (current: Vite 7)
- `rehype-highlight 7.0.2` (current: `rehype-prism-plus`)
- References `shared/components/ui/` (current: `src/components/ui/`)
- Lists `Drizzle ORM`, `Express`, `Passport.js` as "available" (verify absence in current `package.json` at execution time)
- `@emailjs/browser` + `react-ga4` (verify via `grep -nE '(emailjs|react-ga4)' the-digital-matrix/package.json` at execution time)

**`memory/project-owner.md` violates workspace-global obfuscation rule:**
- Line 4: *"Role: QA Engineer at [redacted-employer]"* — directly violates `MetaOrchestrator/CLAUDE.md §2`: *"[redacted-employer] obfuscation: NO [redacted-employer] name in ANY output (global scrub rule, all sensitivity tiers)"*. Same axiom as `~/.claude/rules/audit-artifact-scrubbing.md` "Enforcer Artifacts" extension applies at the inventory surface — a checked-in artifact naming the prior employer is a leak whether the file is read by humans or agents.
- This file deletion has TWO independent justifications: (1) staleness (lists a published post that's no longer the only one; references skill levels superseded by current state), AND (2) obfuscation policy compliance. Either one alone justifies deletion.

**`memory/portfolio-reference.md` is a historical fork-source artifact:**
- Documents the ORIGINAL fork-source `dar-kow/Portfolio` repository
- Inventory of "inherited components" includes `MatrixRain` (REMOVED in PR #27), `Wouter` (REPLACED), `shared/` structure (REMOVED)
- "Portfolio Feature Inventory" table refers to features (`features/articles/`, `features/references/`, `features/how-i-do-it/`) that match the OLD codebase shape, not the current one
- Could be archived as a one-off retrospective doc, but is NOT architecture-tier and has nowhere to live in the post-migration documentation map

**Current code uses Night City** (yellow `#f3e600` primary + cyan `#52e3c8` accent + amber `#f78a1a` learning) on dark backgrounds. **Conclusion: every paragraph of every memory/* file contains false claims about the current codebase, OR violates an obfuscation rule.** Migrating any of this content into the canonical docs would inject incorrect/policy-violating claims. Action: delete all 7 files outright; no migration of any content (nothing is salvageable).

---

## 2. Goals and non-goals

### Goals

1. **Single source of truth per domain.** Each architecture-tier fact lives in exactly one canonical home. Other docs reference it via section pointers; they do not restate it.
2. **DESIGN.md follows the Google Stitch DESIGN.md spec format** (`https://github.com/google-labs-code/design.md`, version `alpha`). YAML front matter (machine-readable tokens) + markdown prose (human-readable rationale) + canonical 8-section ordering.
3. **Preserve all load-bearing rationale.** §12 Implementation Notes is the workspace-global WHY-host (per `~/.claude/rules/docs-over-code-comments.md`). Trim per-entry, with scenario-walks; do not bulk-strip.
4. **No regressions in cross-doc references.** ARCHITECTURE.md section numbering is frozen — `~14` references from spec/plan docs depend on it.
5. **Verifiable.** Stitch lint passes, ARCHITECTURE anchor diff is empty, adversarial agent audit on §12 has no blocking findings, word-count dedup proof produced.

### Non-goals

1. **No content synthesis or new architectural claims.** This is a structural refactor of existing facts, not a documentation rewrite. Facts not currently in the corpus stay out.
2. **No format migration tooling.** CSS-in-`index.css` remains the source of truth for design tokens. `npx @google/design.md export --format tailwind` is NOT introduced — would require build-step changes outside scope.
3. **No re-numbering of ARCHITECTURE.md sections.** Locked by inbound references.
4. **No editing of `Docs/superpowers/specs/` or `Docs/superpowers/plans/` content** beyond the 2 line-patches in `2026-04-24-device-tier-motion-policy-design.md` for renamed DESIGN.md sections.
5. **No edit to workspace-router `TechnicalBlog/CLAUDE.md`** — that's doc #7 covering the OUTER folder (blog + voice-to-blog skill + Notion). Different scope.
6. **No new `npx @google/design.md` CLI integration in the build pipeline.** Lint runs as a manual verification step; CI integration is a separate decision left to a follow-up.

---

## 3. Hard constraints

### 3.1 ARCHITECTURE.md numbering is frozen

**Verification (run 2026-04-28):**
```bash
grep -rEn "ARCHITECTURE\.md §[0-9]+" the-digital-matrix/ --include="*.md" \
  | grep -v "docs/superpowers/specs/2026-04-28-\|docs/superpowers/plans/2026-04-28-" \
  | sort -u | wc -l
```

Returns **20 inbound references across 5 files** (excluding this spec and its plan, which themselves enumerate the numbering as part of the migration framing rather than depending on it):

| File | Refs | Sections cited |
|---|---:|---|
| `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md` | 11 | §3, §7, §8, §9, §12 |
| `docs/superpowers/plans/2026-04-19-e2e-flakiness-remediation.md` | 7 | §9 |
| `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md` | 1 | §6 |
| `docs/superpowers/specs/2026-04-27-signal-noise-hero-port-design.md` | 1 | §12 |
| `the-digital-matrix/CLAUDE.md` | 1 | §12 (line 22) |

(Counts surfaced by the spec coverage adversarial review on 2026-04-28; the original draft of this spec said `~14` based on a stale earlier estimate — corrected here.)

All trimming MUST happen INSIDE these numbered sections. No section may be removed, renamed, or re-ordered. Any content removed from a numbered section MUST be either:
- migrated to a different section in the SAME numbered hierarchy (still inside §N for the same N), OR
- deleted entirely with a scenario-walk justification.

The CLAUDE.md self-reference at line 22 is also rewritten in Wave 3 (per §7.2), but must continue to cite `§12` correctly post-rewrite. The Wave 4 anchor diff catches any silent breakage.

### 3.2 DESIGN.md cross-references — exactly 2

**Verification (run 2026-04-28):**
```bash
grep -rn "DESIGN\.md §" the-digital-matrix/ --include="*.md" \
  | grep -v "docs/superpowers/specs/2026-04-28-\|docs/superpowers/plans/2026-04-28-"
```

Returns 2 hits, both in `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md`:
- One `DESIGN.md §1` reference (current section: "Visual Theme & Atmosphere"; post-Wave-1 section: "Overview")
- One `DESIGN.md §7` reference (current section: "Motion Design"; post-Wave-1 section: "Motion" extension)

**Line numbers are intentionally NOT cited** here per `lessons/lesson-docs-drop-volatile-line-numbers-2026-04-16.md` — line numbers in upstream specs drift on edits. At execution time, re-run the grep above to get current locations.

**Patch timing — patches MUST land in the same Wave as the DESIGN.md rename.** The patches were originally placed in Wave 3 (per §10.1), but the spec coverage review on 2026-04-28 surfaced that this leaves an 8-task window in which all intermediate commits have broken inbound references — bisecting any Wave-2 commit shows `DESIGN.md §1` referring to a section that no longer exists. **Resolution: patches move from Wave 3 to Wave 1, immediately after the rename commit.** See updated wave decomposition in §10.1.

### 3.3 CSS-as-SOT for design tokens

`src/index.css` `:root` HSL custom properties remain the source of truth for all design tokens. The DESIGN.md YAML front matter is a hand-maintained mirror, validated periodically with `npx @google/design.md lint DESIGN.md`. No build step generates the YAML; no build step generates the CSS from the YAML. Drift is acceptable risk because the linter catches the most common defects (broken token refs, contrast ratio < AA).

### 3.4 Workspace-global rule compliance

The migration MUST respect:
- `~/.claude/rules/docs-over-code-comments.md` — docs are the WHY layer; ARCHITECTURE.md §12 is the WHY-host.
- `~/.claude/rules/memory-injection-tiers.md` — trim with scenario-walks; bytes that don't change behavior are waste.
- `~/.claude/rules/factual-grounding-protocol.md` — verbatim quoting before paraphrasing; verify "already exists" claims with grep.
- `~/.claude/rules/submodule-cd-trap.md` — use `git -C the-digital-matrix ...`; never bare `cd` into the submodule.
- `~/.claude/rules/crlf-guard.md` — line-ending check before every commit on WSL2 + NTFS.
- `~/.claude/rules/audit-stray-branches-before-main-clean.md` — verify all branches against main before merging.

---

## 4. DESIGN.md target structure (Google Stitch spec)

### 4.1 Section ordering (mandated by spec)

| # | Section heading | Source | Action |
|---|---|---|---|
| – | YAML front matter | Synthesized from `:root` HSL values in `src/index.css` | NEW |
| 1 | **Overview** | Current §1 "Visual Theme & Atmosphere" | RENAME |
| 2 | **Colors** | Current §2 "Color Palette & Roles" | RESHAPE — token values move to YAML; semantic-role tables + usage rules stay as prose |
| 3 | **Typography** | Current §3 "Typography Rules" | RESHAPE — font properties move to YAML; hierarchy + rules stay as prose |
| 4 | **Layout** | Current §5 "Layout Principles" + §9 "Responsive Behavior" (folded in) | RESHAPE — spacing scale + breakpoint scale move to YAML; whitespace philosophy + grid + responsive collapse strategies stay as prose |
| 5 | **Elevation & Depth** | Current §6 "Depth & Elevation" | RENAME |
| 6 | **Shapes** | NEW (collected from `--radius: 0.25rem`, `rounded-md`, `rounded-full`, inline-code pill radius) | NEW |
| 7 | **Components** | Current §4 "Component Stylings" | RESHAPE — separate component-token entries (`button-primary`, `button-primary-hover`, `button-secondary`, `nav-link`, `card`, `theme-dot`, `tab-active`, `tab-active-learning`, `code-block`); Tailwind-class HTML snippets stay as prose annotation |
| 8 | **Do's and Don'ts** | Current §8 | KEEP |
| ext | **Motion** | Current §7 "Motion Design" | KEEP as out-of-spec extension (spec preserves unknown sections) |
| ext | **References** | Current §11 | KEEP as extension footer |

**Removed from DESIGN.md:**
- Current §9 "Responsive Behavior" → folded into §4 Layout (per user decision).
- Current §10 "Agent Prompt Guide" → migrated to `CLAUDE.md` (per user decision).

### 4.2 YAML front matter (initial values, mirrors `src/index.css`)

```yaml
---
version: alpha
name: Night City
description: >
  Cyberpunk-gold (Cyberpunk 2077 palette grammar) personal blog and portfolio
  for Piotr Tarach. Yellow primary + cyan accent + amber learning-state on
  near-black backgrounds. Mechanical, decisive, terminal-aesthetic — reads as
  "system boot sequence" rather than "polished SaaS".
colors:
  primary: "#f3e600"           # hsl(57 100% 48%) — yellow
  primary-foreground: "#0b0d12"
  accent: "#52e3c8"            # hsl(171 77% 60%) — cyan
  learning: "#f78a1a"          # hsl(25 95% 55%) — amber, in-progress only
  background: "#0b0d12"
  foreground: "#f5e9a3"
  card: "#11141a"
  secondary: "#1d2230"
  muted: "#1f2329"
  muted-foreground: "#7080a4"
  border: "#1d2436"
  destructive: "#ef4444"
  # Reading-mode descendant palette
  reading-background: "#dbd0c4"     # hsl(30 15% 88%)
  reading-foreground: "#2b2722"     # hsl(30 10% 15%)
  reading-primary: "#5c5246"        # hsl(30 20% 30%)
  reading-border: "#cbc5be"         # hsl(30 10% 78%)
  reading-learning: "#8e5e22"       # hsl(25 60% 35%)
typography:
  hero-h1:
    fontFamily: Orbitron
    fontSize: 4.5rem
    fontWeight: 900
    lineHeight: 1.1
  h2:
    fontFamily: Rajdhani
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.3
  h3:
    fontFamily: Rajdhani
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Chakra Petch
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  reading-body:
    fontFamily: Atkinson Hyperlegible
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  subhead:
    fontFamily: Chakra Petch
    fontSize: 0.875rem
    fontWeight: 400
    letterSpacing: 0.1em
  label-caps:
    fontFamily: Chakra Petch
    fontSize: 0.75rem
    fontWeight: 400
    letterSpacing: 0.3em
  code:
    fontFamily: Share Tech Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 4px            # --radius: 0.25rem (cards, buttons, default)
  full: 9999px       # theme-dot, social icons, hero orbs
spacing:
  base: 16px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  section-y-mobile: 48px       # py-12
  section-y-desktop: 64px      # py-16
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-secondary-hover:
    textColor: "{colors.foreground}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.sm}"
    padding: 24px
  nav-link:
    textColor: "{colors.foreground}"
  nav-link-active:
    textColor: "{colors.primary}"
  tab-active:
    textColor: "{colors.primary}"
  tab-active-learning:
    textColor: "{colors.learning}"
  code-block:
    backgroundColor: "#2d2d2d"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
---
```

**Adjustment policy:** the `description` summary derives from current `DESIGN.md §1` Identity/Mood/Density prose; if the lint warns about a token, the value comes from the corresponding HSL value in `src/index.css` (verbatim hex conversion, no semantic edits).

### 4.3 Validation

```bash
cd the-digital-matrix
npx @google/design.md lint DESIGN.md
```

Acceptable output: 0 errors. Warnings on:
- `missing-sections` for `spacing` if a default value is absent (acceptable).
- `orphaned-tokens` for color tokens not referenced by any component (acceptable — many tokens are body/nav/border level, not component-bound).
- `section-order` warning fires ONLY if extension sections (Motion, References) are inserted between canonical sections. Extensions MUST be placed AFTER §Do's and Don'ts to keep this warning from firing — design intent is **0 section-order warnings**, not "warnings are acceptable". If `section-order` warnings appear at lint time, the placement is wrong; fix before commit.

Errors that block:
- `broken-ref` (token reference doesn't resolve)
- Duplicate section heading
- Contrast-ratio errors on component foreground/background pairs (must pass WCAG AA 4.5:1)

---

## 5. ARCHITECTURE.md trim plan (numbering frozen)

### 5.1 Per-section disposition

| § | Section | Action | Word delta |
|---|---|---|---|
| 1 | System Overview | TRIM. Tech-stack table → 3-row architectural-essentials version + `→ README.md` pointer for full stack. | -200 |
| 2 | Directory Structure | KEEP verbatim. Canonical, not duplicated outside this doc. | 0 |
| 3 | Routing | KEEP verbatim. Already canonical. CLAUDE.md "Routes" gets stripped, replaced by `→ ARCHITECTURE.md §3` pointer. | 0 |
| 4 | Content Pipeline | KEEP verbatim. Canonical. CLAUDE.md "Content Pipeline (Blog Posts)" gets stripped, replaced by `→ ARCHITECTURE.md §4` pointer. | 0 |
| 5 | Styling Architecture | TRIM. Subsection "Theme tokens" (locate via `grep -n '^### Theme tokens' ARCHITECTURE.md`) → 3-line `→ DESIGN.md §Colors` pointer + 1-line "How `:root` HSL maps to Tailwind utilities". Keep "Layer order", "Reading mode", "next-themes role" — those are architectural, not visual-identity. | -250 |
| 6 | Motion Design System | TRIM. Keep "Two coexisting timing systems" + "JS variant exports" + "Variant-selection hooks" tables (architectural impl). **DO NOT create a new subsection in DESIGN.md §Motion** — the existing `### Subtle vs cyber stagger variants` subsection already absorbs the "Why two stagger hooks?" rationale (verified: see DESIGN.md §Motion subsection covering `staggerItem`/`staggerItemCyber` + mobile/reduced-motion fallbacks). Replace ARCHITECTURE.md's "Why two stagger hooks?" paragraph with a 1-line `→ DESIGN.md §Motion / Subtle vs cyber stagger variants` pointer. Add `→ DESIGN.md §Motion` pointer for easing-grammar semantics. | -150 |
| 7 | Hero Cascade Architecture | KEEP verbatim. State-machine impl detail, not duplicated. | 0 |
| 8 | Build & Deploy | KEEP verbatim. | 0 |
| 9 | Testing Architecture | KEEP verbatim. | 0 |
| 10 | Key Abstractions | KEEP verbatim. | 0 |
| 11 | Conventions & Rules | KEEP. CLAUDE.md "Git Conventions" + "Styling Rules" get stripped, replaced by `→ ARCHITECTURE.md §11` pointers. | 0 |
| 12 | Implementation Notes | PER-ENTRY classify (see §6 below). | -300 to -800 estimated |
| 13 | References | KEEP. Add 1-line entry pointing to this spec doc + the Stitch lint command. | +30 |

**Net target:** Per-section word delta sums to **-870 to -1,370** words (-200 + -250 + -150 + (-300 to -800) + +30). ARCHITECTURE.md drops from ~6,800 words to ~5,430-5,930 words depending on §12 scenario-walk outcomes. Section numbering unchanged.

### 5.2 Subsections that move to DESIGN.md (visual surface)

Three subsections from §12 are pure visual rationale and migrate to DESIGN.md (per per-entry classification result projected in §6 below):
- "Inline-code pill — language-class anchor" → `DESIGN.md §Components` (sub-component: `code-inline`)
- "Reading-mode code-block frame + background unification" → `DESIGN.md §Components` (sub-component: `code-block` reading-mode override)
- "IdStrip mobile balance" → `DESIGN.md §Layout` (responsive collapse strategy for IdStrip, sits next to other responsive content)

Each migration carries the original WHY-narrative verbatim into the destination doc. Code-anchor pointers (file/symbol references) are preserved.

---

## 6. §12 Implementation Notes — per-entry classification framework

§12 currently has 28 sub-sections (~3,200 words). Per-entry classify into KEEP / MIGRATE / CUT, with scenario-walks per `~/.claude/rules/memory-injection-tiers.md`.

### 6.1 Classification rule

For each sub-section, ask three questions in order:

1. **Is the rationale code-anchored to a specific bug, regression test, or test spec?** → If yes, KEEP. (Examples: "Visual determinism fixture", "Hero cascade — replay-skip persistence", "A11y essentials — landmark and inert hygiene".)
2. **Is the rationale purely about visual surface (no architectural pattern, no test guard)?** → If yes, MIGRATE to DESIGN.md.
3. **Is the rationale a stable invariant already obvious from code identifiers + types + tests?** → If yes, run scenario-walk. If scenario-walk produces same answer with the entry CUT, CUT.

### 6.2 Scenario-walk discipline (per `memory-injection-tiers.md`)

For each CUT or MIGRATE candidate:
1. Construct ≥1 concrete scenario where an agent reads the trimmed §12 and tries to make a decision the original entry was protecting.
2. Compare the agent's decision to the decision they would have made reading the original entry.
3. If decisions match → cut/migrate is safe. If decisions diverge → KEEP the entry.

For high-confidence cuts (≥40% reduction): construct ≥3 scenarios, dispatch a fresh agent to A/B test the trimmed version.

### 6.3 Projected classification (subject to per-entry scenario-walk during implementation)

| # | Sub-section | Classification (projected) | Rationale (projected) |
|---|---|---|---|
| 12.1 | Two-tier route transition system | KEEP | Code-anchored (`PageTransition.tsx`, `BlogLayout.tsx`); double-render flash bug; AnimatePresence keying contract. |
| 12.2 | Manual scroll restoration | KEEP | Code-anchored (`useScrollRestoration.ts`); mobile tab-eviction bug; 500ms-delay invariant. |
| 12.3 | Markdown renderer — Mermaid theming | KEEP | Code-anchored (`useMermaidTheme()`); SSR-branch dead-code rationale. |
| 12.4 | Reading-mode CSS — `!important` usage | KEEP | Three-case allowlist (Mermaid SVG / Prism token override / hardcoded reading-mode); a regression that re-introduces `!important` outside this list would lose the discipline. |
| 12.5 | CategoryTree auto-collapse | KEEP | Code-anchored (`getIsExpanded()`); tag-filter UX invariant. |
| 12.6 | BlogLayout `max-w-6xl` content width | **CUT candidate** | Tailwind class is self-documenting; the 680px prose constraint lives in CSS as `.markdown-body > p, .markdown-body > h2, ...` rules. Scenario: agent decides whether to widen blog post container — original entry says "wider canvas + narrower prose"; trimmed version + reading the CSS rule directly → same answer. **Scenario-walk required during implementation.** |
| 12.7 | Frontmatter parser — supported subset | **CUT candidate** | TypeScript types in `src/lib/frontmatter.ts` document the supported subset; the "switch to a YAML library if complexity grows" advice is a one-line rule that survives in the file's JSDoc. Scenario: agent encounters multi-line string in frontmatter — trimmed §12 + reading the parser source → same conclusion (unsupported). **Scenario-walk required.** |
| 12.8 | Scroll restoration vs hero skip — different sessionStorage keys | KEEP | Cross-cutting concern (two unrelated features sharing API surface); the "different keys, both clear on tab close" invariant is not derivable from individual code reads. |
| 12.9 | CSS source order — unlayered beats layered | KEEP | Architectural pattern (the same axiom appears in `~/.claude/rules/verify-framework-defaults.md` ESLint flat config note); load-bearing for code-block selection-color overrides. |
| 12.10 | Why we keep `next-themes` despite single-theme | **CUT candidate** | Already partially covered in §5 "Styling Architecture" `next-themes` role subsection. Possible duplication-with-self. Scenario: agent considers removing `ThemeProvider` — §5 alone provides enough rationale (FOUC prevention via inline script, future-theme wiring). **Scenario-walk required; if §5 carries the full WHY, cut from §12.** |
| 12.11 | Sonner toast theme — hardcoded "dark" | KEEP | Anti-bug (silent fallback to white toast on dark UI); without this entry, an agent removing the hardcoded `"dark"` to "fix" the type error would regress production. |
| 12.12 | Hero glitch entrance — `data-text` requirement | KEEP | Silent-failure invariant (animation runs, overlay layers blank); not derivable from code without reading the CSS pseudo-element rules. |
| 12.13 | Mobile orb override scope | **MIGRATE candidate** | Pure visual rationale (orbs sit closer to eye on mobile, breathe less actively). Belongs in `DESIGN.md §Elevation & Depth` or `§Motion` extension. **Scenario-walk required.** |
| 12.14 | Motion override precedence (control plane) | KEEP | Three-layer config evaluation order; spec-tied (`docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md §4`). |
| 12.15 | Hero cascade — replay-skip persistence, focus management, inert semantics | KEEP | Multi-bug rationale (Wave 3 B5/F-UX-05, axe-DevTools serious WCAG, react-router-dom Link contract); test-anchored. |
| 12.16 | Visual determinism fixture (Playwright) | KEEP | Test-spec-anchored (`docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md`); double-rAF + `addInitScript` patterns. |
| 12.17 | Hero skip-on-return + badge testing strategy | KEEP | Spec-walkthrough; section-tied (§5.6, §5.7, §5.9 of motion-tier spec). |
| 12.18 | Hero focus management testing | KEEP | Wave 3 F-CONS-06 anchor; accessible-name-matching contract. |
| 12.19 | A11y essentials — landmark and inert hygiene | KEEP | Three WCAG contracts; Brave DevTools anchor. |
| 12.20 | Blog tile geometric regression testing | KEEP | jsdom-vs-Playwright rationale; two specific bugs (`flex-wrap` missing, `inline-flex` no-wrap); selector-scope rationale. |
| 12.21 | Motion policy composition — cross-consumer coherence test scope | KEEP | Test-anchored (`src/test/motion-policy-composition.test.tsx`); spec §5.3 mandate. |
| 12.22 | Device-tier boundary test scope | KEEP | Off-by-one boundary semantics; iPad rotation case anchored to spec §1. |
| 12.23 | Hero asymmetric stagger — gated negative margins | KEEP | Three-tier viewport gating; specific bug (BREAK clipping at phone-landscape). |
| 12.24 | Reading-mode code-block frame + background unification | **MIGRATE** | Pure visual surface (frame border tone, bg-color match between wrapper and `<pre>`/`<code>`). Belongs in DESIGN.md §Components (code-block sub-component reading-mode override). Regression-history-3-times anchor preserved in destination. |
| 12.25 | Inline-code pill — language-class anchor | **MIGRATE** | Pure visual surface (pill border, padding, radius, language-class anchor). Belongs in DESIGN.md §Components (code-inline sub-component). Test-anchor preserved in destination. |
| 12.26 | Inline-code overflow guard — defensive containment | KEEP | Architectural defensive-containment pattern (`overflow-x: hidden` on `.markdown-body` is defensive, not cosmetic); test fixture anchor. |
| 12.27 | SCROLL TO EXPLORE arrow — outer-div scroll-fade pattern | KEEP | Architectural pattern (Framer Motion inline-style precedence vs CSS class); same-shape parallel to `inert` boolean prop split and `data-cta-wrap` flex split — three converging instances of one axiom. **Candidate for graduation per `pattern-graduation` skill in a follow-up**, but stays in §12 for now. |
| 12.28 | IdStrip mobile balance | **MIGRATE** | Pure visual responsive rationale (font-size 10→8px, gap 18→6px, etc.). Belongs in DESIGN.md §Layout (responsive section after fold). |

**Projected counts (28 entries total):**

- **Definite KEEP: 21 entries** — 12.1, 12.2, 12.3, 12.4, 12.5, 12.8, 12.9, 12.11, 12.12, 12.14-12.23, 12.26, 12.27.
- **Definite MIGRATE: 3 entries** — 12.24 (reading-mode code-block frame + bg unification → DESIGN.md §Components), 12.25 (inline-code pill → DESIGN.md §Components), 12.28 (IdStrip mobile balance → DESIGN.md §Layout).
- **CUT candidates pending scenario-walk: 3 entries** — 12.6 (max-w-6xl content width), 12.7 (frontmatter parser scope), 12.10 (next-themes single-theme keep). Each may resolve to KEEP if the scenario-walk surfaces a behavior-changing scenario.
- **MIGRATE candidate pending scenario-walk: 1 entry** — 12.13 (Mobile orb override scope) — purely visual rationale; may resolve to MIGRATE (DESIGN.md §Elevation & Depth or §Motion ext) or KEEP if the rationale crosses architectural surface during scenario-walk.

**Final outcome ranges:** KEEP between 21 and 25, MIGRATE between 3 and 4, CUT between 0 and 3, depending on per-entry scenario-walk results during implementation.

### 6.4 Adversarial agent audit

After per-entry classification + scenario-walks complete, spawn a fresh `general-purpose` agent with an explicit adversarial-review brief. (`reviewer-consistency` is the wrong fit because its remit is internal-coherence/AI-slop scanning across documents — the §12 audit needs adversarial scenario construction, which is `general-purpose` territory.) Provide the agent with:

- The original §12 (verbatim, all 28 entries)
- The trimmed §12
- The migration target sections in DESIGN.md
- The scenario-walk doc (one row per cut/migrate)

The brief must include the **provenance invariant** from `~/.claude/rules/subagent-output-ownership.md`: the agent reading the trimmed §12 has not authored it; the agent's verify-phase reads of any output produced by the spawning session count as "verified my own output", not "pre-existing file".

Agent task: for each CUT or MIGRATED entry, construct an adversarial scenario where the trimmed version produces a different answer from the original. Findings classified as:

- **Blocking** — the trimmed version produces a behavior-changing wrong answer (e.g., agent re-introduces `aria-hidden` instead of `inert` because the rationale was trimmed).
- **Advisory** — the trimmed version is less informative but doesn't change behavior.
- **No-finding** — the trimmed version produces the same answer as the original.

Block the merge on any **Blocking** finding: either re-apply via curator (re-introducing the entry as KEEP) OR rolled back to the original entry if the trim was structurally wrong. Advisory findings are recorded in the spec's open questions but don't block.

---

## 7. CLAUDE.md slim plan

### 7.1 Target

312 lines → ~100 lines (~67% reduction). Strict agent-instructions doc only. Operator-runtime concerns + lazy-load routing manifest + ambiguity-resolution rule.

### 7.2 KEEP (≤100 lines total)

- **Project Overview** (3 lines) — pitch + repo URL + hosting line.
- **Authoritative documents (lazy-load when relevant)** — EXPAND into the routing manifest (the most important section). One-line pointer per doc with section anchors:
  ```
  - **`DESIGN.md`** — visual identity (Google Stitch spec). Read for ANY UI/styling work.
    Sections: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes,
    Components, Do's and Don'ts, Motion (extension), References (extension).
  - **`ARCHITECTURE.md`** — engineering architecture (13 sections).
    §2 Directory Structure, §3 Routing, §4 Content Pipeline, §5 Styling Architecture,
    §6 Motion Design System, §7 Hero Cascade, §8 Build & Deploy, §9 Testing,
    §10 Key Abstractions, §11 Conventions & Rules, §12 Implementation Notes (the WHY-host).
  - **`README.md`** — project pitch, tech stack (canonical here), quick start, doc map.
  ```
- **Resolving ambiguity** rule — load-bearing per `docs-over-code-comments.md` consumer-side. Verbatim from current CLAUDE.md.
- **Git Conventions** → 1 line: `→ ARCHITECTURE.md §11; never include Co-Authored-By lines in commits.`
- **Environment Variables** table — KEEP. Operator-runtime; not duplicated.
- **Author override — quick reference** — KEEP ONCE. Move full version to ARCHITECTURE.md §12 motion-override subsection (already there). CLAUDE.md keeps a 5-line operator quick-ref pointing back.
- **Known Considerations** — KEEP. (`--legacy-peer-deps`, port 8080, Polish slugify.)
- **Agent Prompt Guide** (NEW; migrated from DESIGN.md §10) — quick palette reference + 3 ready-to-use prompts (component generation, page entrance, ambient effects).

### 7.3 STRIP (replace with pointers)

- Tech Stack → `→ README.md`.
- Quick Start → `→ README.md`.
- Project Structure → `→ ARCHITECTURE.md §2`.
- Path Aliases → fold into "Known Considerations" as 1 line.
- Routes → `→ ARCHITECTURE.md §3`.
- Architecture Decisions → `→ ARCHITECTURE.md §10 + §12`.
- Content Pipeline (Blog Posts) → `→ ARCHITECTURE.md §4`.
- Blog Post Format → `→ ARCHITECTURE.md §11` "Content (blog posts)" subsection.
- Development Conventions → `→ ARCHITECTURE.md §11`.
- Styling Rules (sub of Dev Conventions) → `→ DESIGN.md`.
- Key Files → `→ ARCHITECTURE.md §10`.
- The duplicated "Author override" subsection: **KEEP the FIRST occurrence (currently at line ~286), DELETE the SECOND (currently at line ~296)**. Both headers are byte-identical (`### Author override — quick reference`), so the choice is by source-order convention (keep-first), not by content. See §12.6 for the decision record. Re-locate at execution time via `grep -n 'Author override — quick reference' the-digital-matrix/CLAUDE.md` (line numbers may have drifted).

---

## 8. README.md expand plan

### 8.1 Target

16 lines (28 words) → ~60-90 lines. The repo's actual entry point.

### 8.2 New structure

```markdown
# The Digital Matrix

Personal technical blog and portfolio for **Piotr Tarach**, QA engineer based in
Prague. Voice-first content pipeline + React SPA with cyberpunk-gold (Night City)
visual identity. Reading-mode toggle for blog posts.

**Hosting:** Vercel (auto-deploys from `main`).
**Repo:** https://github.com/MalfiRG/the-digital-matrix

## Tech Stack

| Layer        | Technology                          | Notes                                          |
|--------------|--------------------------------------|------------------------------------------------|
| Framework    | React 18 + TypeScript 5.8           | Path alias `@/` → `src/`                       |
| Bundler      | Vite 7 + `@vitejs/plugin-react-swc` | SWC for fast transforms                        |
| Routing      | React Router DOM 6                  | `BrowserRouter` + `Routes`/`Route`             |
| State        | React Query (TanStack)              | For async state where needed (minimal usage)   |
| Animations   | Framer Motion 12                    | Page transitions, staggered lists              |
| Markdown     | react-markdown + rehype/remark      | GFM, Prism syntax, Mermaid, TOC, slug-from-id  |
| Icons        | Lucide React                         | UI iconography                                 |
| UI Components| shadcn/ui (Radix primitives)        | Sheets, dropdowns, tabs                        |
| Styling      | Tailwind CSS 3 + CSS custom properties | All colors via `:root` tokens                  |
| Theme        | next-themes (single theme: cyberpunk-gold) | `attribute="class"` on `<html>`        |
| Deployment   | Vercel (auto from `main`)           | Includes Analytics + Speed Insights            |

## Quick Start

```bash
npm install --legacy-peer-deps   # Radix UI peer dep conflicts require this
npm run dev                       # Dev server on http://localhost:8080
npm run build                     # Production build → dist/
npm run preview                   # Serve dist/ locally
npm run lint
npm run test
```

**WSL2 caveat:** Vite HMR over NTFS cross-mounts is unreliable. Hard-restart vite
after any file change. See `.claude/rules/hard-reload-dev-servers.md` for the
canonical command pattern.

## Documentation Map

| Doc | Role |
|---|---|
| `DESIGN.md` | Visual identity (Google Stitch spec format) — palette, typography, motion, components, do's/don'ts. Read for ANY UI/styling work. |
| `ARCHITECTURE.md` | Engineering architecture — routing, content pipeline, motion system internals, hero cascade state machine, testing layers, implementation notes (the WHY-host per workspace-global rule). |
| `CLAUDE.md` | Agent instructions — authoritative-doc routing manifest, ambiguity-resolution rule, env vars, known gotchas. |
| `docs/superpowers/specs/` | Pre-implementation design specs (HARD SPEC tier). |
| `docs/superpowers/plans/` | Implementation plans (TDD-style, per-task). |
| `e2e/` | Playwright suite — smoke / functional / visual tiers (see `ARCHITECTURE.md §9`). |

## License

(existing license footer)
```

---

## 9. memory/* deletion (outer repo)

### 9.1 Files (all 7)

The original spec listed only 2 files for deletion (`architecture.md`, `design-system.md`). The plan-adversarial review on 2026-04-28 surfaced that `memory/` actually contains 7 .md files, all dated 2026-03-12 (single context-pipeline export). Spot-reading the additional 5 confirmed the staleness pattern + an obfuscation-rule violation. Updated deletion scope:

| File | Lines | Justification |
|---|---:|---|
| `technical-blog/memory/architecture.md` | 129 | Describes a different codebase (wouter / MatrixRain / LanguageProvider — none in current code) |
| `technical-blog/memory/content-pipeline.md` | 113 | Uses DEPRECATED labeled-callout convention (`💡 Key Insight`, `🔥 Hot Take`, `⚙️ Tech Note`) per `TechnicalBlog/CLAUDE.md` "Callout Convention (Updated 2026-04-04)" — following it would silently regress voice |
| `technical-blog/memory/deployment.md` | 89 | Vite port 5173 (current: 8080), `dist/public` output, Docker+Nginx alt-deploy not in code, missing current env vars |
| `technical-blog/memory/design-system.md` | 92 | OLD green Matrix palette (`#22b455`); replaced by Night City |
| `technical-blog/memory/portfolio-reference.md` | 109 | Documents original fork-source `dar-kow/Portfolio`; references removed components |
| `technical-blog/memory/project-owner.md` | 37 | **Violates [redacted-employer]-obfuscation rule** (`TechnicalBlog/CLAUDE.md §2`) at line 4 PLUS is stale; either justification alone supports deletion |
| `technical-blog/memory/tech-stack.md` | 52 | Wouter / Vite 6 / `shared/` structure (none in current code); `Drizzle ORM` / `Express` / `Passport.js` / `@emailjs/browser` / `react-ga4` (verify absence at execution time) |

### 9.2 Pre-deletion verification (re-run on day-of)

```bash
# A. Zero inbound references to the file paths
grep -rn "memory/\(architecture\|content-pipeline\|deployment\|design-system\|portfolio-reference\|project-owner\|tech-stack\)" \
  /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/ \
  --include="*.md" --include="*.json" --include="*.yml" --include="*.yaml" \
  --include="*.ts" --include="*.tsx" --include="*.js"
# Expected: empty

# B. Zero references to symbols defined ONLY in the memory/* files
grep -rE '(wouter|MatrixRain|LanguageProvider|BackgroundProvider|GA4 PageTracker)' \
  /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/the-digital-matrix/src/
# Expected: empty (already verified 2026-04-28)

# C. Confirm memory/ has only these 7 files
ls /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/memory/
# Expected: architecture.md content-pipeline.md deployment.md design-system.md portfolio-reference.md project-owner.md tech-stack.md
# If MORE files than these 7 exist, STOP — spec inventory is incomplete; audit the extras before deletion.
```

### 9.3 Action

Delete all 7 files outright via `git rm`. NO migration of unique content (every paragraph either contains false claims about the current codebase OR violates the [redacted-employer]-obfuscation rule; nothing salvageable).

### 9.4 Cleanup

After all 7 deletions, the `memory/` directory should be empty (no other files were enumerated). Remove the empty directory:

```bash
ls -la /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/memory/
# Expected: only . and .. — directory is empty
rmdir /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/memory/
```

If extra files appeared (someone added new memory/* between spec write and execution), STOP and re-audit each new file against the spec staleness criteria before deleting the directory.

---

## 10. Wave plan and ordering

### 10.1 Submodule PR (`the-digital-matrix`)

```
Wave 1 (parallel — no inter-dependencies):
  ├─ DESIGN.md spec migration:
  │   - Synthesize YAML front matter from src/index.css
  │   - Rename §1 "Visual Theme & Atmosphere" → §1 "Overview"
  │   - Rename §2 "Color Palette & Roles" → §2 "Colors"
  │   - Rename §3 "Typography Rules" → §3 "Typography"
  │   - Rename §5 "Layout Principles" → §4 "Layout" (reorder + fold §9 Responsive)
  │   - Rename §6 "Depth & Elevation" → §5 "Elevation & Depth"
  │   - Add NEW §6 "Shapes" (collect rounded scale)
  │   - Rename §4 "Component Stylings" → §7 "Components" (separate component-token entries)
  │   - Keep §8 "Do's and Don'ts" position
  │   - Move §10 "Agent Prompt Guide" → CLAUDE.md (Wave 3 deletes it from DESIGN.md)
  │   - Fold §9 "Responsive Behavior" into §4 Layout (no content loss; spec §4.1)
  │   - Keep §7 "Motion Design" content → rename heading to ext "## Motion" (preserves the existing
  │     `### Subtle vs cyber stagger variants` subsection, which is the canonical destination for
  │     ARCHITECTURE.md §6 "Why two stagger hooks?" pointer in Wave 2 — DO NOT create a duplicate
  │     subsection in DESIGN.md §Motion)
  │   - Keep §11 "References" → ext "## References"
  │   - Run npx @google/design.md lint DESIGN.md → 0 errors
  │
  ├─ README.md expansion (project pitch + tech stack canonical home + quick start + doc map)
  │
  └─ Patch 2 line-references in 2026-04-24-device-tier-motion-policy-design.md
     (MUST land in same Wave as DESIGN.md rename per §3.2 "same commit or strict adjacent commit"
     timing rule — moved from Wave 3 here to avoid an 8-task window of broken inbound refs):
      - Re-grep at execution time: `grep -n 'DESIGN\.md §' docs/superpowers/specs/2026-04-24-...md`
      - Patch "DESIGN.md §1" → "DESIGN.md §Overview"
      - Patch "DESIGN.md §7" → "DESIGN.md §Motion"

Wave 2 (depends on Wave 1):
  ├─ ARCHITECTURE.md trim:
  │   - §1 tech-stack table → 3-row architectural-essentials + → README.md pointer
  │   - §5 theme-tokens subsection → 3-line → DESIGN.md §Colors pointer
  │   - §6 "Why two stagger hooks?" rationale → 1-line `→ DESIGN.md §Motion / Subtle vs cyber
  │     stagger variants` pointer (DO NOT create new subsection in DESIGN.md §Motion — the
  │     existing one already covers this rationale; see spec §5.1 §6 row)
  │   - §6 add `→ DESIGN.md §Motion` pointer for easing-grammar semantics
  │   - §12 per-entry classify with scenario-walks. **Outcome ranges per §6.3:**
  │     Definite KEEP=21, Definite MIGRATE=3 (12.24, 12.25, 12.28), CUT-candidates pending=3
  │     (12.6, 12.7, 12.10), MIGRATE-candidate pending=1 (12.13). Final post-walk:
  │     KEEP between 21-25, MIGRATE between 3-4, CUT between 0-3.
  │   - §12 definite MIGRATEs (12.24, 12.25, 12.28) carry verbatim WHY into DESIGN.md
  │   - §13 add 1-line entry pointing to this spec doc + Stitch lint command

Wave 3 (depends on Wave 2):
  └─ CLAUDE.md slim:
      - Strip Tech Stack, Project Structure, Architecture Decisions, Content Pipeline,
        Blog Post Format, Development Conventions, Styling Rules, Key Files
      - Replace each with → <doc> §<n> pointers
      - Eliminate the duplicated "Author override" subsection (keep the FIRST occurrence;
        delete the SECOND — see §7.3 + §12.6)
      - Insert Agent Prompt Guide migrated from DESIGN.md §10
      - Expand "Authoritative documents (lazy-load)" into the full routing manifest

Wave 4 (verification gate — must pass before merge):
  ├─ npx @google/design.md lint DESIGN.md → 0 errors
  ├─ ARCHITECTURE.md anchor diff: identical pre/post (re-run grep, diff)
  ├─ Adversarial agent pass on §12: no blocking findings
  ├─ Word-count dedup proof: produced and inspected
  ├─ CRLF guard: no flipped line endings
  └─ Audit-stray-branches: confirm no unmerged sibling branches that would resurrect content
```

### 10.2 Outer repo PR (after submodule merges)

```
Wave 5 (one commit):
  ├─ Delete all 7 files in technical-blog/memory/ via `git rm`:
  │   architecture.md, content-pipeline.md, deployment.md, design-system.md,
  │   portfolio-reference.md, project-owner.md, tech-stack.md
  ├─ Remove technical-blog/memory/ directory (now empty)
  └─ Bump technical-blog/the-digital-matrix submodule pointer to merged Wave 1-4 commit SHA
```

---

## 11. Verification protocol

### 11.1 Pre-flight (before any edit)

```bash
# A. Stash baseline word counts (all 11 docs in scope)
cd /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog
wc -w the-digital-matrix/DESIGN.md the-digital-matrix/ARCHITECTURE.md \
  the-digital-matrix/CLAUDE.md the-digital-matrix/README.md \
  memory/*.md > /tmp/blog-doc-baseline.txt

# B. Capture pre-Wave-2 SHA (Task 13 adversarial audit references this)
git -C the-digital-matrix rev-parse HEAD > /tmp/pre-wave2-sha.txt

# C. Stash ARCHITECTURE.md anchor list
grep -rEn "ARCHITECTURE\.md §[0-9]+" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/arch-refs-before.txt

# D. Stash DESIGN.md anchor list
grep -rEn "DESIGN\.md §" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/design-refs-before.txt

# E. Confirm zero memory/* references for ALL 7 files (re-verify)
grep -rn "memory/\(architecture\|content-pipeline\|deployment\|design-system\|portfolio-reference\|project-owner\|tech-stack\)" \
  /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/ \
  --include="*.md" --include="*.json" --include="*.yml" --include="*.yaml" \
  --include="*.ts" --include="*.tsx" --include="*.js"
# Expected: empty
```

### 11.2 Post-edit verification (Wave 4)

```bash
# A. Stitch lint
cd the-digital-matrix
npx @google/design.md lint DESIGN.md
# Expected: 0 errors

# B. ARCHITECTURE anchor stability
grep -rEn "ARCHITECTURE\.md §[0-9]+" . --include="*.md" \
  | sort -u > /tmp/arch-refs-after.txt
diff /tmp/arch-refs-before.txt /tmp/arch-refs-after.txt
# Expected: identical (no §-numbered references invalidated)

# C. DESIGN.md anchor patches + new pointers verified
grep -rEn "DESIGN\.md §" . --include="*.md" \
  | sort -u > /tmp/design-refs-after.txt
diff /tmp/design-refs-before.txt /tmp/design-refs-after.txt
# Expected diff:
#   - 2 lines MODIFIED in motion-policy spec (§1 → §Overview, §7 → §Motion)
#   - ≥2 lines ADDED in ARCHITECTURE.md (`→ DESIGN.md §Colors` from §5 trim,
#     `→ DESIGN.md §Motion` from §6 trim, possibly `→ DESIGN.md §Components` /
#     `→ DESIGN.md §Layout` from §12 migrations)
#   - 0 lines REMOVED (the original 2 references in motion-policy spec are
#     edits, not deletions, so they shift from numeric to named anchor)
# Pass criterion: every diff line is one of the above three categories. Any
# OTHER diff (e.g., a §-anchored ref appearing/disappearing in an unrelated
# spec/plan) is unexpected — investigate before declaring this gate passed.

# D. Word-count dedup proof
echo "=== Before ==="
cat /tmp/blog-doc-baseline.txt
echo "=== After ==="
wc -w DESIGN.md ARCHITECTURE.md CLAUDE.md README.md
echo "=== memory/* (should be deleted in outer PR) ==="
ls -la ../memory/ 2>/dev/null || echo "memory/ directory removed"

# E. CRLF guard
for f in DESIGN.md ARCHITECTURE.md CLAUDE.md README.md; do
  committed=$(git show HEAD:"$f" 2>/dev/null | head -1 | cat -A | grep -c '\^M\$')
  working=$(head -1 "$f" | cat -A | grep -c '\^M\$')
  if [ "$committed" != "$working" ]; then
    echo "LINE ENDING MISMATCH: $f"
  fi
done
# Expected: silent (no mismatches)

# F. Adversarial agent pass on §12 (manual dispatch)
# Spawn general-purpose agent with the §12 trim doc, original §12, scenario-walks.
# Block merge on any "behavior-changing" finding.
```

### 11.3 Acceptance criteria

The migration is **done** when ALL of the following hold:

1. `npx @google/design.md lint DESIGN.md` exits 0 with 0 errors.
2. `diff /tmp/arch-refs-before.txt /tmp/arch-refs-after.txt` is empty.
3. DESIGN.md has YAML front matter conforming to Google Stitch alpha schema with `version: alpha`, `name: Night City`, ≥1 `colors` token, ≥1 `typography` token, ≥1 `components` entry.
4. DESIGN.md sections appear in canonical order: Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts → (extensions: Motion, References).
5. ARCHITECTURE.md retains all 13 numbered sections with original numbering.
6. CLAUDE.md is ≤120 lines (target ~100).
7. README.md is ≥50 lines and contains the canonical Tech Stack table.
8. **All 7 files in `technical-blog/memory/`** are deleted in the outer PR (architecture, content-pipeline, deployment, design-system, portfolio-reference, project-owner, tech-stack), and the now-empty `memory/` directory is removed.
9. `2026-04-24-device-tier-motion-policy-design.md` `DESIGN.md §1` and `§7` references patched to `§Overview` and `§Motion` (re-locate at execution time via grep — line numbers drift).
10. Adversarial agent pass on §12: no blocking findings, OR all findings addressed.
11. Word-count dedup proof shows: (a) net ≥1,200 word reduction across the inner-repo corpus (sum of DESIGN.md + ARCHITECTURE.md + CLAUDE.md + README.md, post-migration vs pre-migration); (b) ARCHITECTURE.md and CLAUDE.md each shrink (negative delta); (c) DESIGN.md and README.md may grow (positive delta is expected — DESIGN absorbs 3 firm migrations + 0-1 conditional (12.13 pending scenario-walk) + YAML front matter; README absorbs the canonical Tech Stack table + doc map). Outer-repo deletion of all 7 `memory/*.md` files removes an additional ~3,000 words but is counted separately because it's a different PR.
12. No flipped line endings (CRLF guard passes — checked via blob-level comparison per `~/.claude/rules/crlf-guard.md`).
13. No stray branches with unmerged content that would resurrect deleted material (audit BOTH local AND remote branches per `~/.claude/rules/audit-stray-branches-before-main-clean.md`).
14. DESIGN.md `## ` heading order matches the spec §4.1 canonical sequence — re-verified at gate, not just at task-end.
15. ARCHITECTURE.md `^## [0-9]+\.` count = 13 — re-verified at gate.

---

## 12. Risks and open questions

### 12.1 Risk: §12 trim removes load-bearing rationale

**Mitigation:** scenario-walk per cut/migrate; adversarial agent audit. Rollback plan: re-add the entry from git history if the audit finds a behavior-changing scenario.

### 12.2 Risk: DESIGN.md YAML drifts from CSS over time

**Mitigation:** `npx @google/design.md lint DESIGN.md` runs as a manual verification step (and in a follow-up could be wired into CI). The lint catches broken token refs and contrast-ratio errors. Drift between CSS HSL values and YAML hex values is detectable by a simple grep cross-check (`hsl(57 100% 48%)` ↔ `#f3e600`) — a spot-check entry in the verification protocol catches it.

### 12.3 Risk: section renames in DESIGN.md break references I didn't grep

**Mitigation:** the grep covered all `.md` files in `the-digital-matrix/`. If a JS/TS file references `DESIGN.md §1` (extremely unlikely), it would fail post-rename. Run a final wide grep before merge:

```bash
grep -rn "DESIGN\.md §\|DESIGN\.md#" the-digital-matrix/ \
  --include="*" 2>/dev/null | grep -v node_modules
```

### 12.4 Open question: should `npx @google/design.md lint` run in CI?

**Deferred.** Adds a ~5s CI step. Value: catches DESIGN.md drift on PR. Cost: another CI dependency. Decide in a follow-up PR after the migration lands and the format proves itself in practice.

### 12.5 Open question: should the `pattern-graduation` skill graduate the "split CSS+framer concerns onto separate elements" pattern from §12.27 + the SCROLL TO EXPLORE entry + the `inert` boolean prop split + `data-cta-wrap` split?

**Deferred.** Three converging instances of one axiom (Framer Motion inline-style precedence vs CSS class) is a pattern-graduation candidate per `~/.claude/rules/memory-injection-tiers.md` "Graph edges" section. Out of scope for this dedup pass. Open as a follow-up.

### 12.6 Open question: CLAUDE.md "Author override" — keep in CLAUDE.md OR move full version to ARCHITECTURE.md §12?

**Decided in this spec:** ARCHITECTURE.md §12 holds the canonical control-plane explanation (already there); CLAUDE.md keeps a 5-line operator quick-ref pointing back. **Keep the FIRST occurrence of the duplicated `### Author override — quick reference` subsection in CLAUDE.md; delete the SECOND.** Both headers and bodies are byte-identical (verified: `diff <(sed -n '286,294p' CLAUDE.md) <(sed -n '296,304p' CLAUDE.md)` returns empty), so the rationale is "keep-first" by source-order convention, NOT by header text or content (which don't distinguish). Line numbers will drift; re-locate at execution time via `grep -n 'Author override — quick reference' the-digital-matrix/CLAUDE.md`.

---

## 13. Out of scope

1. **Workspace `TechnicalBlog/CLAUDE.md`** — doc #7 (8.5 KB), workspace router for the OUTER blog folder. Different scope.
2. **`Docs/test-plans/motion-tier-audit-2026-04-24.md`** — implementation artifact, not architecture-tier doc.
3. **Skill files at `TechnicalBlog/skills/voice-to-blog/`** — content-pipeline skill, not architecture.
4. **Build-step tooling** (`npx @google/design.md export --format tailwind` integration into Vite/PostCSS pipeline) — separate decision.
5. **CI integration of `npx @google/design.md lint`** — open question §12.4.
6. **Pattern graduation of the Framer-vs-CSS split axiom** — open question §12.5.
7. **`docs/superpowers/specs/*.md` and `docs/superpowers/plans/*.md` content edits** beyond the 2 line-patches in `2026-04-24-device-tier-motion-policy-design.md`.

---

## 14. References

- **Google Stitch DESIGN.md spec:** https://github.com/google-labs-code/design.md (version `alpha`)
- **Google Stitch announcement:** https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/
- **Workspace global rules consulted:**
  - `~/.claude/rules/docs-over-code-comments.md` (single-source-of-truth + WHY-host pattern)
  - `~/.claude/rules/memory-injection-tiers.md` (scenario-walk before commit; tier discipline)
  - `~/.claude/rules/factual-grounding-protocol.md` (verbatim quoting; verify "already exists" claims)
  - `~/.claude/rules/submodule-cd-trap.md` (submodule git-C discipline)
  - `~/.claude/rules/crlf-guard.md` (line-ending check on WSL2 + NTFS)
  - `~/.claude/rules/audit-stray-branches-before-main-clean.md` (pre-merge branch hygiene)
  - `~/.claude/rules/verify-effective-state.md` (verify what production reads, not source)
- **Inbound references audited:**
  - `docs/superpowers/specs/2026-04-19-e2e-flakiness-remediation-design.md`
  - `docs/superpowers/plans/2026-04-19-e2e-flakiness-remediation.md`
  - `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md`
  - `docs/superpowers/specs/2026-04-27-signal-noise-hero-port-design.md`
- **Related session:** doc-fix-blog session, 2026-04-28
