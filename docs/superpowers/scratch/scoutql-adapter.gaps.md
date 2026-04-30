# Phase 3.5 — ScoutQL Adapter Dry-Run Gap Analysis

Date: 2026-04-30. Adapter draft: `scoutql-adapter.draft.ts`. Source inspected:
`SqoutQL_jobRadar/scoutQL/frontend/src/index.css` (Tailwind v4 `@theme` block).

Per plan Task 3.5.1 Step 5: each surfaced gap MUST be classified as
project-specific / universal / stylistic before resolving. Unclassified gaps
block Phase 4 entry.

## Gap inventory

### Gap 1 — `motionTokens` absent in ScoutQL

**Shape:** ScoutQL's `index.css` has zero motion-token CSS variables. No
`--motion-*`, no `--ease-*`, no `--stagger-*`, no `--duration-*`. The blog
adapter populates `motionTokens` with 5 durations + 5 easings sourced from
its own CSS; ScoutQL would supply nothing.

**Classification:** **project-specific**.

The adapter contract already declares `motionTokens?:` as optional. Omitting
it on ScoutQL's adapter is the contract-correct path. No `ProjectAdapter`
extension needed. The blog's motion-token UX simply doesn't have an analog
in ScoutQL because ScoutQL's UI surface uses Tailwind utility-class
animations rather than CSS-variable-driven transitions.

**Action:** None. Adapter draft omits `motionTokens`. Verified by `npx tsx
scoutql-adapter.draft.ts` — exit 0, no compile error on the omission.

---

### Gap 2 — Smaller surface area: 15 color tokens vs blog's 24

**Shape:** ScoutQL exposes 15 color tokens (background, card, muted,
border/input/ring, accent + accent-foreground, 4 status semantics). Blog
exposes 24 (brand triad + 5 surface + 4 structural + 12 prose). The
contract works identically; surface area differs by codebase scale.

**Classification:** **stylistic** (not a gap, just a quantitative
observation).

**Action:** None. The adapter contract's `cssVarPalette: string[]` tolerates
arbitrary length. Both 15 and 24 are valid populations.

---

### Gap 3 — `tailwindResolver` and `fileResolver` not populated in dry-run

**Shape:** Adapter contract declares both as optional. The blog adapter
shipped without them too (Task 3.1, Session 7). This dry-run draft also
omits them.

**Classification:** Not a gap. Optional fields are optional. Future
hardening passes (the blog's HMR perf benchmark, ScoutQL's actual
integration in Phase 4) may wire them up, but the contract permits
omission.

**Action:** None. Documented for completeness so a future Phase 4 reader
doesn't mistake omission for absence-of-decision.

---

### Gap 4 — Plan path was off by one directory level (plan amendment §F)

**Shape:** Plan §5691 sketched the import as `import type { ProjectAdapter }
from '../../src/design-companion/types'`. The draft file lives at
`Docs/superpowers/scratch/scoutql-adapter.draft.ts` — 3 levels deep from
the inner blog root. Correct relative path: `'../../../src/design-companion/types'`.

**Classification:** Plan defect (Class 4 — path/extension bug). Not an
adapter contract gap; just a plan write-up bug caught by counting directory
hops before writing.

**Action:** Plan amendment captured in Session 9 handoff §F. Plan file
itself kept verbatim per Session 6 archival convention.

---

### Gap 5 — `npx tsc --noEmit <file>` triggers TS5112 (plan amendment §G)

**Shape:** Plan §5704 sketched the compile-check as `npx tsc --noEmit
Docs/superpowers/scratch/scoutql-adapter.draft.ts`. Modern TypeScript emits
error TS5112 ("tsconfig.json is present but will not be loaded if files
are specified on commandline. Use '--ignoreConfig' to skip this error.")
when a tsconfig.json exists in the project root. The single-file form
disables tsconfig loading entirely, losing strict-mode + path aliases.

**Workaround used this dry-run:** `npx tsx Docs/superpowers/scratch/scoutql-
adapter.draft.ts` — tsx auto-discovers tsconfig and validates types via
transpile, exit 0 indicates types resolved cleanly.

**Classification:** Plan defect (Class 4 — tooling assumption from older
TS version). Not an adapter contract gap.

**Action:** Plan amendment captured in Session 9 handoff §G.

---

## Summary

**Contract gaps surfaced:** zero.

The `ProjectAdapter` contract (the-digital-matrix `src/design-companion/types.ts`)
handles ScoutQL cleanly. All adapter fields either populate naturally from
ScoutQL's CSS or are correctly optional. No Phase 3 re-opening needed.

**Plan amendments surfaced:** two (§F path level, §G tsc invocation). Both
are mechanical write-up bugs caught by the read-before-write + compile-
before-commit discipline. Plan file kept verbatim; corrections captured in
Session 9 handoff.

**Phase 4 gating:** clear. The adapter contract validates against a second
consumer without modification. Phase 4 (real ScoutQL integration) is gated
by spec §10.5's four exit criteria — listed in plan Task 3.5.2 Step 2 —
not by contract changes from this dry-run.
