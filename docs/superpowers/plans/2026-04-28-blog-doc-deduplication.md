# Blog Architecture Doc Deduplication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the blog's 6 architecture-tier docs to a single-source-of-truth architecture with role-based ownership, with DESIGN.md conforming to the Google Stitch DESIGN.md spec (alpha).

**Architecture:** 5-wave plan across 2 repos. Waves 1-4 run in the `the-digital-matrix` submodule; Wave 5 in the outer MetaOrchestrator repo (delete + submodule-bump). Wave 1 (DESIGN.md + README.md) parallel-safe. Wave 2 (ARCHITECTURE.md) depends on Wave 1 target sections existing. Wave 3 (CLAUDE.md + spec line-patches) depends on Wave 2 stable. Wave 4 verification gate. Wave 5 separable.

**Tech Stack:** Markdown files (no code build), `npx @google/design.md` CLI for DESIGN.md spec validation, git via `git -C` for submodule discipline, grep/wc for verification.

**Spec:** `docs/superpowers/specs/2026-04-28-blog-doc-deduplication-design.md` (commit `46acaea`)

---

## File Structure

### Files modified (inner repo `the-digital-matrix/`)

| File | Change | Net delta |
|---|---|---|
| `DESIGN.md` | Spec migration: YAML front matter + 8 canonical sections + 2 extensions | +200 to +400 words (absorbs migrated §12 entries) |
| `ARCHITECTURE.md` | In-section trim (numbering frozen): §1, §5, §6, §12, §13 | -800 to -1,500 words |
| `CLAUDE.md` | Slim: strip duplicated content, add routing manifest + Agent Prompt Guide | -1,000 to -1,300 words |
| `README.md` | Expand: project pitch + Tech Stack table + Quick Start + Doc Map | +250 to +400 words |
| `docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md` | 2-line patch for renamed DESIGN.md sections | ~0 |

### Files deleted (outer repo `MetaOrchestrator/TechnicalBlog/`)

| File | Reason |
|---|---|
| `technical-blog/memory/architecture.md` | Stale — describes a different codebase (wouter/MatrixRain/green palette) |
| `technical-blog/memory/design-system.md` | Stale — describes the OLD green Matrix palette |

### Repo discipline

- All submodule git ops via `git -C the-digital-matrix ...` (per `~/.claude/rules/submodule-cd-trap.md`)
- CRLF guard before every commit (per `~/.claude/rules/crlf-guard.md`)
- Stage by name, never `git add -A` (per workspace global rule)
- Conventional commit prefix: `docs(<scope>): <description>` (per recent commits in submodule)
- No `Co-Authored-By` lines (per workspace global rule)

---

## Pre-flight (run once before Wave 1)

- [ ] **Step 1: Stash baseline word counts**

```bash
cd /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog
mkdir -p /tmp/blog-doc-dedup
wc -w the-digital-matrix/DESIGN.md the-digital-matrix/ARCHITECTURE.md \
  the-digital-matrix/CLAUDE.md the-digital-matrix/README.md \
  memory/architecture.md memory/design-system.md \
  > /tmp/blog-doc-dedup/baseline.txt
cat /tmp/blog-doc-dedup/baseline.txt
```

Expected output (approximate, verify exact numbers):
```
   2760 the-digital-matrix/DESIGN.md
   6806 the-digital-matrix/ARCHITECTURE.md
   2062 the-digital-matrix/CLAUDE.md
     28 the-digital-matrix/README.md
    644 memory/architecture.md
    518 memory/design-system.md
  12818 total
```

- [ ] **Step 2: Stash ARCHITECTURE.md anchor list**

```bash
grep -rEn "ARCHITECTURE\.md §[0-9]+" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/blog-doc-dedup/arch-refs-before.txt
wc -l /tmp/blog-doc-dedup/arch-refs-before.txt
```

Expected: ~14-20 lines (one per anchor reference instance).

- [ ] **Step 3: Stash DESIGN.md anchor list**

```bash
grep -rEn "DESIGN\.md §" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/blog-doc-dedup/design-refs-before.txt
cat /tmp/blog-doc-dedup/design-refs-before.txt
```

Expected: 2 lines, both in `2026-04-24-device-tier-motion-policy-design.md` (lines 92 and 392).

- [ ] **Step 4: Confirm zero memory/* references (final verification)**

```bash
grep -rn "memory/architecture\|memory/design-system" \
  /mnt/c/Users/malfi/programming_projects/MetaOrchestrator/TechnicalBlog/ \
  --include="*.md" --include="*.json" --include="*.yml" --include="*.yaml" \
  --include="*.ts" --include="*.tsx" --include="*.js"
```

Expected: empty output. If anything appears, STOP and update spec accordingly.

- [ ] **Step 5: Confirm submodule git state is clean enough**

```bash
git -C the-digital-matrix status --porcelain
```

Expected: only `M index.html` and possibly your in-flight spec/plan files. If unrelated dirty state, ask user before proceeding.

- [ ] **Step 6: Confirm `npx @google/design.md` CLI is available**

```bash
npx @google/design.md spec --format markdown 2>&1 | head -5
```

Expected: prints the spec preamble. If "command not found" or install prompt — accept the install (it'll auto-install). If anything else fails, STOP and ask user.

---

## Wave 1: DESIGN.md spec migration + README.md expansion (parallel-safe)

### Task 1: Add YAML front matter to DESIGN.md

**Files:**
- Modify: `the-digital-matrix/DESIGN.md` (insert YAML block at top, before existing content)
- Read for token sourcing: `the-digital-matrix/src/index.css` (`:root` block)

**Steps:**

- [ ] **Step 1: Read `src/index.css` `:root` block to extract HSL token values**

```bash
grep -nE "^\s*--[a-z-]+:" the-digital-matrix/src/index.css | head -30
```

Expected: prints HSL custom property declarations. Verify the spec's YAML mirror values match these.

- [ ] **Step 2: Read DESIGN.md current top to find insertion point**

```bash
head -10 the-digital-matrix/DESIGN.md
```

Confirm the file starts with `# DESIGN.md — The Digital Matrix` and a blockquote line. The YAML front matter goes BEFORE the `# DESIGN.md` H1.

- [ ] **Step 3: Insert YAML front matter at the very top of DESIGN.md**

The YAML must be the first content in the file, delimited by `---` fences:

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
  primary: "#f3e600"
  primary-foreground: "#0b0d12"
  accent: "#52e3c8"
  learning: "#f78a1a"
  background: "#0b0d12"
  foreground: "#f5e9a3"
  card: "#11141a"
  secondary: "#1d2230"
  muted: "#1f2329"
  muted-foreground: "#7080a4"
  border: "#1d2436"
  destructive: "#ef4444"
  reading-background: "#dbd0c4"
  reading-foreground: "#2b2722"
  reading-primary: "#5c5246"
  reading-border: "#cbc5be"
  reading-learning: "#8e5e22"
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
  sm: 4px
  full: 9999px
spacing:
  base: 16px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  section-y-mobile: 48px
  section-y-desktop: 64px
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

Use the `Edit` tool with `old_string` = first line of current DESIGN.md (`# DESIGN.md — The Digital Matrix`), `new_string` = the YAML block above + a blank line + `# DESIGN.md — The Digital Matrix`.

- [ ] **Step 4: Verify YAML parses by running Stitch lint**

```bash
cd the-digital-matrix
npx @google/design.md lint DESIGN.md 2>&1 | head -30
```

Expected: lint output shows findings table. May report errors about section ordering (because we haven't reordered yet) — those are EXPECTED at this stage and will resolve after Task 2. The YAML block ITSELF should NOT throw a parse error.

If a YAML parse error appears: re-check the indentation (spec uses 2-space) and quoting (hex values must be quoted strings).

- [ ] **Step 5: CRLF guard**

```bash
head -1 the-digital-matrix/DESIGN.md | cat -A | grep -c '\^M\$' || true
```

Expected: `0` (no CRLF — file is LF). If `1`: run `sed -i 's/\r$//' the-digital-matrix/DESIGN.md`.

- [ ] **Step 6: Commit**

```bash
git -C the-digital-matrix add DESIGN.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(design): add YAML front matter to DESIGN.md per Google Stitch spec

Synthesizes machine-readable design tokens (colors, typography, rounded,
spacing, components) from src/index.css :root HSL values. Mirrors the CSS
SOT — CSS remains authoritative; YAML is hand-maintained for agent
consumption and Stitch lint validation.

Section reordering follows in next commit (Task 2).
EOF
)"
```

---

### Task 2: Rename + reorder DESIGN.md sections (Stitch canonical order)

**Files:**
- Modify: `the-digital-matrix/DESIGN.md` (rename §1, §2, §3, §5, §6 in place; reorder so Layout precedes Elevation; add NEW §6 Shapes; fold §9 Responsive into §4 Layout; remove §10 Agent Prompt Guide content — destination is CLAUDE.md in Wave 3)

**Steps:**

- [ ] **Step 1: Read current DESIGN.md section structure**

```bash
grep -nE "^## " the-digital-matrix/DESIGN.md
```

Expected:
```
## 1. Visual Theme & Atmosphere
## 2. Color Palette & Roles
## 3. Typography Rules
## 4. Component Stylings
## 5. Layout Principles
## 6. Depth & Elevation
## 7. Motion Design
## 8. Do's and Don'ts
## 9. Responsive Behavior
## 10. Agent Prompt Guide
## 11. References
```

- [ ] **Step 2: Rename §1 "Visual Theme & Atmosphere" → "Overview"**

Use Edit:
- `old_string`: `## 1. Visual Theme & Atmosphere`
- `new_string`: `## Overview`

The numbering is dropped because Stitch canonical sections use unnumbered `##` headings.

- [ ] **Step 3: Rename §2 "Color Palette & Roles" → "Colors"**

Use Edit:
- `old_string`: `## 2. Color Palette & Roles`
- `new_string`: `## Colors`

- [ ] **Step 4: Rename §3 "Typography Rules" → "Typography"**

Use Edit:
- `old_string`: `## 3. Typography Rules`
- `new_string`: `## Typography`

- [ ] **Step 5: Reorder — move §5 Layout Principles BEFORE §4 Component Stylings, rename to "Layout"**

This is a multi-step move. Do it in two phases:
  a. Read the full content of `## 5. Layout Principles` (line 174 to start of `## 6. Depth & Elevation`).
  b. Read the full content of `## 9. Responsive Behavior` (line 298 to start of `## 10. Agent Prompt Guide`).
  c. Use Edit to DELETE both `## 5. Layout Principles` block and `## 9. Responsive Behavior` block.
  d. Use Edit to INSERT a single combined `## Layout` block AFTER `## Typography` and BEFORE `## 4. Component Stylings`.

The combined `## Layout` content has these subsections (in order):
1. (intro paragraph) — "Layout combines spacing scale, grid system, whitespace philosophy, z-index hierarchy, and responsive collapse strategies."
2. `### Spacing scale (Tailwind)` — from §5
3. `### Grid system` — from §5
4. `### Whitespace philosophy` — from §5
5. `### Z-index hierarchy` — from §5
6. `### Breakpoints (Tailwind defaults)` — from §9
7. `### Mobile-first overrides` — from §9
8. `### Touch targets` — from §9
9. `### Collapse strategies` — from §9

Preserve all original content verbatim. Only the surrounding section structure changes.

- [ ] **Step 6: Rename §6 "Depth & Elevation" → "Elevation & Depth"**

Use Edit:
- `old_string`: `## 6. Depth & Elevation`
- `new_string`: `## Elevation & Depth`

- [ ] **Step 7: Add NEW `## Shapes` section AFTER `## Elevation & Depth`**

Insert after the `## Elevation & Depth` block ends (i.e., before `## 4. Component Stylings`):

```markdown
## Shapes

The shape language is sharp — `--radius: 0.25rem` (4px) on cards and buttons. Pill / circular forms (`rounded-full`) are reserved for the corner-button pattern (theme dot, social icons) and the hero glow orbs.

| Token       | Value    | Used for                                              |
|-------------|----------|-------------------------------------------------------|
| `rounded.sm`  | 4px      | Cards, buttons, code-block wrappers, inline-code pill (in reading mode) |
| `rounded.full`| 9999px   | Theme dot / social icons (44×44 touch target), hero orbs (visual blur) |

**Rule:** sharp corners are intentional — they support the "cyberdeck UI" identity. Do not introduce intermediate radii (`rounded-md = 6px`, `rounded-lg = 8px`) without a brand-fit justification. The two-tier scale (sm + full) is the full vocabulary.

```

- [ ] **Step 8: Rename §4 "Component Stylings" → "Components"**

Use Edit:
- `old_string`: `## 4. Component Stylings`
- `new_string`: `## Components`

(Internal restructuring of this section to Stitch component-token entries happens in Task 3.)

- [ ] **Step 9: Rename §7 "Motion Design" → "Motion"**

This section stays as an out-of-spec extension, placed AFTER `## Do's and Don'ts`.

Use Edit:
- `old_string`: `## 7. Motion Design`
- `new_string`: `## Motion`

- [ ] **Step 10: Move §10 "Agent Prompt Guide" content out of DESIGN.md (parking)**

This content migrates to CLAUDE.md in Wave 3. To avoid losing it during this commit, copy it to a scratch file first:

```bash
sed -n '/^## 10\. Agent Prompt Guide/,/^## 11\. References/p' the-digital-matrix/DESIGN.md \
  | head -n -1 > /tmp/blog-doc-dedup/agent-prompt-guide-park.md
wc -l /tmp/blog-doc-dedup/agent-prompt-guide-park.md
```

Expected: ~25-30 lines of content saved.

Then DELETE the `## 10. Agent Prompt Guide` block from DESIGN.md (use Edit with `old_string` = the full section content, `new_string` = empty string).

- [ ] **Step 11: Drop the §9 "Responsive Behavior" original section**

Already done in Step 5 (folded into §Layout). Confirm via:

```bash
grep -nE "^## " the-digital-matrix/DESIGN.md
```

Expected output (in this exact order):
```
## Overview
## Colors
## Typography
## Layout
## Elevation & Depth
## Shapes
## Components
## 8. Do's and Don'ts
## Motion
## 11. References
```

- [ ] **Step 12: Rename §8 "Do's and Don'ts" — drop the number**

Use Edit:
- `old_string`: `## 8. Do's and Don'ts`
- `new_string`: `## Do's and Don'ts`

- [ ] **Step 13: Rename §11 "References" — drop the number**

Use Edit:
- `old_string`: `## 11. References`
- `new_string`: `## References`

- [ ] **Step 14: Final structure verification**

```bash
grep -nE "^## " the-digital-matrix/DESIGN.md
```

Expected (Stitch canonical order + 2 extensions):
```
## Overview
## Colors
## Typography
## Layout
## Elevation & Depth
## Shapes
## Components
## Do's and Don'ts
## Motion
## References
```

- [ ] **Step 15: Run Stitch lint to catch section-order issues**

```bash
cd the-digital-matrix
npx @google/design.md lint DESIGN.md 2>&1 | head -40
```

Expected: 0 errors. Warnings allowed:
- `section-order` warnings on `Motion` and `References` (out-of-spec extensions placed after canonical sections — acceptable per spec §4.3).
- `orphaned-tokens` warnings on color tokens not bound to components (acceptable — many tokens are body/border level).

If `broken-ref` or duplicate-section errors: STOP. Fix and re-lint.

- [ ] **Step 16: CRLF guard + commit**

```bash
head -1 the-digital-matrix/DESIGN.md | cat -A | grep -c '\^M\$' || true
# Expected: 0

git -C the-digital-matrix add DESIGN.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(design): rename + reorder sections per Google Stitch spec

Canonical order: Overview → Colors → Typography → Layout → Elevation & Depth
→ Shapes → Components → Do's and Don'ts (+ extensions: Motion, References).

Folded §9 Responsive Behavior into §Layout (single Stitch-canonical section
covers grid + spacing + responsive). Removed §10 Agent Prompt Guide content
(parked at /tmp/blog-doc-dedup/agent-prompt-guide-park.md; destination is
CLAUDE.md in Wave 3). Added NEW §Shapes section collecting the rounded scale.

Component-token restructure (separate button-primary / button-primary-hover
entries) follows in next commit (Task 3).
EOF
)"
```

---

### Task 3: Restructure DESIGN.md §Components into Stitch component-token entries

**Files:**
- Modify: `the-digital-matrix/DESIGN.md` (§Components section content)

**Steps:**

- [ ] **Step 1: Read the current §Components section**

```bash
sed -n '/^## Components/,/^## /p' the-digital-matrix/DESIGN.md | head -100
```

This currently has subsections: Buttons (primary/secondary CTA), Nav links, Cards, Theme dot/social icon, Tabs, Code blocks. The Tailwind class snippets are operationally useful for agents and should be PRESERVED as prose annotation, NOT replaced.

- [ ] **Step 2: Restructure each subsection to follow the Stitch component-entry convention**

Each component gets:
- `### <component-name>` heading (matches the YAML key, e.g., `### button-primary`)
- 1-paragraph prose describing its role in the design system
- The Tailwind class block (preserved verbatim)
- Variant subsections (`### button-primary-hover`, etc.) — separate entries per spec §4.1

Use Edit to transform the existing subsections. Example transformation:

BEFORE:
```markdown
### Buttons

Two variants on the home page hero:

**Primary CTA** (`VIEW PROJECTS` style):
```html
border border-primary/50 bg-primary/10 px-8 py-3 text-sm tracking-widest
text-primary hover:bg-primary/20 hover:border-primary
transition-all box-glow btn-interactive glitch-hover
```
- Outline button with primary-tinted fill (10% opacity)
- Yellow border at 50% opacity, brightens on hover
- `box-glow` adds yellow glow via `--matrix-glow` var
- `btn-interactive` adds 1px lift + glow on hover, instant settle on active
- `glitch-hover` adds the chromatic aberration text-glitch on hover (data-text attribute required)
```

AFTER:
```markdown
### button-primary

The primary CTA — outline button with primary-tinted fill (10% opacity), yellow border at 50% opacity that brightens on hover. Used for the home-page `VIEW PROJECTS` style and any "this is the action you came here for" surface.

```html
border border-primary/50 bg-primary/10 px-8 py-3 text-sm tracking-widest
text-primary hover:bg-primary/20 hover:border-primary
transition-all box-glow btn-interactive glitch-hover
```

- `box-glow` adds yellow glow via `--matrix-glow` var
- `btn-interactive` adds 1px lift + glow on hover, instant settle on active
- `glitch-hover` adds the chromatic aberration text-glitch on hover; **`data-text` attribute required** on every element using `glitch-hover` (the `::before` / `::after` pseudo-elements read `content: attr(data-text)`)

### button-primary-hover

State variant — fill brightens to primary/20, border to primary/100.

### button-secondary

Subtle outline, no fill. Used for the `READ BLOG` style — secondary actions that share visual hierarchy with primary but defer to it.

```html
border border-border px-8 py-3 text-sm tracking-widest
text-muted-foreground hover:border-primary/50 hover:text-foreground
transition-all btn-interactive glitch-hover
```

- Muted text on rest, brightens to foreground on hover
- Border picks up primary tint on hover

### button-secondary-hover

Border tints to primary/50; text brightens from muted-foreground to foreground.
```

Repeat the pattern for: `nav-link`, `nav-link-active`, `card`, `theme-dot` (the corner-button pattern), `tab-active`, `tab-active-learning`, `code-block`.

The exact restructured text should match the YAML `components` map keys from Task 1's front matter — use the SAME names (e.g., `button-primary` not `Primary CTA Button`). Mismatch between YAML keys and prose `### <name>` headings will surface as Stitch lint warnings.

- [ ] **Step 3: Verify component count matches YAML**

```bash
# Components in markdown
grep -cE "^### [a-z-]+$" <(sed -n '/^## Components/,/^## /p' the-digital-matrix/DESIGN.md) || true

# Components in YAML
grep -cE "^  [a-z-]+:" <(sed -n '/^components:/,/^---/p' the-digital-matrix/DESIGN.md) || true
```

These two numbers should be equal (one `###` heading per top-level component-entry in the YAML map). Variants like `button-primary-hover` count as separate entries on both sides.

Expected count: ~10 (button-primary, button-primary-hover, button-secondary, button-secondary-hover, card, nav-link, nav-link-active, tab-active, tab-active-learning, code-block — and theme-dot if you add it to the YAML).

- [ ] **Step 4: Run Stitch lint**

```bash
cd the-digital-matrix
npx @google/design.md lint DESIGN.md 2>&1
```

Expected: 0 errors. The `contrast-ratio` rule will flag any component foreground/background pair below WCAG AA 4.5:1; if a component fails, recheck the hex values in the YAML against `src/index.css` HSL.

- [ ] **Step 5: Commit**

```bash
git -C the-digital-matrix add DESIGN.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(design): restructure §Components to Stitch component-token entries

Each component gets a separate ### entry matching its YAML key. Variants
(hover, active) are separate entries per Stitch spec §4.1. Tailwind class
snippets preserved as prose annotation — they're operationally useful and
the spec allows arbitrary prose around component entries.

Component-entry markdown headings now align 1:1 with the YAML components
map: ### button-primary ↔ components.button-primary etc. Mismatch would
surface as a Stitch lint warning.
EOF
)"
```

---

### Task 4: Run Stitch lint, capture pass-state, commit verification proof

**Files:**
- Modify: `the-digital-matrix/DESIGN.md` (only if lint surfaces fixable issues)
- Create: `/tmp/blog-doc-dedup/stitch-lint-output.txt` (verification artifact, not committed)

**Steps:**

- [ ] **Step 1: Run full Stitch lint**

```bash
cd the-digital-matrix
npx @google/design.md lint DESIGN.md 2>&1 | tee /tmp/blog-doc-dedup/stitch-lint-output.txt
```

- [ ] **Step 2: Inspect findings**

Acceptable findings:
- `section-order [warning]` for `Motion` and `References` (out-of-spec extensions placed after canonical §Do's and Don'ts — design intent per spec).
- `orphaned-tokens [warning]` for any color tokens not used by any component (background, foreground, muted, border are body-level tokens, expected to be orphaned at the components-map level).
- `missing-sections [info]` if `spacing.base` is read as the canonical default (already provided).
- `token-summary [info]` (always informational).

Blocking findings (must be fixed):
- `broken-ref [error]` — token reference doesn't resolve (e.g., `{colors.foo}` where `foo` isn't defined).
- Duplicate section heading (Stitch error).
- `contrast-ratio [warning]` if it triggers on a component pair we explicitly require to pass AA.

- [ ] **Step 3: If broken-ref errors, identify and fix**

```bash
grep "broken-ref" /tmp/blog-doc-dedup/stitch-lint-output.txt
```

For each broken-ref, the message includes the path (e.g., `components.card.backgroundColor`) and the unresolved reference. Edit DESIGN.md YAML to add the missing token OR fix the reference path.

- [ ] **Step 4: Re-run lint until 0 errors**

```bash
cd the-digital-matrix
npx @google/design.md lint DESIGN.md 2>&1 | grep -E "^\s*\"summary\"|errors" | head -5
```

Expected: `"errors": 0` in the JSON summary.

- [ ] **Step 5: Update DESIGN.md `## References` to add Stitch lint command**

Append to `## References`:

```markdown
- **Stitch lint validation:** `npx @google/design.md lint DESIGN.md` — runs against the alpha spec. Acceptable warnings: section-order on extensions (Motion, References), orphaned-tokens on body-level color tokens. See spec at https://github.com/google-labs-code/design.md.
```

- [ ] **Step 6: Commit**

```bash
git -C the-digital-matrix add DESIGN.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(design): pass Stitch lint with 0 errors; add lint pointer to References

Final state for Wave 1:
- DESIGN.md conforms to Google Stitch spec (alpha) with 0 lint errors
- Acceptable warnings on section-order (Motion + References extensions)
  and orphaned-tokens (body-level color tokens)
- §References cites the lint command for future verification
EOF
)"
```

---

### Task 5: Expand README.md (project entry point)

**Files:**
- Modify: `the-digital-matrix/README.md` (replace entire content — current 16 lines is too sparse)

**Steps:**

- [ ] **Step 1: Read current README.md**

```bash
cat the-digital-matrix/README.md
```

Confirm current content is just Title + Tech Stack (5 entries) + Development (npm install + dev). All of this gets superseded.

- [ ] **Step 2: Replace README.md content with the expanded version**

Use Write tool to fully replace `the-digital-matrix/README.md` with:

```markdown
# The Digital Matrix

Personal technical blog and portfolio for **Piotr Tarach**, QA engineer based in Prague. Voice-first content pipeline + React SPA with cyberpunk-gold (Night City) visual identity. Reading-mode toggle for blog posts.

**Hosting:** Vercel — auto-deploys from `main`.
**Repo:** https://github.com/MalfiRG/the-digital-matrix

## Tech Stack

| Layer        | Technology                          | Notes                                          |
|--------------|-------------------------------------|------------------------------------------------|
| Framework    | React 18 + TypeScript 5.8           | Path alias `@/` → `src/`                       |
| Bundler      | Vite 7 + `@vitejs/plugin-react-swc` | SWC for fast transforms                        |
| Routing      | React Router DOM 6                  | `BrowserRouter` + `Routes`/`Route`             |
| State        | React Query (TanStack)              | Async state where needed (minimal usage)       |
| Animations   | Framer Motion 12                    | Page transitions, staggered lists              |
| Markdown     | react-markdown + rehype/remark      | GFM, Prism syntax, Mermaid, TOC, slug-from-id  |
| Icons        | Lucide React                        | UI iconography                                 |
| UI Components| shadcn/ui (Radix primitives)        | Sheets, dropdowns, tabs                        |
| Styling      | Tailwind CSS 3 + CSS custom properties | All colors via `:root` tokens                |
| Theme        | next-themes (single theme: cyberpunk-gold) | `attribute="class"` on `<html>`         |
| Deployment   | Vercel                              | Includes Analytics + Speed Insights            |

## Quick Start

```bash
npm install --legacy-peer-deps   # Radix UI peer dep conflicts require this
npm run dev                       # Dev server on http://localhost:8080 (NOT 5173)
npm run build                     # Production build → dist/
npm run preview                   # Serve dist/ locally
npm run lint
npm run test
```

**WSL2 caveat:** Vite HMR over NTFS cross-mounts is unreliable. Hard-restart vite after any file change. See `.claude/rules/hard-reload-dev-servers.md` for the canonical command pattern.

## Documentation Map

| Doc | Role |
|---|---|
| [`DESIGN.md`](DESIGN.md) | Visual identity (Google Stitch spec format) — palette, typography, motion, components, do's/don'ts. Read for ANY UI/styling work. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Engineering architecture — routing, content pipeline, motion system internals, hero cascade state machine, testing layers, implementation notes (the WHY-host per workspace-global rule). |
| [`CLAUDE.md`](CLAUDE.md) | Agent instructions — authoritative-doc routing manifest, ambiguity-resolution rule, env vars, known gotchas. |
| [`docs/superpowers/specs/`](docs/superpowers/specs/) | Pre-implementation design specs (HARD SPEC tier). |
| [`docs/superpowers/plans/`](docs/superpowers/plans/) | Implementation plans (TDD-style, per-task). |
| [`e2e/`](e2e/) | Playwright suite — smoke / functional / visual tiers (see `ARCHITECTURE.md §9`). |

## License

(Existing license text — preserved verbatim if present in repo, or omitted if not.)
```

If a `LICENSE` file exists in the repo, the License section can stay minimal. Verify with:

```bash
ls the-digital-matrix/LICENSE 2>&1
```

- [ ] **Step 3: CRLF guard**

```bash
head -1 the-digital-matrix/README.md | cat -A | grep -c '\^M\$' || true
```

Expected: 0.

- [ ] **Step 4: Word count proof**

```bash
wc -w the-digital-matrix/README.md
```

Expected: ~250-400 words (up from 28). If <150, content is missing — re-check Step 2.

- [ ] **Step 5: Commit**

```bash
git -C the-digital-matrix add README.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(readme): expand README into project entry point

From 16-line tech-stack stub to full project pitch + canonical Tech Stack
table + Quick Start + Documentation Map. README.md becomes the discovery
surface for new readers (human or agent); CLAUDE.md "Tech Stack" gets
stripped in Wave 3 with a → README.md pointer.
EOF
)"
```

---

## Wave 2: ARCHITECTURE.md trim (numbering frozen)

### Task 6: ARCHITECTURE.md §1 + §5 + §6 trim — pointer-based dedup

**Files:**
- Modify: `the-digital-matrix/ARCHITECTURE.md` (§1, §5, §6 — three subsections trimmed in one commit)

**Steps:**

- [ ] **Step 1: Trim ARCHITECTURE.md §1 tech-stack table**

The current §1 has a 11-row Tech Stack table (lines ~42-56). Replace with a 3-row architectural-essentials version + pointer.

Use Edit:
- `old_string`: the entire 11-row table (from `**Tech stack:**` to the row before `## 2. Directory Structure`)
- `new_string`:
```markdown
**Tech stack (architectural essentials):**

| Layer        | Technology                                | Architectural rationale                                       |
|--------------|-------------------------------------------|---------------------------------------------------------------|
| Theme        | next-themes (single theme: cyberpunk-gold) | FOUC prevention via inline script; preserves wiring for future themes (see §12) |
| Animations   | Framer Motion 12 + custom variants in `motion.ts` | Two-tier coexisting timing systems (JS variants + CSS vars) — see §6 |
| Deployment   | Vercel (auto from `main`) + Analytics + Speed Insights | SPA rewrite via `vercel.json`; Speed Insights affects test timing — see §9 |

Full Tech Stack table → `README.md`.
```

- [ ] **Step 2: Trim ARCHITECTURE.md §5 "Theme tokens" subsection**

The current §5 has a "Theme tokens" subsection (lines ~194-218) showing CSS custom properties + Tailwind config mapping. Replace the token enumeration with a 4-line pointer; keep the architectural HOW-it-works.

Use Edit:
- `old_string`: the full `### Theme tokens` subsection (from `### Theme tokens` to `### Reading mode`)
- `new_string`:
```markdown
### Theme tokens

Color tokens live as HSL CSS custom properties on `:root` in `src/index.css`. `tailwind.config.ts` maps each token to a Tailwind utility (e.g., `text-primary` → `color: hsl(var(--primary))`). Single source of truth: the CSS `:root` block.

**Token list and brand rationale:** `→ DESIGN.md §Colors` (the YAML front matter mirrors the CSS tokens; the prose explains semantic roles and usage rules).

```

- [ ] **Step 3: Trim ARCHITECTURE.md §6 — move "Why two stagger hooks?" rationale to DESIGN.md §Motion**

The current §6 has the paragraph at the end of `### Variant-selection hooks`:

```
**Why two stagger hooks?** Hero already runs heavy entrance theater (`hero-glitch-entrance` + `hero-stamp-entrance`). The Phase 3 stagger should be **subtle** to not compete; cyber stagger would fight the headline. Other pages get the cyber variant for first-impression drama.
```

This is semantic-tier rationale, not architectural. Move it to DESIGN.md §Motion.

  a. Read DESIGN.md §Motion to find the insertion point. The paragraph fits well after the easing-grammar table, before `### Hero cascade`.
  b. Use Edit on DESIGN.md to INSERT the paragraph there, with a small adjustment to make it stand alone:

```markdown
### Stagger variant selection

Two stagger variants ship — `staggerItem` (subtle vertical slide + blur) and `staggerItemCyber` (horizontal shift + brightness flash). The home-page hero's Phase 3 cascade (subtitle, buttons, scroll hint) uses the subtle variant via `useHeroStaggerVariant()` so it doesn't compete with the heavy headline theater above. Every other page uses the cyber variant via `useItemVariant()` for first-impression drama. Both hooks gracefully degrade to mobile-fallback (`staggerItemMobile`, opacity only) and reduced-motion (`reducedVariant`, instant).

```

  c. Use Edit on ARCHITECTURE.md to DELETE the original `**Why two stagger hooks?**` paragraph and replace with:
```markdown
**Stagger semantics:** `→ DESIGN.md §Motion / Stagger variant selection`. The hook indirection (which lives here as architecture) enforces mobile-fallback and reduced-motion handling — always use the hook, never import variants directly.
```

- [ ] **Step 4: Verify ARCHITECTURE.md numbering preserved**

```bash
grep -cE "^## [0-9]+\." the-digital-matrix/ARCHITECTURE.md
```

Expected: 13 (sections §1 through §13). If less, a numbering line was accidentally removed. STOP and revert the offending edit.

```bash
grep -nE "^## [0-9]+\." the-digital-matrix/ARCHITECTURE.md
```

Expected:
```
## 1. System Overview
## 2. Directory Structure
## 3. Routing
## 4. Content Pipeline
## 5. Styling Architecture
## 6. Motion Design System
## 7. Hero Cascade Architecture
## 8. Build & Deploy
## 9. Testing Architecture
## 10. Key Abstractions
## 11. Conventions & Rules
## 12. Implementation Notes
## 13. References
```

- [ ] **Step 5: Verify anchor diff is empty**

```bash
grep -rEn "ARCHITECTURE\.md §[0-9]+" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/blog-doc-dedup/arch-refs-mid-wave2.txt
diff /tmp/blog-doc-dedup/arch-refs-before.txt /tmp/blog-doc-dedup/arch-refs-mid-wave2.txt
```

Expected: empty (no diff). If diff: a numbered reference text changed. STOP and re-check Step 4.

- [ ] **Step 6: CRLF guard + commit**

```bash
head -1 the-digital-matrix/ARCHITECTURE.md | cat -A | grep -c '\^M\$' || true
head -1 the-digital-matrix/DESIGN.md | cat -A | grep -c '\^M\$' || true

git -C the-digital-matrix add ARCHITECTURE.md DESIGN.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(arch): trim §1, §5, §6 — point to canonical homes (README, DESIGN.md)

§1 Tech stack table: 11 rows → 3 architectural-essentials rows + → README.md
§5 Theme tokens: enumeration removed → § DESIGN.md §Colors pointer
§6 "Why two stagger hooks?": rationale moved to DESIGN.md §Motion

Section numbering preserved (13 sections); anchor diff empty.
EOF
)"
```

---

### Task 7: ARCHITECTURE.md §12 — process definite KEEP + MIGRATE entries

**Files:**
- Modify: `the-digital-matrix/ARCHITECTURE.md` (§12 — definite MIGRATE entries removed)
- Modify: `the-digital-matrix/DESIGN.md` (§Components or §Layout — receive migrated entries)

**Steps:**

- [ ] **Step 1: Confirm §12 entry count is 28**

```bash
grep -cE "^### " <(sed -n '/^## 12\. Implementation Notes/,/^## 13\. References/p' the-digital-matrix/ARCHITECTURE.md)
```

Expected: 28. If different, the spec assumption was wrong — re-read §12 before proceeding.

- [ ] **Step 2: Migrate entry 12.24 "Reading-mode code-block frame + background unification"**

  a. Read the current entry from ARCHITECTURE.md:
```bash
sed -n '/^### Reading-mode code-block frame + background unification/,/^### /p' the-digital-matrix/ARCHITECTURE.md | head -30
```

  b. In DESIGN.md `## Components`, find the `### code-block` subsection.
  c. Append a `#### Reading-mode override` sub-subsection to `### code-block` containing the verbatim WHY-narrative from ARCHITECTURE.md, preserving:
     - Both bug descriptions (border on `pre[class*="language-"]` not rendering; bg mismatch producing per-line stripes)
     - The exact value `#2d2d2d !important`
     - The regression-history-3-times anchor
     - The test anchor `e2e/functional/code-block-styling.spec.ts`

  d. Delete the entry from ARCHITECTURE.md §12 (the `### Reading-mode code-block frame + background unification` block).

- [ ] **Step 3: Migrate entry 12.25 "Inline-code pill — language-class anchor"**

  Same pattern as Step 2.
  - Source: `### Inline-code pill — language-class anchor` in ARCHITECTURE.md §12
  - Destination: a NEW `### code-inline` subsection in DESIGN.md §Components (after `### code-block`)
  - Preserve: the `:not([class*="language-"])` selector rationale, the `box-decoration-break: slice` failure mode, the test guard `e2e/functional/code-block-styling.spec.ts` "Fenced code excluded from inline-pill styling"

  Update DESIGN.md YAML to add a `code-inline` component entry:
```yaml
  code-inline:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
```

- [ ] **Step 4: Migrate entry 12.28 "IdStrip mobile balance"**

  - Source: `### IdStrip mobile balance` in ARCHITECTURE.md §12
  - Destination: DESIGN.md §Layout — append at end of section (under `### Collapse strategies` or as `### IdStrip responsive balance`)
  - Preserve: the centering rationale (4 segments NODE/OP/TS/UTC + SEC: OK on phone-portrait), the `@media (max-width: 480px)` thresholds (font 10→8px, gap 18→6px, etc.), the hero `flex items-start md:items-center` rationale.

- [ ] **Step 5: Verify migration count and §12 entry count**

After migrations, §12 should have 25 entries (28 - 3):

```bash
grep -cE "^### " <(sed -n '/^## 12\. Implementation Notes/,/^## 13\. References/p' the-digital-matrix/ARCHITECTURE.md)
```

Expected: 25.

```bash
grep -cE "^### " <(sed -n '/^## Components/,/^## /p' the-digital-matrix/DESIGN.md)
```

Expected: 11 (was 10 in Task 3, +1 from `### code-inline`).

- [ ] **Step 6: Run Stitch lint to confirm DESIGN.md still passes**

```bash
cd the-digital-matrix
npx @google/design.md lint DESIGN.md 2>&1 | grep -E "errors|broken-ref"
```

Expected: 0 errors.

- [ ] **Step 7: Verify ARCHITECTURE anchor diff still empty**

```bash
grep -rEn "ARCHITECTURE\.md §[0-9]+" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/blog-doc-dedup/arch-refs-mid-wave2-task7.txt
diff /tmp/blog-doc-dedup/arch-refs-before.txt /tmp/blog-doc-dedup/arch-refs-mid-wave2-task7.txt
```

Expected: empty. If diff: §12 referenced by section number somewhere — re-check.

- [ ] **Step 8: CRLF guard + commit**

```bash
head -1 the-digital-matrix/ARCHITECTURE.md | cat -A | grep -c '\^M\$' || true
head -1 the-digital-matrix/DESIGN.md | cat -A | grep -c '\^M\$' || true

git -C the-digital-matrix add ARCHITECTURE.md DESIGN.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(arch): migrate 3 visual-tier §12 entries to DESIGN.md §Components/§Layout

Entries moved verbatim to DESIGN.md (visual surface, not architectural):
- Reading-mode code-block frame + bg unification → §Components / code-block
- Inline-code pill — language-class anchor → §Components / code-inline (new)
- IdStrip mobile balance → §Layout

§12 now has 25 entries (was 28). Section numbering preserved.

DESIGN.md YAML adds components.code-inline entry to match new ###code-inline
markdown subsection.
EOF
)"
```

---

### Task 8: ARCHITECTURE.md §12 — scenario-walk for CUT and MIGRATE candidates

**Files:**
- Modify: `the-digital-matrix/ARCHITECTURE.md` (§12 — entries 12.6, 12.7, 12.10, 12.13 either cut, migrated, or kept based on scenario-walk)
- Create: `/tmp/blog-doc-dedup/scenario-walks.md` (verification artifact, not committed)

**Steps:**

- [ ] **Step 1: Set up the scenario-walk discipline doc**

Create `/tmp/blog-doc-dedup/scenario-walks.md` with a row per candidate:

```markdown
# §12 Scenario-Walks (per `~/.claude/rules/memory-injection-tiers.md`)

## 12.6 BlogLayout `max-w-6xl` content width — CUT candidate

**Rationale for cut:** Tailwind class is self-documenting; the 680px prose constraint lives in CSS as `.markdown-body > p, .markdown-body > h2, ...` rules in `index.css`.

**Scenario A:** Agent is asked to "make blog post containers wider for desktop, the code samples are getting truncated."
  - Original §12 says: "wider canvas + narrower prose" — the rule is to keep prose narrow but allow code wider.
  - Trimmed §12 (entry removed): agent reads the Tailwind class `max-w-6xl` and the CSS rule constraining prose to 680px — same conclusion (prose stays narrow, code can be wider).
  - Decision: **CUT** — the answer derives from code+CSS without §12.

**Scenario B:** Agent is asked to "remove the prose width constraint to use full canvas."
  - Original §12: explicit rationale for keeping prose narrow.
  - Trimmed §12: no rationale; agent might not know prose-narrow is intentional.
  - Decision: **DIVERGES** — §12 protects against this. Reconsider — KEEP.

**Resolution:** KEEP (Scenario B exposes load-bearing rationale).

## 12.7 Frontmatter parser — supported subset

(... similar pattern ...)

## 12.10 Why we keep `next-themes` despite single-theme

(... similar pattern ...)

## 12.13 Mobile orb override scope (MIGRATE candidate)

(... similar pattern ...)
```

- [ ] **Step 2: Run scenario-walk for each candidate**

For each of the 4 candidates, construct ≥2 scenarios (one favoring CUT/MIGRATE, one favoring KEEP). Document the result.

For 12.6, 12.7, 12.10, 12.13, the resolution might be:
- CUT (both scenarios converge on same answer)
- KEEP (any scenario diverges)
- MIGRATE (visual surface, scenarios converge for the destination doc)

This step is judgment-heavy. If unsure, default to KEEP.

- [ ] **Step 3: Apply the resolutions to ARCHITECTURE.md and DESIGN.md**

For each resolved candidate:
- KEEP → no edit needed
- CUT → use Edit to delete the entry from §12
- MIGRATE → copy verbatim to destination doc (DESIGN.md §Elevation & Depth or §Motion for 12.13), then delete from §12

- [ ] **Step 4: Verify §12 entry count post-resolution**

```bash
grep -cE "^### " <(sed -n '/^## 12\. Implementation Notes/,/^## 13\. References/p' the-digital-matrix/ARCHITECTURE.md)
```

Expected range: 21 to 25 (was 25 after Task 7, may drop further on CUTs and MIGRATEs).

- [ ] **Step 5: Verify ARCHITECTURE anchor diff still empty**

```bash
grep -rEn "ARCHITECTURE\.md §[0-9]+" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/blog-doc-dedup/arch-refs-mid-wave2-task8.txt
diff /tmp/blog-doc-dedup/arch-refs-before.txt /tmp/blog-doc-dedup/arch-refs-mid-wave2-task8.txt
```

Expected: empty.

- [ ] **Step 6: CRLF guard + commit**

```bash
head -1 the-digital-matrix/ARCHITECTURE.md | cat -A | grep -c '\^M\$' || true

git -C the-digital-matrix add ARCHITECTURE.md DESIGN.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(arch): resolve §12 candidate entries via scenario-walk

Per memory-injection-tiers.md "scenario-walk before commit" rule, each
CUT/MIGRATE candidate from spec §6.3 was tested against ≥2 scenarios.

Resolutions (recorded in /tmp/blog-doc-dedup/scenario-walks.md):
- 12.6 BlogLayout max-w-6xl: <KEEP|CUT — fill in based on actual walk>
- 12.7 Frontmatter parser scope: <KEEP|CUT>
- 12.10 next-themes single-theme keep: <KEEP|CUT>
- 12.13 Mobile orb override: <KEEP|MIGRATE to DESIGN.md §Elevation & Depth>

§12 final entry count: <N>. Section numbering preserved.
EOF
)"
```

(Engineer: replace `<KEEP|CUT>` etc. with the actual scenario-walk results.)

---

### Task 9: ARCHITECTURE.md §13 References update

**Files:**
- Modify: `the-digital-matrix/ARCHITECTURE.md` (§13)

**Steps:**

- [ ] **Step 1: Read current §13**

```bash
sed -n '/^## 13\. References/,$p' the-digital-matrix/ARCHITECTURE.md
```

Expected: a 6-row pointer list ending with `*Last updated: ...*` line.

- [ ] **Step 2: Insert pointer to dedup spec doc**

Use Edit to add a new entry above the `*Last updated*` line:

```markdown
- **Doc deduplication migration spec:** `docs/superpowers/specs/2026-04-28-blog-doc-deduplication-design.md` (HARD SPEC for the architecture-tier doc dedup; see also the Stitch lint command `npx @google/design.md lint DESIGN.md` for ongoing DESIGN.md format validation)
```

- [ ] **Step 3: Update the `*Last updated*` line**

Use Edit:
- `old_string`: `*Last updated: 2026-04-19 — single-theme consolidation commit `9ad49e1`*`
- `new_string`: `*Last updated: 2026-04-28 — doc deduplication migration; see §13 spec link*`

- [ ] **Step 4: Commit**

```bash
git -C the-digital-matrix add ARCHITECTURE.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(arch): §13 — link doc-dedup spec + Stitch lint command

Adds pointer to docs/superpowers/specs/2026-04-28-blog-doc-deduplication-design.md
and the npx @google/design.md lint command for ongoing DESIGN.md validation.

Updates Last-updated to 2026-04-28.
EOF
)"
```

---

## Wave 3: CLAUDE.md slim + cross-doc spec patches

### Task 10: CLAUDE.md slim — strip duplicated content, add routing manifest, migrate Agent Prompt Guide

**Files:**
- Modify: `the-digital-matrix/CLAUDE.md` (whole-file restructure)
- Read for content: `/tmp/blog-doc-dedup/agent-prompt-guide-park.md` (parked from Task 2 Step 10)

**Steps:**

- [ ] **Step 1: Read current CLAUDE.md to confirm structure**

```bash
grep -nE "^## " the-digital-matrix/CLAUDE.md
```

Expected sections (current):
```
## Project Overview
## Authoritative documents (lazy-load when relevant)
## Resolving ambiguity (READ BEFORE "fixing" anything that looks weird)
## Git Conventions
## Quick Start
## Tech Stack
## Project Structure
## Path Aliases
## Routes
## Architecture Decisions
## Content Pipeline (Blog Posts)
## Development Conventions
## Key Files
## Environment Variables
## Known Considerations
```

Plus the duplicated `### Author override — quick reference` at lines ~286 + ~296.

- [ ] **Step 2: Confirm the line-286 vs line-296 duplication**

```bash
grep -n "Author override — quick reference" the-digital-matrix/CLAUDE.md
```

Expected: 2 line numbers (e.g., 286 and 296). The block between them is the duplicated content. Read the block to confirm.

- [ ] **Step 3: Replace CLAUDE.md content via Write tool**

Use the Write tool to replace the entire CLAUDE.md with a slim version. Target ~100 lines.

The new CLAUDE.md content:

```markdown
# The Digital Matrix — Agent Instructions

## Project Overview

Personal technical blog by **Piotr Tarach**, QA engineer based in Prague. Single visual identity: **Night City** (cyberpunk-gold). React + TypeScript SPA on Vercel.

**Repo:** `https://github.com/MalfiRG/the-digital-matrix.git` | **Hosting:** Vercel (auto from `main`).

---

## Authoritative documents (lazy-load when relevant)

The architecture-tier docs are the canonical source of truth for their respective domains. Read them on demand for the kind of work you're doing.

- **`README.md`** — project pitch, **canonical Tech Stack table**, Quick Start, doc map. Read FIRST when discovering the repo.
- **`DESIGN.md`** — visual identity (Google Stitch DESIGN.md format, alpha). Read for ANY UI/styling work BEFORE generating code. Sections: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts (+ extensions: Motion, References).
- **`ARCHITECTURE.md`** — engineering architecture (13 sections, numbering frozen):
  - **§1** System Overview · **§2** Directory Structure · **§3** Routing · **§4** Content Pipeline
  - **§5** Styling Architecture · **§6** Motion Design System · **§7** Hero Cascade Architecture
  - **§8** Build & Deploy · **§9** Testing Architecture · **§10** Key Abstractions
  - **§11** Conventions & Rules · **§12** Implementation Notes (the WHY-host) · **§13** References
- **`docs/superpowers/specs/`** — pre-implementation HARD SPECs.
- **`docs/superpowers/plans/`** — implementation plans (TDD-style).

---

## Resolving ambiguity (READ BEFORE "fixing" anything that looks weird)

When you encounter a pattern in this repo that looks wrong, redundant, or over-engineered:

1. **Search `ARCHITECTURE.md §12 Implementation Notes` first.** Most surprising patterns are documented there as deliberate, load-bearing decisions. Examples: `inert` instead of `aria-hidden+tabindex+pointer-events`; SKIP button as direct child of top-level fragment; double-rAF settle in the visual-determinism fixture; `setTimeout(..., 0)` for focus-after-unmount; `try/catch` on `localStorage.getItem`; `next-themes` provider despite single theme.
2. **Search by symbol or filename, not by line.** §12 references `useMotionPolicy`, `readAuthorOverride`, `gotoFreshCascade`, `freezeAnimationsViaInitScript`, etc. — names are stable; line numbers are not.
3. **One-liner inline comments are breadcrumbs, not explanations.** A comment like `// Wave 3 B2 stacking-context` or `// spec §5.3` points to a §12 subsection or a `docs/superpowers/specs/*.md` file. Don't strip them; follow them.
4. **If a pattern looks load-bearing but isn't in §12, check `git log -p <file>` for the introducing commit.** Most have descriptive conventional-commit messages.
5. **If still unclear, ASK before changing.** Reverting a deliberate fix in good faith has asymmetric cost — the original bug returns silently.

This rule is the consumer side of the workspace-global policy `~/.claude/rules/docs-over-code-comments.md`.

---

## Git Conventions

`→ ARCHITECTURE.md §11`. Highlight: **never** include `Co-Authored-By` lines in commits.

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_MOTION_OVERRIDE` | Forces motion policy `on`/`off` for every visitor (build-time default). Per-browser `localStorage["digital-matrix-motion-override"]` wins over this. See `src/lib/motion-config.ts`. | No |
| `VITE_VERCEL_ENV` | Bridged from Vercel's `VERCEL_ENV` by the build script. Drives blog visibility tiers (`production` hides drafts; `preview`/`development` show them). Do not set manually. | No (auto) |

### Blog post visibility tiers

Posts marked `draft: true` in `src/features/blog/data.ts` are gated by three environments:

| Environment | `import.meta.env.PROD` | `VITE_VERCEL_ENV` | Drafts visible? |
|---|---|---|---|
| `npm run dev` | `false` | (anything) | Yes |
| `npm run build` (local) | `true` | unset | Yes (treated as preview) |
| Vercel preview deploy | `true` | `preview` | Yes |
| Vercel production deploy | `true` | `production` | **No** |

Implementation: `detectVisibilityMode` in `src/features/blog/data.ts`.

### Author override — quick reference

To preview animations on mobile/tablet from your own browser without changing config or redeploying:

1. Open the site (any environment), F12 → Console
2. `localStorage.setItem("digital-matrix-motion-override", "on")` then reload
3. To revert: `localStorage.removeItem("digital-matrix-motion-override")` then reload

Per-browser, per-origin tool — never affects other visitors. Full control-plane explanation: `→ ARCHITECTURE.md §12 / Motion override precedence`.

---

## Agent Prompt Guide

Quick palette + ready-to-use prompts for new component generation. Migrated from DESIGN.md (Stitch spec doesn't host agent-prompts).

### Quick color reference (copy into prompts)

```
Night City palette:
- Primary: #f3e600 (yellow, hsl 57 100% 48%)
- Accent:  #52e3c8 (cyan, hsl 171 77% 60%)
- Learning: #f78a1a (amber, hsl 25 95% 55%)
- Background: #0b0d12 (near-black, hsl 222 15% 5%)
- Foreground: #f5e9a3 (warm cream-yellow, hsl 57 80% 82%)
- Border: #1d2436 (dark slate, hsl 222 30% 16%)
```

### Ready-to-use prompts

**For new component generation:**
> Generate a [component] for The Digital Matrix blog. Use Night City palette: primary=yellow `text-primary`, accent=cyan `text-accent`, never amber-500 (use `text-learning` if in-progress). Wrap interactive elements in `btn-interactive glitch-hover` (set `data-text` attr). Use Tailwind utilities exclusively — no hardcoded colors. Body font defaults to Chakra Petch; headings use `font-display` (Orbitron) for h1, `font-heading` (Rajdhani) for h2/h3/h4.

**For new page entrance:**
> Use `useItemVariant()` from `@/lib/motion` for stagger items (NOT `staggerItem` directly — bypasses mobile/reduced-motion guards). Wrap stagger children in a `motion.div` with `staggerContainer` variants. For hero pages with their own entrance theater, use `useHeroStaggerVariant()` instead.

**For ambient effects on a new full-page route:**
> Add `<div className="scanline-overlay scan-sweep" />` at App level when `!isTextSection`. Add a glow orb pair in opposite corners with `blur-3xl` + `mix-blend-mode: screen` + `--hero-orb-primary` / `--hero-orb-accent` colors + `animate-hero-glow-slow` / `animate-hero-glow-slower` keyframes.

---

## Known Considerations

- `npm install --legacy-peer-deps` is required (Radix UI peer dep conflicts).
- Dev server runs on port 8080 (NOT default 5173).
- Polish character transliteration in `MarkdownRenderer.tsx:customSlugify` (ą→a, ć→c, etc.).
- Path alias `@/` → `src/` (configured in `tsconfig.json` + `vite.config.ts`).

```

- [ ] **Step 4: Verify line count is in target range**

```bash
wc -l the-digital-matrix/CLAUDE.md
```

Expected: 100-130 lines (target ~100 with 30 lines headroom for the YAML formatting).

- [ ] **Step 5: Confirm Author Override appears exactly once**

```bash
grep -c "Author override — quick reference" the-digital-matrix/CLAUDE.md
```

Expected: 1.

- [ ] **Step 6: Confirm pointers to ARCHITECTURE.md and DESIGN.md exist**

```bash
grep -cE "ARCHITECTURE\.md|DESIGN\.md|README\.md" the-digital-matrix/CLAUDE.md
```

Expected: ≥6 (ARCHITECTURE in routing manifest + ambiguity rule + git conventions + env-var motion-override; DESIGN in routing manifest; README in routing manifest).

- [ ] **Step 7: CRLF guard + commit**

```bash
head -1 the-digital-matrix/CLAUDE.md | cat -A | grep -c '\^M\$' || true

git -C the-digital-matrix add CLAUDE.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(claude): slim CLAUDE.md to agent-instructions tier (~100 lines)

312 → ~100 lines. Strict role: routing manifest + ambiguity rule + env vars
+ Agent Prompt Guide + known operator gotchas.

Stripped (replaced with → pointers): Tech Stack (→ README), Quick Start
(→ README), Project Structure (→ ARCHITECTURE §2), Routes (→ ARCHITECTURE §3),
Architecture Decisions (→ ARCHITECTURE §10/§12), Content Pipeline
(→ ARCHITECTURE §4), Development Conventions (→ ARCHITECTURE §11),
Styling Rules (→ DESIGN.md), Key Files (→ ARCHITECTURE §10).

Author Override appeared verbatim TWICE (lines 286 + 296) — eliminated
the duplicate; kept the operator quick-ref pointing to ARCHITECTURE §12
for the full control-plane explanation.

Migrated DESIGN.md §10 Agent Prompt Guide here (Stitch spec doesn't host
agent prompts; CLAUDE.md is the obvious destination).
EOF
)"
```

---

### Task 11: Patch 2 line-references in motion-policy spec

**Files:**
- Modify: `the-digital-matrix/docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md` (lines 92 and 392)

**Steps:**

- [ ] **Step 1: Confirm line numbers**

```bash
grep -n "DESIGN\.md §" the-digital-matrix/docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md
```

Expected: 2 hits, references `DESIGN.md §1` and `DESIGN.md §7` (line numbers may have shifted slightly post-merge, verify against the actual file).

- [ ] **Step 2: Patch the §1 reference**

Use Edit:
- `old_string`: `DESIGN.md §1 describes the site as`
- `new_string`: `DESIGN.md §Overview describes the site as`

- [ ] **Step 3: Patch the §7 reference**

Use Edit:
- `old_string`: `DESIGN.md §7 callout writes`
- `new_string`: `DESIGN.md §Motion callout writes`

(There is also a "M4 DESIGN.md callout notation drift" finding referencing `§7` in the same spec — patch any other `DESIGN.md §7` occurrences via `replace_all` if Edit reports the string is non-unique.)

- [ ] **Step 4: Verify the design-refs anchor diff matches expectation**

```bash
grep -rEn "DESIGN\.md §" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/blog-doc-dedup/design-refs-after.txt
diff /tmp/blog-doc-dedup/design-refs-before.txt /tmp/blog-doc-dedup/design-refs-after.txt
```

Expected: 2 lines changed (§1 → §Overview, §7 → §Motion). No new lines added or removed.

- [ ] **Step 5: Wide-grep sanity check (catches anything outside .md files)**

```bash
grep -rn "DESIGN\.md §[0-9]" the-digital-matrix/ \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  --include="*.yml" --include="*.yaml"
```

Expected: empty.

- [ ] **Step 6: Commit**

```bash
git -C the-digital-matrix add docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md
git -C the-digital-matrix commit -m "$(cat <<'EOF'
docs(spec): patch 2 DESIGN.md §-anchored refs in motion-policy spec

After Wave 1 renamed DESIGN.md sections per Google Stitch spec, these 2
inbound references break silently. Patch:
- "DESIGN.md §1" → "DESIGN.md §Overview"
- "DESIGN.md §7" → "DESIGN.md §Motion"
EOF
)"
```

---

## Wave 4: Verification gate

### Task 12: Run full post-edit verification suite

**Files:**
- Read for verification: all docs touched in Waves 1-3
- Create: `/tmp/blog-doc-dedup/verification-report.md`

**Steps:**

- [ ] **Step 1: Stitch lint**

```bash
cd the-digital-matrix
npx @google/design.md lint DESIGN.md 2>&1 | tee /tmp/blog-doc-dedup/stitch-lint-final.txt
```

Pass criterion: 0 errors. Acceptable warnings: section-order on Motion+References extensions, orphaned-tokens on body-level color tokens, contrast-ratio on intentional-low-contrast pairs.

- [ ] **Step 2: ARCHITECTURE anchor stability**

```bash
grep -rEn "ARCHITECTURE\.md §[0-9]+" the-digital-matrix/ --include="*.md" \
  | sort -u > /tmp/blog-doc-dedup/arch-refs-after.txt
diff /tmp/blog-doc-dedup/arch-refs-before.txt /tmp/blog-doc-dedup/arch-refs-after.txt
```

Pass criterion: empty diff.

- [ ] **Step 3: DESIGN.md anchor patches verified**

```bash
diff /tmp/blog-doc-dedup/design-refs-before.txt /tmp/blog-doc-dedup/design-refs-after.txt
```

Pass criterion: 2 line changes (`§1 → §Overview`, `§7 → §Motion`); no other diffs.

- [ ] **Step 4: Word-count dedup proof**

```bash
{
  echo "=== Pre-migration baseline ==="
  cat /tmp/blog-doc-dedup/baseline.txt
  echo ""
  echo "=== Post-migration ==="
  cd the-digital-matrix && wc -w DESIGN.md ARCHITECTURE.md CLAUDE.md README.md
  cd ..
  echo ""
  echo "=== memory/* (deleted in Wave 5; should still exist at this point) ==="
  ls -la memory/architecture.md memory/design-system.md 2>&1
} | tee /tmp/blog-doc-dedup/word-count-proof.txt
```

Pass criteria:
- ARCHITECTURE.md and CLAUDE.md each shrink (negative delta).
- DESIGN.md and README.md may grow.
- Net inner-repo delta (sum of 4 files): ≥ 1,200 word reduction.

- [ ] **Step 5: CRLF guard on all touched files**

```bash
for f in DESIGN.md ARCHITECTURE.md CLAUDE.md README.md \
         docs/superpowers/specs/2026-04-24-device-tier-motion-policy-design.md \
         docs/superpowers/specs/2026-04-28-blog-doc-deduplication-design.md \
         docs/superpowers/plans/2026-04-28-blog-doc-deduplication.md; do
  cd the-digital-matrix
  count=$(head -1 "$f" 2>/dev/null | cat -A | grep -c '\^M\$' || true)
  if [ "$count" != "0" ]; then
    echo "CRLF FOUND in $f"
  fi
  cd ..
done
echo "CRLF guard complete"
```

Pass criterion: no `CRLF FOUND` lines printed.

- [ ] **Step 6: Stray-branch audit (per `~/.claude/rules/audit-stray-branches-before-main-clean.md`)**

```bash
git -C the-digital-matrix fetch origin --prune
for b in $(git -C the-digital-matrix for-each-ref --format='%(refname:short)' refs/heads | grep -v '^main$'); do
  n=$(git -C the-digital-matrix log main.."$b" --oneline 2>/dev/null | wc -l)
  [ "$n" -gt 0 ] && echo "$b: $n unmerged commits"
done
```

Pass criterion: empty output (no stray branches with content that would resurrect deleted material). If any branches have unmerged commits, classify them per the rule.

- [ ] **Step 7: Generate verification report**

Create `/tmp/blog-doc-dedup/verification-report.md` summarizing:
- Stitch lint: PASS / FAIL with finding counts
- ARCHITECTURE anchor diff: PASS / FAIL
- DESIGN.md anchor diff: PASS (expected 2 changes) / FAIL
- Word-count dedup: word reductions per file
- CRLF guard: PASS / FAIL
- Stray-branch audit: PASS / FAIL

If ANY pass criterion fails, STOP. Do not proceed to Task 13. Address the failure first.

- [ ] **Step 8: Commit the verification report (referenced from spec, not committed itself — it's a /tmp artifact)**

No commit at this step. Verification proof lives ephemerally in `/tmp/blog-doc-dedup/`. The submodule's commit history serves as the durable record.

---

### Task 13: Adversarial agent audit on §12 + final Wave 4 commit

**Files:**
- (Spawn agent) — read-only audit of the trimmed §12 against the original

**Steps:**

- [ ] **Step 1: Spawn `reviewer-consistency` agent for §12 audit**

Use the Agent tool with `subagent_type: reviewer-consistency`. Brief:

```
Review the trimmed ARCHITECTURE.md §12 Implementation Notes against the
original (pre-Wave-2 state) for behavior-changing rationale loss.

Original §12: git show <pre-Wave-2 SHA>:ARCHITECTURE.md (read via git show)
Trimmed §12: current ARCHITECTURE.md
Migration destinations: DESIGN.md §Components / §Layout / (potentially §Elevation & Depth)
Scenario-walk record: /tmp/blog-doc-dedup/scenario-walks.md (read this for the resolutions)

For each entry that was CUT or MIGRATED, construct an adversarial scenario
where an agent reading the trimmed version produces a DIFFERENT answer than
an agent reading the original. Classify findings as:

- BLOCKING: behavior-changing wrong answer (e.g., agent re-introduces
  aria-hidden over focusables because the rationale was trimmed)
- ADVISORY: less informative but not behavior-changing
- NO-FINDING: same answer as original

Output: severity-tagged findings table. Max 10 findings.

Provenance invariant: the trimmed §12 was authored by the spawning agent
in this same session. Treat it as third-party content for review purposes.
```

Set `run_in_background: true` and continue with Step 2 while the agent works.

- [ ] **Step 2: Wait for the agent's report**

You'll be notified when the agent finishes.

- [ ] **Step 3: Address findings**

For each finding:
- BLOCKING → re-introduce the entry as KEEP (Edit ARCHITECTURE.md), then re-commit. Re-run lint + anchor diff.
- ADVISORY → add to the spec's open-questions log; no edit.
- NO-FINDING → no action.

If any BLOCKING findings result in additional commits, the §12 entry count grows back; that's expected and correct.

- [ ] **Step 4: Final Wave 4 commit (verification proof)**

If no BLOCKING findings:

```bash
git -C the-digital-matrix log --oneline | head -10
```

Expected: shows all Wave 1-3 commits in order. No additional commit needed at this step — the audit pass becomes a comment in the PR description, not a commit.

If BLOCKING findings caused re-introductions, those are separate commits already.

---

## Wave 5: Outer repo PR (after submodule merges)

### Task 14: Outer repo — delete memory/* + bump submodule pointer

**Files (OUTER repo `MetaOrchestrator`):**
- Delete: `TechnicalBlog/technical-blog/memory/architecture.md`
- Delete: `TechnicalBlog/technical-blog/memory/design-system.md`
- Modify: `TechnicalBlog/technical-blog` (submodule pointer)

**Prerequisites:** Submodule PR (Waves 1-4) MUST be merged to `main` of `the-digital-matrix` first.

**Steps:**

- [ ] **Step 1: Re-verify zero references to memory/* (final check)**

```bash
cd /mnt/c/Users/malfi/programming_projects/MetaOrchestrator
grep -rn "memory/architecture\|memory/design-system" TechnicalBlog/ \
  --include="*.md" --include="*.json" --include="*.yml" --include="*.yaml" \
  --include="*.ts" --include="*.tsx" --include="*.js"
```

Expected: empty.

- [ ] **Step 2: Confirm the files exist (we're about to delete)**

```bash
ls -la TechnicalBlog/technical-blog/memory/
```

Expected: shows `architecture.md` and `design-system.md`. If files don't exist, someone else already cleaned them up — STOP and ask user.

- [ ] **Step 3: Delete the memory files**

```bash
git -C /mnt/c/Users/malfi/programming_projects/MetaOrchestrator rm \
  TechnicalBlog/technical-blog/memory/architecture.md \
  TechnicalBlog/technical-blog/memory/design-system.md
```

Use `git rm` (not `rm`) so the deletion is staged in git directly.

- [ ] **Step 4: Check if memory/ directory is now empty**

```bash
ls -la TechnicalBlog/technical-blog/memory/ 2>&1
```

If empty (only `.` and `..`): remove the directory:

```bash
rmdir TechnicalBlog/technical-blog/memory/
```

If other files remain: leave the directory.

- [ ] **Step 5: Update submodule pointer**

```bash
cd /mnt/c/Users/malfi/programming_projects/MetaOrchestrator
git -C TechnicalBlog/technical-blog/the-digital-matrix log --oneline | head -1
# Note the SHA — this is the merged Wave 1-4 commit
```

The submodule pointer should automatically update when you do `git status` from the outer repo. Verify:

```bash
git status --porcelain | grep technical-blog
```

Expected: `M TechnicalBlog/technical-blog/the-digital-matrix` (submodule pointer change).

If the submodule is checked out at a different commit than `main`:

```bash
git -C TechnicalBlog/technical-blog/the-digital-matrix checkout main
git -C TechnicalBlog/technical-blog/the-digital-matrix pull origin main
```

Then re-check `git status` in outer repo.

- [ ] **Step 6: Verify outer repo status**

```bash
git status
```

Expected staged changes:
- `D TechnicalBlog/technical-blog/memory/architecture.md`
- `D TechnicalBlog/technical-blog/memory/design-system.md`
- `M TechnicalBlog/technical-blog/the-digital-matrix` (submodule)

- [ ] **Step 7: Final CRLF guard (outer repo — should be clean since we only deleted)**

No CRLF check needed for deletions.

- [ ] **Step 8: Commit**

```bash
git add TechnicalBlog/technical-blog/the-digital-matrix
# memory/* deletions are already staged via git rm in Step 3

git commit -m "$(cat <<'EOF'
docs(blog): delete stale memory/* mirrors + bump submodule pointer

Wave 5 of the doc-dedup migration — outer-repo half.

Deletes:
- TechnicalBlog/technical-blog/memory/architecture.md (stale; described
  wouter/MatrixRain/LanguageProvider — none in current code)
- TechnicalBlog/technical-blog/memory/design-system.md (stale; described
  green Matrix palette replaced by Night City)

Verified zero inbound references via grep across .md/.ts/.tsx/.js/.json/.yml/.yaml
in TechnicalBlog/. Files described a different codebase entirely; no
content migration needed (nothing was salvageable).

Bumps the-digital-matrix submodule pointer to merged Wave 1-4 commit:
DESIGN.md → Google Stitch spec format, ARCHITECTURE.md trimmed,
CLAUDE.md slimmed to ~100 lines, README.md expanded to project entry point.

Submodule PR: <link to merged PR>
Spec: TechnicalBlog/technical-blog/the-digital-matrix/docs/superpowers/specs/2026-04-28-blog-doc-deduplication-design.md
EOF
)"
```

(Engineer: replace `<link to merged PR>` with the actual GitHub PR URL after the inner PR merges.)

---

## Self-review checklist

After completing all tasks, walk this list against the spec:

- [ ] Stitch lint exits 0 with 0 errors.
- [ ] `diff /tmp/blog-doc-dedup/arch-refs-{before,after}.txt` is empty.
- [ ] DESIGN.md has YAML front matter with version: alpha, name: Night City, ≥1 colors, ≥1 typography, ≥1 components.
- [ ] DESIGN.md sections in canonical order: Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts → (extensions: Motion, References).
- [ ] ARCHITECTURE.md retains all 13 numbered sections with original numbering.
- [ ] CLAUDE.md is ≤120 lines (target ~100).
- [ ] README.md is ≥50 lines and contains canonical Tech Stack table.
- [ ] `memory/architecture.md` and `memory/design-system.md` deleted in Wave 5.
- [ ] `2026-04-24-device-tier-motion-policy-design.md` lines 92 + 392 patched.
- [ ] Adversarial agent audit on §12: no blocking findings, OR all addressed.
- [ ] Word-count dedup proof: ≥1,200 word net reduction inner-repo (DESIGN+README may grow; ARCH+CLAUDE must shrink).
- [ ] No flipped line endings.
- [ ] No stray branches with unmerged content.

---

## Spec reference

`docs/superpowers/specs/2026-04-28-blog-doc-deduplication-design.md` (commit `46acaea`)

This plan implements that spec. Any deviation from the spec must be flagged in the PR description and either updated in the spec OR justified inline in the relevant task.
