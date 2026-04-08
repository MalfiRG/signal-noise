---
name: Phase G — Content Positioning Refactor (Navbar + Hero Copy)
date: 2026-04-08
status: deferred — awaiting initiation
parent_workstream: 2026-04-08 palette refactor (PR #27)
---

# Phase G — Content Positioning Refactor (Navbar + Hero Copy)

## Status

**DEFERRED.** This brief was authored at the end of the palette refactor session as a handoff for a future Claude Code session. The owner explicitly parked this work as a separate workstream because it requires a different review composition than the palette refactor.

**Initiate when ready** by pointing a fresh Claude Code session at this file: *"Read `docs/superpowers/specs/2026-04-08-content-positioning-refactor-brief.md` and execute Phase G."*

## Why this exists

The palette refactor (PR #27) intentionally did NOT touch any visible text content on the blog — only theme colors, the deleted MatrixRain canvas, and CSS variables. During the refactor planning, the owner flagged that the blog's identity copy (navbar callsign + hero landing page text) is **too narrow** for their actual professional positioning, and asked for the content refactor to be a separate workflow with its own review pipeline.

Direct quote from the owner during palette refactor planning (2026-04-08):

> *"I am someone cross-cutting AI augmented testing, agent-driven-development delivering production-grade AI-powered solutions, writing BE and FE tests, designing and architecting stuff, testing things manually and exploratory, having extensive DevOps experience. The navbar should reflect that 'text-center px-4 max-w-3xl' should also reflect that and the portfolio landing page. But it is a content refactor which will require additional reviewer and additional pair of socratic questions. The Digital Matrix can stay as the formal title."*

## Goal

Update the visible identity copy on `the-digital-matrix` blog to reflect the owner's broader cross-cutting professional positioning, without changing the formal blog title ("The Digital Matrix") or the architectural structure (theme system, routing, etc.).

## In scope

### File 1: `src/components/Navbar.tsx`

**Current state (line 48):**

```tsx
<Link to="/" className="font-display text-lg font-bold text-foreground text-glow tracking-wider">
  <Terminal className="inline-block mr-2 h-5 w-5" />
  SDET_PORTFOLIO
</Link>
```

**Issue:** `SDET_PORTFOLIO` is a callsign that emphasizes a single role (Software Development Engineer in Test). The owner's positioning is broader. Whatever replaces it needs to:

- Be **terminal-handle short** (the visual style is `>_ HANDLE` — fits the Matrix-aesthetic constraint)
- Read as a stylized callsign, not a full job title
- Hint at the cross-cutting nature without being verbose
- Preserve the `<Terminal>` icon and the `text-glow` styling

Candidate forms to brainstorm with the user (DO NOT pick one without their input):
- `>_ AI_QA_ENGINEER` (broader but still single-role)
- `>_ AGENT_OPERATOR` (emphasizes agent-driven dev angle)
- `>_ TEST_ARCHITECT` (emphasizes architecture/design angle)
- `>_ FULL_STACK_QA` (emphasizes BE+FE testing breadth)
- `>_ PIOTR.SH` (personal handle, sidesteps role labeling)

The owner's stated identity dimensions are: AI-augmented testing, agent-driven development, production AI-powered solutions, BE/FE test writing, architecture and design, manual/exploratory testing, DevOps experience. None of the above candidates capture all of those simultaneously — that's the design problem to solve.

### File 2: `src/pages/Index.tsx` — hero block

**Current state:** the hero section contains an `<h1>` styled as bright glowing text with the value `SOFTWARE DEVELOPER IN TEST`, plus a tagline below it. The exact JSX is around the `text-center px-4 max-w-3xl` container — read the file to find the current copy. The "INITIALIZING SYSTEM..." preamble and the two CTA buttons (`VIEW PROJECTS`, `READ BLOG`) are part of the same block.

The owner's note specifically calls out the `text-center px-4 max-w-3xl` container as needing the refactor. The hero copy should:

- Replace `SOFTWARE DEVELOPER IN TEST` with something that captures the broader positioning
- Update the tagline (current: `Engineering quality into every line of code. Automation architect. Bug hunter. System breaker.`) to mention the AI-augmented and agent-driven aspects
- Keep the visual structure (preamble + headline + tagline + CTAs) — only the text strings change
- Stay short (the headline is large display type; long phrases break the layout)
- Match the blog's voice DNA: direct, opinionated, metaphor-friendly, no AI-isms (per `references/voice-style-guide.md` polish dial 4-5/10)

### File 3 (probably): `src/features/about/data.ts`

The about page bio (`introText.bio`) currently leads with "ISTQB-certified QA Engineer specializing in test automation for enterprise backup & recovery solutions." This is also too narrow and is now stale (the palette refactor description in `projects/data.ts` was updated to remove the "Matrix-themed" wording but the about bio was NOT touched). If the navbar and hero are getting refreshed, the about bio probably should too — for narrative consistency.

The bio is 3 sentences. Rewrite all 3 to match the broader positioning.

### File 4 (maybe): `src/features/projects/data.ts`

The "The Digital Matrix" project entry was already updated in PR #27 to remove "Matrix-themed" wording. It currently reads: "A personal portfolio and technical blog built as a React SPA with a voice-first content pipeline. Features multiple theme profiles, dark/reading mode toggle, Mermaid diagram rendering, and file-explorer-style navigation."

This is factually correct now. Phase G might want to update it again to match whatever positioning the new navbar/hero adopts, but only if the new positioning explicitly affects how the blog describes itself. Optional.

## NOT in scope

- **No theme/palette changes.** Phase G is content-only. The violet/amber theme system stays as-is.
- **No new components, no React structural changes, no routing changes.** Pure text edits.
- **No blog post content edits** — the existing posts in `src/pages/content/blog/` stay untouched.
- **No CLAUDE.md edits** in the blog repo (that file was updated in PR #27 to scrub Veeam and update the description).
- **No `voice-style-guide.md` changes** — the voice constraints stay as the rule, the new copy must fit them.
- **No meta-tags or `index.html` `<title>`** unless the formal blog name itself is changing (which the owner explicitly said it's NOT — "The Digital Matrix" stays as the formal title).

## Required review pipeline

The owner explicitly said this work requires "additional reviewer and additional pair of socratic questions." The right composition is **different** from the palette refactor's pipeline because content/positioning is judgment-heavy in ways that code refactors aren't:

### Phase 1: Brainstorming (interactive)

Use `superpowers:brainstorming` skill OR a simple `general-purpose` agent acting as positioning brainstormer. Goal: extract the owner's actual positioning intent in their own words. Do NOT propose candidates upfront — ask for the owner's articulation first, then offer candidates.

Sample socratic questions to extract:
1. "If you had to describe what you do in ONE sentence to a hiring manager, what would it be?"
2. "What's the difference between how you'd describe yourself to a fellow QA engineer vs how you'd describe yourself to a head of engineering?"
3. "Which of the cross-cutting dimensions (AI testing, agent-driven dev, architecture, manual/exploratory, DevOps) is the LEAD identity? Which are supporting?"
4. "Is the new positioning aspirational (where you want to be in 6 months) or descriptive (what you can demonstrably do today)?"
5. "Are there roles you DON'T want to be associated with? (e.g., 'I'm not just a tester' / 'I'm not a developer who does some testing')"
6. "Who's the blog audience — recruiters, hiring managers, peer engineers, your future self?"

The answers shape everything downstream. Do NOT skip this phase.

### Phase 2: Copy drafting

Use **`tech-communicator`** subagent (it's specifically built for blog/LinkedIn/positioning copy and follows the voice style guide). NOT a general-purpose curator — tech-communicator is the right specialist here.

Brief tech-communicator with:
- The owner's positioning answers from Phase 1
- The voice style guide reference (`skills/voice-to-blog/references/voice-style-guide.md`)
- The 4 file paths and their current content
- The constraint that the formal blog title stays "The Digital Matrix"
- Visual layout constraints (navbar callsign is short, hero headline is large display type)

Output: 3-5 copy variants for EACH file (navbar callsign, hero headline, hero tagline, about bio). Multiple variants give the owner real choices.

### Phase 3: UX review of copy candidates

Spawn `ux-reviewer` agent specifically for the COPY (not the layout). Its job: evaluate each variant for:
- Visual fit at the layout's character budget
- Cognitive load on first-impression
- Brand coherence with the violet/amber theme aesthetic
- Avoidance of generic developer-portfolio clichés
- Whether the copy "works" against the existing CSS classes (text length, wrap behavior)

### Phase 4: Adversarial review

Spawn `adversarial-tl-reviewer` for a hostile pass. Its job: tear down each variant as a 5x-experience hiring manager would. Specifically attack:
- "Does this read as positioning theatre or actual capability?"
- "Would I believe this if it were on a CV from someone with N years of experience?"
- "What's the first thing a skeptical reader would ask for proof of?"
- "Is there any Veeam-shaped hole in the positioning that an interviewer would probe?"

The adversarial review is the most important review step because positioning is the area where wishful thinking gets shipped most often.

### Phase 5: Socratic Round 2 (post-adversarial)

After the adversarial review surfaces tear-downs, run ANOTHER socratic-challenger pass on the SURVIVING candidates. The owner picks. This is the second "additional pair of socratic questions" the owner specifically asked for.

### Phase 6: Curator implementation

ONLY after Phases 1-5 converge should the curator touch any file. The curator's job is purely mechanical: apply the chosen copy to the chosen files, update test snapshots if any, run lint, commit on a new branch.

### Phase 7: Visual verification

Use the existing `scripts/verify-theme-switch.ts` (it captures hero screenshots) to confirm the new copy:
- Doesn't break layout in either violet or amber theme
- Doesn't break mobile (375px viewport)
- Reads as intended at actual rendered scale

## Recommended branch / PR strategy

- Branch name: `feat/identity-positioning-refresh` (or similar — content refactor, not "feat:" if you prefer chore: scope)
- Commit style: **one commit per file** is fine, OR one commit total if the changes are tightly coupled. Use the user's existing convention (rebase merge style on this repo).
- PR base: `main` (no longer stacked on anything)
- The PR description should include:
  - The positioning answers from Phase 1 (so the rationale is preserved in the commit history)
  - Before/after snippets of each copy change
  - Adversarial review findings + dispositions
  - Visual verification screenshots

## Expected effort

For an Opus orchestrator with the recipe in `memory/feedback_orchestrator_recipe.md`: 6-8 spawned agents across 7 phases. Estimated wall-clock time: 30-60 minutes of orchestration depending on how many socratic rounds the owner needs to converge on positioning. **The bottleneck is Phase 1 (extracting positioning intent), not the implementation.**

Do NOT skip the brainstorming phase to "get to the work faster" — the work without good positioning input is just rewording the same narrow identity in different words.

## What this brief explicitly does NOT decide

1. The actual new navbar text — that's for the owner to choose after brainstorming.
2. The actual new hero headline — same.
3. Whether the about bio needs updating — likely yes, but defer to the owner's call after Phase 1.
4. Whether `projects/data.ts` self-description needs another pass — depends on whether the new positioning changes how the blog describes itself.

## References

- Owner's positioning quote: see "Why this exists" section above
- Palette refactor PR: #27 (the parent workstream)
- Voice style guide: `skills/voice-to-blog/references/voice-style-guide.md` (workspace level)
- Agent team playbook: `knowledge/distilled/ai-workflows/agent-teams-workspace-adapted.md` (workspace level)
- Orchestrator recipe: `memory/feedback_orchestrator_recipe.md` (workspace memory — auto-loaded)
- Lessons that apply here: WCAG citation, Haiku delegation, diff stat anomaly check, CRLF mixed blob detective (all in `lessons/` — auto-loaded)
