# Retrieval Economics Animated Diagrams - Design Spec

**Date:** 2026-05-19
**Post:** "85,000 Memories, 3,000 Tokens - Why Retrieval Beats Context Every Time" (`mempalace-retrieval-economics`)
**Companion to:** Existing diagram trio from `mempalace-sqlite-vec-migration` post

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
| Architecture | Shared AnimatedBar primitive | Bars appear in all three diagrams. Future diagrams will reuse it |

---

## 2. New Shared Primitives

### 2.1 `AnimatedBar.tsx`

Reusable proportional bar with grow-from-zero animation and optional count-up label.

**Props:**

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `number` | yes | The numeric value this bar represents |
| `maxValue` | `number` | yes | The maximum value in the bar's context (determines proportional width) |
| `label` | `string` | no | Text rendered inside or beside the bar |
| `color` | `{ from: string; to: string }` | yes | Gradient start/end colors |
| `mode` | `"inline" \| "expanded" \| "reading"` | yes | Visual mode for color theming |
| `animate` | `boolean` | yes | Whether to animate (false = static render) |
| `delay` | `number` | no | Delay in seconds before bar starts growing |
| `minWidth` | `number` | no | Minimum width in px (prevents tiny bars from collapsing) |
| `countUp` | `boolean` | no | Whether to animate the value number from 0 |
| `countUpDuration` | `number` | no | Duration of count-up in ms (default: 1500) |
| `height` | `number` | no | Bar height in px (default: 20) |
| `subLabel` | `string` | no | Secondary text below or beside the bar |

**Animation:** Grows from `width: 0` to proportional width using framer-motion `animate` with `easeOut` curve, duration ~0.8s. When `countUp` is true, the numeric label counts from 0 to `value` over `countUpDuration`.

**Reduced motion:** When `animate` is false, bar renders at full width immediately. Count-up shows final value directly.

### 2.2 `useCountUp.ts`

Extracted from `DualWriteVsACID.tsx` lines 83-98. Identical behavior, standalone file.

**Signature:** `useCountUp(target: number, duration: number, active: boolean): number`

**Migration:** `DualWriteVsACID.tsx` changes its local `useCountUp` to an import from `./useCountUp`. No behavior change.

---

## 3. Component Designs

### 3.1 `TokenEconomics.tsx` - Hero Diagram

**Registry name:** `token-economics`
**DiagramShell title:** `"Token Economics - flat retrieval 88K tokens vs MemPalace 3K tokens"`

**Layout - Hybrid Flow + Bar Payoff:**

**Top half - two side-by-side flow columns:**

Left column (red tones - "flat retrieval"):
1. "Query" (neutral)
2. "Load architecture.md" (warning)
3. "Load debug-session.jsonl" (warning)
4. "Load auth-notes.md" (warning)
5. "Parse all content" (neutral)

Right column (green tones - "MemPalace"):
1. "Query" (neutral)
2. "KNN cosine search" with detail "85K drawers, 119ms" (neutral)
3. "KG entity lookup" with detail "3ms" (neutral)
4. "Top-5 drawers" (success)

Each step uses the `StepBox` pattern from DualWriteVsACID (rounded box with label + detail line, tone-colored per mode).

**Divider:** Horizontal line that draws from left to right (framer-motion `scaleX` from 0 to 1, origin left). "Result" label fades in centered above.

**Bottom half - two AnimatedBar instances:**
- Red bar: value=88000, maxValue=88000 (full width), color red gradient, countUp, subLabel "0.9% signal-to-noise"
- Green bar: value=3000, maxValue=88000 (3.4% proportional width, minWidth=60px), color green/cyan gradient, countUp, subLabel "93% signal-to-noise"

**Three-phase choreography:**
- Phase 1 (0.0s): Both flow columns stagger in simultaneously. Spring entrance, 0.12s stagger per step. ~0.8s total.
- Phase 2 (~0.8s): Divider line draws across. "Result" label fades in. ~0.4s.
- Phase 3 (~1.2s): Bars grow from left with easeOut. Count-up numbers tick simultaneously. ~1.3s.
- Total entrance: ~2.5s.

**Expanded mode:** Columns render side-by-side (`flex-row`). Inline mode: stacked (`flex-col`).

### 3.2 `ContextWindowScale.tsx` - Thesis Diagram

**Registry name:** `context-window-scale`
**DiagramShell title:** `"Context Window Scale - model context vs retrieval cost"`

**Layout - Stacked horizontal bars:**

6 model bars, each an `AnimatedBar` with count-up:

| Model | Value | maxValue | Color | Note |
|---|---|---|---|---|
| Opus 4.6 | 1,000,000 | 1,000,000 | purple (`#533483`) | Full width |
| Sonnet 4.6 | 200,000 | 1,000,000 | purple (`#533483`) | 20% |
| GPT-4 Turbo | 128,000 | 1,000,000 | blue (`#0f3460`) | 12.8% |
| Llama 3.1 70B | 128,000 | 1,000,000 | blue (`#0f3460`) | 12.8% |
| Llama 3.2 8B Q4 | 32,000 | 1,000,000 | blue (`#0f3460`) | 3.2%, minWidth |
| 7B 4-bit laptop | 8,000 | 1,000,000 | red (`#660000`) | 0.8%, minWidth |

Each bar has a left-aligned model name label (fixed width) and right-aligned token count inside the bar.

**Separator:** Horizontal line draws across after model bars finish. Thin, subtle.

**MemPalace bar:** One more `AnimatedBar` below the separator.
- value=3500 (midpoint of 2-5K range), maxValue=1,000,000
- Color: green-to-cyan gradient with `box-shadow: 0 0 8px #52e3c855` glow
- Label: "2-5K" (not count-up - it's a range)
- Right label: "constant regardless of model"
- `minWidth: 18px` (ensures visibility at the tiny proportional width)

**Choreography:**
- Bars stagger top-to-bottom, 0.1s delay each. ~0.7s for all 6 model bars.
- Separator draws across. ~0.3s.
- MemPalace bar enters last with a slight spring bounce (higher stiffness than default). ~0.4s.
- Total: ~1.4s.

### 3.3 `LatencyTax.tsx` - Tradeoff Diagram

**Registry name:** `latency-tax`
**DiagramShell title:** `"The Latency Tax - speed vs correctness"`

**Layout - two sections + verdict + footnote:**

**Section 1: "Query Latency (lower is better)"**

Section header: small uppercase mono text, like the existing diagram headers.

Two `AnimatedBar` instances with proportional widths:
- HNSW: value=80, maxValue=119 (67% width), red color, countUp, subLabel "(approximate)"
- sqlite-vec: value=119, maxValue=119 (full width), green/cyan color, countUp, subLabel "(exact)"

The shorter red bar is the faster query (80ms < 119ms). The section header "lower is better" disambiguates that shorter = faster = the expected winner. But the hit rate section below delivers the punchline: speed means nothing at 40% accuracy.

**Section 2: "Hit Rate"**

NOT bars. Two large number displays side-by-side, separated by a thin vertical divider:
- Left: `useCountUp(40, 1200, active)` rendered in large (28px expanded / 24px inline) red bold text. Sub-lines: "HNSW at 100K+" and "17.2% data loss" in smaller muted text.
- Right: `useCountUp(100, 1200, active)` rendered in large green/cyan bold text. Sub-lines: "sqlite-vec" and "zero divergence".

**Verdict line:** Centered bold text: "+39ms per query buys 100% correctness"

**Footnote:** Paragraph in muted small text explaining the architectural difference:
"HNSW uses approximate graph traversal - faster per query but the C++ background thread diverges from SQLite metadata at scale. sqlite-vec uses brute-force cosine scan within a single SQLite transaction. The 39ms tax is the cost of ACID guarantees: both the metadata row and vector embedding commit together, or neither does."

**Choreography:**
- Phase 1 (0.0s): Both latency bars stagger in + grow. ~0.8s.
- Phase 2 (~1.0s): Hit rate numbers count up simultaneously. ~1.2s.
- Phase 3 (~2.2s): Verdict line fades in. Footnote fades in slightly delayed. ~0.5s.
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

```animated-diagram
context-window-scale
```
````

Placement matches the draft: token-economics after "Before the Palace", latency-tax after "The Token Math", context-window-scale after "The 128K Squeeze".

---

## 5. File Inventory

| File | Action | Lines (est.) |
|---|---|---|
| `diagrams/AnimatedBar.tsx` | Create | ~80 |
| `diagrams/useCountUp.ts` | Create (extract) | ~20 |
| `diagrams/TokenEconomics.tsx` | Create | ~200 |
| `diagrams/ContextWindowScale.tsx` | Create | ~150 |
| `diagrams/LatencyTax.tsx` | Create | ~180 |
| `diagrams/DiagramRegistry.tsx` | Edit - add 3 entries | +12 |
| `diagrams/DualWriteVsACID.tsx` | Edit - import useCountUp | -16, +1 |
| `blog/mempalace-retrieval-economics.md` | Create - signal-noise version | ~100 |

Total new code: ~630 lines across 5 new files.
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
| Muted text | `text-[#67594c]/60` | `text-foreground/40` | `text-gray-500` |
| Dividers | `bg-[#67594c]/40` | `bg-foreground/30` | `bg-gray-300` |

Purple (model bars in ContextWindowScale):
- Inline: `bg-purple-100`, `border-purple-400`, `text-purple-800`
- Expanded: `bg-purple-950/30`, `border-purple-500/50`, `text-purple-400`
- Reading: `bg-purple-50`, `border-purple-500`, `text-purple-900`

Blue (local model bars in ContextWindowScale):
- Inline: `bg-blue-50`, `border-blue-400`, `text-blue-800`
- Expanded: `bg-blue-950/30`, `border-blue-500/50`, `text-blue-400`
- Reading: `bg-blue-50`, `border-blue-500`, `text-blue-900`
