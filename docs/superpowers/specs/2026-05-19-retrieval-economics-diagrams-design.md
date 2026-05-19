# Retrieval Economics Animated Diagrams - Design Spec

**Date:** 2026-05-19
**Status:** Rev 2 - post-adversarial-review (52 findings from 5 reviewers; 4 critical, 16 high, 19 medium, 13 low applied)
**Review:** 5-agent adversarial team (adversarial-TL, architect, performance, accessibility/UX, consistency)
**Post:** "85,000 Memories, 3,000 Tokens - Why Retrieval Beats Context Every Time" (`mempalace-retrieval-economics`)
**Companion to:** Existing four diagrams from `mempalace-sqlite-vec-migration` post

---

## 1. Overview

Three new animated React diagram components for the MemPalace retrieval economics blog post, plus two shared primitives extracted for reuse across all current and future diagrams.

All components follow the established pattern: `DiagramShell` wrapper, three visual modes (inline/expanded/reading), framer-motion spring animations with stagger entrance, `whileInView` scroll trigger, `useDiagramMotion()` reduced-motion support, `useReadingMode()` for blog page detection.

### Design Decisions (brainstorm session 2026-05-19)

| Decision | Choice | Rationale |
|---|---|---|
| Visualization style | Hybrid - flow steps + bar payoff | Keeps visual consistency with existing flow diagrams while introducing data-viz for comparisons |
| Animation choreography | Sequential 3-phase reveal (~2.5s) | Mirrors DualWriteVsACID timing. Bar growth makes scale differences visceral |
| Context window retrieval | Its own tiny bar at bottom of stack | Visual contrast between Opus 1M and MemPalace 3K is the punchline |
| Latency tax layout | Inverted bars (lower=better) + hit rate as labels + footnote | Lower ms is better, so shorter bar = better. Hit rate is a verdict, not a metric to bar-chart |
| All three scope | Full DiagramShell | Consistent expand/fullscreen experience across the diagram family |
| Architecture | Shared AnimatedBar + useCountUp primitives | Bars appear in all three diagrams. Future diagrams will reuse both |

---

## 2. New Shared Primitives

### Shared Type Extraction

Extract `type Mode = "inline" | "expanded" | "reading"` and `useDiagramMode(expanded: boolean): Mode` hook to `diagrams/types.ts`. New components import from day one. Existing components can migrate incrementally.

### 2.1 `AnimatedBar.tsx`

Reusable proportional bar with grow-from-zero animation and optional count-up label. AnimatedBar is a pure structural primitive - it has no knowledge of diagram modes or mode-dependent styling. Consumers resolve their own colors per mode and pass them explicitly.

**Props:**

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `number` | yes | The numeric value this bar represents |
| `maxValue` | `number` | yes | The maximum value in the bar's context (determines proportional width) |
| `label` | `string` | no | Text rendered inside or beside the bar (highest display priority) |
| `color` | `string \| { from: string; to: string }` | yes | Bar fill color. Single string = solid fill; object = gradient start/end |
| `labelColor` | `string` | yes | Color for the primary label text |
| `subLabelColor` | `string` | yes | Color for the sub-label text |
| `ariaLabel` | `string` | yes | Accessible name for screen readers (renders as sr-only span with final value) |
| `animate` | `boolean` | yes | Whether to animate (false = static render) |
| `delay` | `number` | no | Delay in seconds before bar starts growing |
| `growDuration` | `number` | no | Duration of bar growth in seconds (default: 0.8) |
| `minWidth` | `number` | no | Minimum width in px (prevents tiny bars from collapsing) |
| `countUp` | `boolean` | no | Whether to animate the value number from 0 |
| `countUpDuration` | `number` | no | Duration of count-up in seconds (default: 1.5). Internal `useCountUp` converts to ms at implementation boundary |
| `height` | `number` | no | Bar height in px (default: 20) |
| `subLabel` | `string` | no | Secondary text rendered below the bar on a new line, left-aligned with bar start |

**Display precedence:** `label` (verbatim string) > `countUp` (animated 0->value) > `value` (static formatted). `label` always wins when provided.

**Clamping:** Proportional width is clamped to `Math.min(value / maxValue, 1)`. If `maxValue <= 0`, bar does not render.

**Label overflow:** For bars narrower than label text, position label outside (to right of) bar.

**Rendering model:** AnimatedBar renders as a `motion.div` child with `variants`. It receives animation trigger from the parent container's `whileInView` propagation. The `animate` prop gates whether variants use spring/easeOut or static values. The `delay` prop sets `transition.delay` on the variant.

**Animation:** Grows from `width: 0` to proportional width using framer-motion `animate` with `easeOut` curve, duration controlled by `growDuration` (default 0.8s). When `countUp` is true, the numeric label counts from 0 to `value` over `countUpDuration`.

**Glow effect:** Apply glow via `onAnimationComplete` callback (glow appears as flourish after growth completes) or use `filter: drop-shadow` to avoid box-shadow repaints during width animation. Tailwind syntax: `shadow-[0_0_8px_rgba(82,227,200,0.33)]`.

**Reduced motion:** When `animate` is false, bar renders at full width immediately. Count-up shows final value directly.

**Accessibility:**

- AnimatedBar root element: `role="meter"`, `aria-valuenow={value}`, `aria-valuemin={0}`, `aria-valuemax={maxValue}`
- `ariaLabel` prop (required) renders as sr-only span with the final value
- Count-up animated number: `aria-hidden="true"`. A static sr-only span provides the real value from frame 1
- Each parent diagram's root container: `role="figure"` + `aria-label` summarizing the comparison in plain text

### 2.2 `useCountUp.ts`

Extracted from `DualWriteVsACID.tsx` lines 83-98. Identical behavior, standalone file.

**Signature:** `useCountUp(target: number, duration: number, active: boolean): number`

The `useState(target)` initial value is load-bearing for `active=false` (reduced motion shows final value immediately). Do not change to `useState(0)`.

Use AnimatedBar's `countUp` prop for bar contexts. Use `useCountUp()` directly for standalone numbers (e.g., LatencyTax hit rate display).

Add `runningRef` guard to prevent double-fire on rapid expand/collapse cycles.

**Batch optimization (stretch):** For ContextWindowScale (6 concurrent counters), a `useCountUpBatch` variant is recommended - single rAF loop, array state for all counters. This is a stretch optimization, not blocking.

**Acceptance criterion:** Visually confirm DualWriteVsACID count-up timing and reduced-motion display unchanged via dev server after extraction.

**Migration:** `DualWriteVsACID.tsx` changes its local `useCountUp` to an import from `./useCountUp`. No behavior change.

---

## 3. Component Designs

### 3.1 `TokenEconomics.tsx` - Hero Diagram

**Registry name:** `token-economics`
**DiagramShell title:** `"Token Economics - flat retrieval 88K tokens vs MemPalace 3K tokens"`

**Data structures:**

```typescript
interface FlowStep {
  label: string;
  detail?: string;
  tone: "neutral" | "warning" | "success";
}

const LEFT_STEPS: FlowStep[] = [
  { label: "Query", tone: "neutral" },
  { label: "Load architecture.md", tone: "warning" },
  { label: "Load debug-session.jsonl", tone: "warning" },
  { label: "Load auth-notes.md", tone: "warning" },
  { label: "Parse all content", tone: "neutral" },
];

const RIGHT_STEPS: FlowStep[] = [
  { label: "Query", tone: "neutral" },
  { label: "KNN cosine search", detail: "85K drawers, 119ms", tone: "neutral" },
  { label: "KG entity lookup", detail: "3ms", tone: "neutral" },
  { label: "Top-5 drawers", tone: "success" },
];
```

**Layout - Hybrid Flow + Bar Payoff:**

**Top half - two side-by-side flow columns:**

Left column (red tones - "flat retrieval"): steps from `LEFT_STEPS`.
Right column (green tones - "MemPalace"): steps from `RIGHT_STEPS`.

Each step uses the `StepBox` pattern from DualWriteVsACID (rounded box with label + detail line, tone-colored per mode).

**Divider:** Horizontal line that draws from left to right (framer-motion `scaleX` from 0 to 1, origin left). "Result" label fades in centered above.

**Bottom half - two AnimatedBar instances:**
- Red bar: value=88000, maxValue=88000 (full width), color red gradient, countUp, subLabel "0.9% signal-to-noise" (static text, not count-up animated). Warning triangle icon prefix in expanded mode.
- Green bar: value=3000, maxValue=88000 (3.4% proportional width, minWidth=60px), color green/cyan gradient, countUp, subLabel "93% signal-to-noise" (static text, not count-up animated). Checkmark icon prefix in expanded mode.

Sub-labels rendered at regular contrast (not muted) to serve as secondary visual channel beyond color for colorblind differentiation.

**Phase coordination:**

Phase transitions use framer-motion `transition.delay` on variants for simple delays, and `setTimeout` + local state booleans for phase gates (matching DualWriteVsACID pattern).

Timing constants computed from primitives:
```
const STAGGER_MS = 120;
const SPRING_SETTLE_MS = 300;
const PHASE_1_MS = Math.max(LEFT_STEPS.length, RIGHT_STEPS.length) * STAGGER_MS + SPRING_SETTLE_MS;
```

**Three-phase choreography:**
- Phase 1 (0.0s): Both flow columns stagger in simultaneously. Spring entrance, left column at `delayChildren: 0.15s`, right column at `delayChildren: 0.55s` (halves concurrent spring calculations). ~0.8s total.
- Phase 2 (~0.8s): Divider line draws across. "Result" label fades in. ~0.4s.
- Phase 3 (~1.2s): Bars grow from left with easeOut. Count-up numbers tick simultaneously. ~1.5s.
- Total entrance: ~2.7s.

**Expanded mode:** Columns render side-by-side (`flex-col sm:flex-row`). Inline mode: always stacked (`flex-col`).

### 3.2 `ContextWindowScale.tsx` - Thesis Diagram

**Registry name:** `context-window-scale`
**DiagramShell title:** `"Context Window Scale - model context vs retrieval cost"`

**Data structures:**

```typescript
interface ModelBar {
  model: string;
  value: number;
  color: string | { from: string; to: string };
  minWidth?: number;
}

const MODEL_BARS: ModelBar[] = [
  { model: "Opus 4.6", value: 1_000_000, color: "#533483" },
  { model: "Sonnet 4.6", value: 200_000, color: "#533483" },
  { model: "GPT-4 Turbo", value: 128_000, color: "#0f3460" },
  { model: "Llama 3.1 70B", value: 128_000, color: "#0f3460" },
  { model: "Llama 3.2 8B Q4", value: 32_000, color: "#0f3460", minWidth: 32 },
  { model: "7B 4-bit laptop", value: 8_000, color: "#660000", minWidth: 24 },
];

const MAX_VALUE = 1_000_000;
```

**Layout - Stacked horizontal bars:**

6 model bars, each an `AnimatedBar` with count-up:

| Model | Value | maxValue | Color | minWidth | Note |
|---|---|---|---|---|---|
| Opus 4.6 | 1,000,000 | 1,000,000 | `"#533483"` (solid) | - | Full width |
| Sonnet 4.6 | 200,000 | 1,000,000 | `"#533483"` (solid) | - | 20% |
| GPT-4 Turbo | 128,000 | 1,000,000 | `"#0f3460"` (solid) | - | 12.8% |
| Llama 3.1 70B | 128,000 | 1,000,000 | `"#0f3460"` (solid) | - | 12.8% |
| Llama 3.2 8B Q4 | 32,000 | 1,000,000 | `"#0f3460"` (solid) | 32px | 3.2% |
| 7B 4-bit laptop | 8,000 | 1,000,000 | `"#660000"` (solid) | 24px | 0.8% |

Each bar has a left-aligned model name label (fixed width) and right-aligned token count inside the bar.

**Separator:** Horizontal line draws across after model bars finish. Thin, subtle.

**MemPalace bar:** One more `AnimatedBar` below the separator.
- value=3500 (midpoint of 2-5K range), maxValue=1,000,000
- Color: `{ from: "#52e3c8", to: "#34d399" }` (gradient) with glow via `onAnimationComplete` or `filter: drop-shadow`. Tailwind: `shadow-[0_0_8px_rgba(82,227,200,0.33)]`
- Label: "2-5K" (not count-up - it's a range)
- Right label: "constant regardless of model"
- `minWidth: 18px` (ensures visibility at the tiny proportional width)
- Checkmark icon prefix in expanded mode

**Colorblind differentiation:** Model bars include warning triangle icon prefix on the "7B 4-bit laptop" bar (worst-case) in expanded mode. MemPalace bar gets checkmark icon prefix.

**Reduced-motion verification:** In reduced-motion mode, verify divider/separator elements have sufficient visual weight, verdict text is visually prominent, MemPalace bar glow distinguishes it from model bars.

**Phase coordination:**

```
const STAGGER_MS = 100;
const PHASE_1_MS = MODEL_BARS.length * STAGGER_MS + SPRING_SETTLE_MS;
```

Phase 2 separator draw triggered via `setTimeout` + local `showSeparator` boolean, gated by `animate && expanded`. Cleanup cancels timeout.

**Choreography:**
- Phase 1: Bars stagger top-to-bottom, 0.1s delay each. `growDuration: 0.5` (shorter than default to keep pace with 6 bars). ~1.3s for all 6 model bars including spring settle.
- Phase 2: Separator draws across. ~0.3s.
- Phase 3: MemPalace bar enters last with a slight spring bounce (higher stiffness than default). ~0.4s.
- Total: ~2.0s.

### 3.3 `LatencyTax.tsx` - Tradeoff Diagram

**Registry name:** `latency-tax`
**DiagramShell title:** `"The Latency Tax - speed vs correctness"`

**Data structures:**

```typescript
interface LatencyBar {
  label: string;
  value: number;
  badge: "faster" | "slower";
  subLabel: string;
}

const LATENCY_BARS: LatencyBar[] = [
  { label: "HNSW", value: 80, badge: "faster", subLabel: "(approximate)" },
  { label: "sqlite-vec", value: 119, badge: "slower", subLabel: "(exact)" },
];

const MAX_LATENCY = 119;
```

**Layout - two sections + verdict:**

**Section 1: "Query Latency (lower is better)"**

Section header: small uppercase mono text, like the existing diagram headers.

Two `AnimatedBar` instances with proportional widths:
- HNSW: value=80, maxValue=119 (67% width), red color, countUp, subLabel "(approximate)". "faster" badge annotation on the bar. Warning triangle icon prefix in expanded mode.
- sqlite-vec: value=119, maxValue=119 (full width), green/cyan color, countUp, subLabel "(exact)". "slower" badge annotation on the bar. Checkmark icon prefix in expanded mode.

Badge annotations ("faster" / "slower") provide a secondary visual cue beyond the inverted bar semantics, reinforcing which direction is "good" without relying solely on the section header.

Sub-labels rendered at regular contrast (not muted) for colorblind accessibility.

The shorter red bar is the faster query (80ms < 119ms). The section header "lower is better" disambiguates that shorter = faster = the expected winner. But the hit rate section below delivers the punchline: speed means nothing at 40% accuracy.

**Section 2: "Hit Rate"**

NOT bars. Two large number displays side-by-side, separated by a thin vertical divider:
- Left: `useCountUp(40, 1.2, active)` rendered in large (28px expanded / 24px inline) red bold text. Sub-lines: "HNSW at 100K+" and "17.2% data loss" in smaller text at regular contrast.
- Right: `useCountUp(100, 1.2, active)` rendered in large green/cyan bold text. Sub-lines: "sqlite-vec" and "zero divergence".

Sub-label percentages (17.2%) are static text, not count-up animated.

**Verdict line:** Centered bold text: "+39ms per query buys 100% correctness"

**Footnote:** Moved to blog post markdown, placed immediately below the `animated-diagram` code fence (see S4.2). The LatencyTax component ends at the verdict line. If the footnote must visually attach in expanded mode, pass it as `footer` content to DiagramShell.

**Phase coordination:**

Phase 2 active state managed by local `showHitRate` boolean, toggled via `setTimeout(fn, PHASE_1_MS)` inside useEffect gated by `animate && expanded`. Cleanup cancels timeout.

```
const PHASE_1_MS = LATENCY_BARS.length * STAGGER_MS + GROW_DURATION_MS + SPRING_SETTLE_MS;
```

**Choreography:**
- Phase 1 (0.0s): Both latency bars stagger in + grow. ~0.8s.
- Phase 2 (~1.0s): Hit rate numbers count up simultaneously. ~1.2s.
- Phase 3 (~2.2s): Verdict line fades in. ~0.5s.
- Total: ~2.7s.

---

## 4. Registry & Blog Integration

### 4.1 DiagramRegistry.tsx

Add three new lazy imports following the existing pattern:

```typescript
const TokenEconomics = lazy(() =>
  import("./TokenEconomics").then((m) => ({ default: m.TokenEconomics }))
);
const ContextWindowScale = lazy(() =>
  import("./ContextWindowScale").then((m) => ({ default: m.ContextWindowScale }))
);
const LatencyTax = lazy(() =>
  import("./LatencyTax").then((m) => ({ default: m.LatencyTax }))
);
```

Add to registry object:

```typescript
"token-economics": TokenEconomics,
"context-window-scale": ContextWindowScale,
"latency-tax": LatencyTax,
```

### 4.2 Blog Post Wiring

**Draft source:** `TechnicalBlog/content/blog/drafts/2026-05-18-mempalace-retrieval-economics.md`

Create signal-noise version of the follow-up post at:
`src/pages/content/blog/mempalace-retrieval-economics.md`

Replace the three `<!-- DIAGRAM: ... -->` comment placeholders from the draft with:

````markdown
```animated-diagram
token-economics
```

```animated-diagram
latency-tax
```

HNSW uses approximate graph traversal - faster per query but the C++ background thread diverges from SQLite metadata at scale. sqlite-vec uses brute-force cosine scan within a single SQLite transaction. The 39ms tax is the cost of ACID guarantees: both the metadata row and vector embedding commit together, or neither does.

```animated-diagram
context-window-scale
```
````

Placement matches the draft: token-economics after "Before the Palace", latency-tax after "The Token Math" (footnote paragraph placed as prose immediately below the latency-tax fence), context-window-scale after "The 128K Squeeze".

---

## 5. File Inventory

| File | Action | Lines (est.) |
|---|---|---|
| `diagrams/types.ts` | Create - extract `Mode` type + `useDiagramMode` hook | ~15 |
| `diagrams/AnimatedBar.tsx` | Create - pure structural primitive, no mode awareness. Props: `color` (`string \| { from, to }`), `labelColor`, `subLabelColor`, `ariaLabel` (required), `growDuration`. No `mode` prop. | ~100 |
| `diagrams/useCountUp.ts` | Create (extract from DualWriteVsACID) - `runningRef` guard added | ~25 |
| `diagrams/TokenEconomics.tsx` | Create | ~220 |
| `diagrams/ContextWindowScale.tsx` | Create | ~170 |
| `diagrams/LatencyTax.tsx` | Create - component ends at verdict line, footnote in markdown | ~160 |
| `diagrams/DiagramRegistry.tsx` | Edit - add 3 entries | +12 |
| `diagrams/DualWriteVsACID.tsx` | Edit - import useCountUp | -16, +1 |
| `blog/mempalace-retrieval-economics.md` | Create - signal-noise version | ~100 |

Total new code: ~690 lines across 6 new files.
Total edits: 2 existing files (DiagramRegistry, DualWriteVsACID).

No new dependencies. framer-motion and lucide-react already installed.

---

## 6. Color Mode Reference

All three components implement the triple-mode pattern from DualWriteVsACID:

| Element | Inline | Expanded | Reading |
|---|---|---|---|
| Background | cream (`#f4f2f1`) | Night City (`#131620`) | white |
| Red/error | `text-red-700`, `bg-red-50` | `text-red-400`, `bg-red-950/40` | `text-red-800`, `bg-red-50` |
| Green/success | `text-green-700`, `bg-green-50` | `text-green-400`, `bg-green-950/40` | `text-green-900`, `bg-green-50` |
| Neutral | `text-[#2d2520]`, `bg-[#f4f2f1]` | `text-foreground/80`, `bg-[#1a2038]` | `text-[#2d2520]`, `bg-white` |
| Muted text | `text-[#67594c]/60` | `text-foreground/60` | `text-gray-500` |
| Dividers | `bg-[#67594c]/40` | `bg-foreground/30` | `bg-gray-300` |

Purple (model bars in ContextWindowScale):
- Inline: `bg-purple-100`, `border-purple-400`, `text-purple-800`
- Expanded: `bg-purple-950/30`, `border-purple-500/50`, `text-purple-400`
- Reading: `bg-purple-50`, `border-purple-500`, `text-purple-900`

Blue (local model bars in ContextWindowScale):
- Inline: `bg-blue-50`, `border-blue-400`, `text-blue-800`
- Expanded: `bg-blue-950/30`, `border-blue-500/50`, `text-blue-400`
- Reading: `bg-blue-50`, `border-blue-500`, `text-blue-900`

---

## 7. Resolutions Applied in Rev 2

Ambiguous judgment calls made during Rev 2 application:

1. **M4 (color prop format):** Model bars in ContextWindowScale specified as solid strings (e.g., `"#533483"`), MemPalace bar as gradient object `{ from, to }`. The `color` prop accepts both forms - single string for solid fill, object for gradient. Data structure examples use the form matching each bar's visual intent.

2. **H2 (time unit boundary):** Public API props (`countUpDuration`, `growDuration`, `delay`) use seconds. The `useCountUp` hook signature retains `duration: number` - callers pass seconds, internal rAF logic converts to ms at the implementation boundary. In-spec choreography references to `useCountUp(40, 1.2, active)` use seconds.

3. **H3 (timing corrections):** TokenEconomics total revised from 2.5s to 2.7s (Phase 3 bar growth extended to 1.5s to accommodate count-up at default duration). ContextWindowScale Phase 1 revised from 0.7s to 1.3s (6 bars at 0.1s stagger + spring settle), total from 1.4s to 2.0s.

4. **M3 (footnote placement):** LatencyTax footnote moved to blog post markdown prose below the code fence. Added fallback note: if footnote must attach in expanded mode, pass as `footer` content to DiagramShell.

5. **H5 (stagger split):** Left column `delayChildren: 0.15s`, right column `delayChildren: 0.55s`. The 0.4s offset between columns halves peak concurrent spring count from 9 to ~5.

6. **M9 (glow timing):** Specified `onAnimationComplete` as primary approach (glow as flourish after growth), `filter: drop-shadow` as alternative. Both avoid box-shadow repaints during width animation.

7. **C2 (mode removal from AnimatedBar):** All three component designs now describe consumer-side color resolution. AnimatedBar receives pre-resolved `color`, `labelColor`, `subLabelColor` - it never queries the current mode.
