# Retrieval Economics Animated Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 3 animated React diagram components (TokenEconomics, ContextWindowScale, LatencyTax) plus shared AnimatedBar primitive and useCountUp extraction for the MemPalace retrieval economics blog post.

**Architecture:** Each component wraps in `DiagramShell` render prop, implements three color modes (inline/expanded/reading) via consumer-side resolution, and uses framer-motion spring animations with `whileInView` scroll trigger. AnimatedBar is a pure structural primitive (no mode awareness). Phase coordination uses computed delay constants from primitives (stagger * step count + settle), matching DualWriteVsACID pattern.

**Tech Stack:** React 19, Framer Motion 12, Tailwind, Vitest 4.1.5, @testing-library/react 16, lucide-react

**Spec:** `docs/superpowers/specs/2026-05-19-retrieval-economics-diagrams-design.md` (Rev 2)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/blog/diagrams/types.ts` | Create | Shared `Mode` type + `useDiagramMode` hook |
| `src/features/blog/diagrams/useCountUp.ts` | Create (extract) | Count-up hook with runningRef guard |
| `src/features/blog/diagrams/useCountUp.test.ts` | Create | Unit tests for count-up behavior |
| `src/features/blog/diagrams/AnimatedBar.tsx` | Create | Proportional bar primitive with grow animation, a11y |
| `src/features/blog/diagrams/AnimatedBar.test.tsx` | Create | Unit tests for rendering, props, ARIA, clamping |
| `src/features/blog/diagrams/TokenEconomics.tsx` | Create | Hero diagram - hybrid flow + bar payoff |
| `src/features/blog/diagrams/ContextWindowScale.tsx` | Create | Thesis diagram - model bars + MemPalace bar |
| `src/features/blog/diagrams/LatencyTax.tsx` | Create | Tradeoff diagram - inverted bars + hit rate labels |
| `src/features/blog/diagrams/DiagramRegistry.tsx` | Modify | Add 3 lazy imports + registry entries |
| `src/features/blog/diagrams/DualWriteVsACID.tsx` | Modify | Import useCountUp from shared file |
| `src/features/blog/data.ts` | Modify | Add blog post entry |
| `src/pages/content/blog/mempalace-retrieval-economics.md` | Create | Signal-noise blog post with animated-diagram blocks |

---

### Task 0: Extract Shared Types

**Files:**
- Create: `src/features/blog/diagrams/types.ts`

- [ ] **Step 1: Create types.ts with Mode type and useDiagramMode hook**

```typescript
// src/features/blog/diagrams/types.ts
import { useReadingMode } from "./useReadingMode";

export type Mode = "inline" | "expanded" | "reading";

export function useDiagramMode(expanded: boolean): Mode {
  const isReadingMode = useReadingMode();
  if (expanded) return "expanded";
  return isReadingMode ? "reading" : "inline";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors related to `types.ts`

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/diagrams/types.ts
git commit -m "feat(diagrams): extract shared Mode type and useDiagramMode hook"
```

---

### Task 1: Extract useCountUp Hook

**Files:**
- Create: `src/features/blog/diagrams/useCountUp.ts`
- Create: `src/features/blog/diagrams/useCountUp.test.ts`
- Modify: `src/features/blog/diagrams/DualWriteVsACID.tsx:83-98` (remove local hook, add import)

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/blog/diagrams/useCountUp.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useCountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns target immediately when active is false (reduced motion)", async () => {
    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(88000, 1500, false));
    expect(result.current).toBe(88000);
  });

  it("returns target as initial value before effect fires", async () => {
    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(3000, 1500, true));
    expect(result.current).toBe(3000);
  });

  it("counts up from 0 to target when active", async () => {
    let rafCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(100, 1000, true));

    if (rafCallback) {
      act(() => {
        (rafCallback as FrameRequestCallback)(performance.now() + 500);
      });
      expect(result.current).toBe(50);
    }
  });

  it("cleans up rAF on unmount", async () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);

    const { useCountUp } = await import("./useCountUp");
    const { unmount } = renderHook(() => useCountUp(100, 1000, true));

    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/useCountUp.test.ts 2>&1 | tail -10`
Expected: FAIL - module not found

- [ ] **Step 3: Create useCountUp.ts with runningRef guard**

```typescript
// src/features/blog/diagrams/useCountUp.ts
import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration: number, active: boolean) {
  // useState(target) is load-bearing: active=false shows final value immediately (reduced motion)
  const [value, setValue] = useState(target);
  const rafRef = useRef(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setValue(target);
      runningRef.current = false;
      return;
    }
    if (runningRef.current) return;
    runningRef.current = true;

    const durationMs = duration * 1000;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(Math.floor(target * progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [target, duration, active]);

  return value;
}
```

Note: The public API accepts `duration` in seconds (per spec H2). Internal rAF logic converts via `duration * 1000`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/useCountUp.test.ts 2>&1 | tail -10`
Expected: 4 tests PASS

- [ ] **Step 5: Migrate DualWriteVsACID to use shared hook**

In `src/features/blog/diagrams/DualWriteVsACID.tsx`:

Remove lines 83-98 (the local `useCountUp` function).

Add import at top:
```typescript
import { useCountUp } from "./useCountUp";
```

Update the two call sites (lines ~168-169 in `SidePanel`). The existing calls use ms directly:
```typescript
// BEFORE (ms):
const rowCount = useCountUp(rows, 1500, anim && showCounter);
const vecCount = useCountUp(vectors, 1500, anim && showCounter);

// AFTER (seconds - new API):
const rowCount = useCountUp(rows, 1.5, anim && showCounter);
const vecCount = useCountUp(vectors, 1.5, anim && showCounter);
```

- [ ] **Step 6: Verify DualWriteVsACID still compiles and existing tests pass**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run 2>&1 | tail -10`
Expected: All existing tests pass

- [ ] **Step 7: Visual verification - DualWriteVsACID unchanged**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npm run dev`
Navigate to the existing blog post with DualWriteVsACID diagram. Verify:
- Count-up numbers still animate from 0 to 102,568 / 84,965 (broken side) and 85,033 / 85,033 (fixed side)
- In expanded mode, particle scatter animation still triggers
- Reduce motion: numbers show final values immediately (no animation)

- [ ] **Step 8: Commit**

```bash
git add src/features/blog/diagrams/useCountUp.ts src/features/blog/diagrams/useCountUp.test.ts src/features/blog/diagrams/DualWriteVsACID.tsx
git commit -m "refactor(diagrams): extract useCountUp to shared hook with runningRef guard"
```

---

### Task 2: Create AnimatedBar Primitive

**Files:**
- Create: `src/features/blog/diagrams/AnimatedBar.tsx`
- Create: `src/features/blog/diagrams/AnimatedBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/blog/diagrams/AnimatedBar.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AnimatedBar } from "./AnimatedBar";

const requiredProps = {
  value: 88000,
  maxValue: 100000,
  color: "#ff4444",
  labelColor: "#fff",
  subLabelColor: "#aaa",
  ariaLabel: "Flat retrieval: 88,000 tokens",
  animate: false,
};

describe("AnimatedBar", () => {
  it("renders with role=meter and correct ARIA attributes", () => {
    const { container } = render(<AnimatedBar {...requiredProps} />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute("aria-valuenow")).toBe("88000");
    expect(meter?.getAttribute("aria-valuemin")).toBe("0");
    expect(meter?.getAttribute("aria-valuemax")).toBe("100000");
  });

  it("renders sr-only span with final value", () => {
    const { container } = render(<AnimatedBar {...requiredProps} />);
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).not.toBeNull();
    expect(srOnly?.textContent).toContain("88,000");
  });

  it("displays label verbatim when provided (highest priority)", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} label="2-5K" countUp />
    );
    expect(container.textContent).toContain("2-5K");
  });

  it("displays formatted value when no label and no countUp", () => {
    const { container } = render(<AnimatedBar {...requiredProps} />);
    expect(container.textContent).toContain("88,000");
  });

  it("does not render when maxValue <= 0", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} maxValue={0} />
    );
    expect(container.querySelector('[role="meter"]')).toBeNull();
  });

  it("clamps proportional width to 100% when value > maxValue", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} value={200000} maxValue={100000} />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
  });

  it("renders subLabel below the bar", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} subLabel="0.9% signal-to-noise" />
    );
    expect(container.textContent).toContain("0.9% signal-to-noise");
  });

  it("applies gradient when color is an object", () => {
    const { container } = render(
      <AnimatedBar
        {...requiredProps}
        color={{ from: "#00aa44", to: "#52e3c8" }}
      />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
  });

  it("marks count-up number as aria-hidden", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} countUp animate={false} />
    );
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/AnimatedBar.test.tsx 2>&1 | tail -10`
Expected: FAIL - module not found

- [ ] **Step 3: Implement AnimatedBar**

```tsx
// src/features/blog/diagrams/AnimatedBar.tsx
import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import { useCountUp } from "./useCountUp";

interface AnimatedBarProps {
  value: number;
  maxValue: number;
  label?: string;
  color: string | { from: string; to: string };
  labelColor: string;
  subLabelColor: string;
  ariaLabel: string;
  animate: boolean;
  delay?: number;
  growDuration?: number;
  minWidth?: number;
  countUp?: boolean;
  countUpDuration?: number;
  height?: number;
  subLabel?: string;
}

export function AnimatedBar({
  value,
  maxValue,
  label,
  color,
  labelColor,
  subLabelColor,
  ariaLabel,
  animate,
  delay = 0,
  growDuration = 0.8,
  minWidth,
  countUp = false,
  countUpDuration = 1.5,
  height = 20,
  subLabel,
}: AnimatedBarProps) {
  if (maxValue <= 0) return null;

  const ratio = Math.min(value / maxValue, 1);
  const widthPercent = `${ratio * 100}%`;
  const bg =
    typeof color === "string"
      ? color
      : `linear-gradient(90deg, ${color.from}, ${color.to})`;

  const countValue = useCountUp(value, countUpDuration, animate && !!countUp);
  const [glowing, setGlowing] = useState(!animate);

  const barVariants: Variants = animate
    ? {
        hidden: { width: 0, opacity: 0 },
        visible: {
          width: widthPercent,
          opacity: 1,
          transition: { duration: growDuration, ease: "easeOut", delay },
        },
      }
    : {
        hidden: { width: widthPercent, opacity: 1 },
        visible: { width: widthPercent, opacity: 1 },
      };

  const displayText = label ?? (countUp ? countValue.toLocaleString() : value.toLocaleString());

  return (
    <div>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-label={ariaLabel}
        className="relative"
      >
        <span className="sr-only">{ariaLabel}: {value.toLocaleString()}</span>
        <motion.div
          variants={barVariants}
          className={`rounded ${glowing ? "shadow-[0_0_8px_rgba(82,227,200,0.33)]" : ""}`}
          style={{
            height,
            background: bg,
            minWidth: minWidth ? `${minWidth}px` : undefined,
          }}
          onAnimationComplete={() => setGlowing(true)}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center px-2 text-xs font-mono font-medium truncate"
            style={{ color: labelColor }}
          >
            {displayText}
          </span>
        </motion.div>
      </div>
      {subLabel && (
        <div
          className="text-[10px] font-mono mt-0.5"
          style={{ color: subLabelColor }}
        >
          {subLabel}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/AnimatedBar.test.tsx 2>&1 | tail -15`
Expected: 9 tests PASS

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/features/blog/diagrams/AnimatedBar.tsx src/features/blog/diagrams/AnimatedBar.test.tsx
git commit -m "feat(diagrams): add AnimatedBar shared primitive with a11y and clamping"
```

---

### Task 3: Create TokenEconomics Diagram

**Files:**
- Create: `src/features/blog/diagrams/TokenEconomics.tsx`

- [ ] **Step 1: Implement TokenEconomics**

Create `src/features/blog/diagrams/TokenEconomics.tsx` following the spec S3.1 exactly:

- Import `motion`, `Variants`, `useState`, `useEffect`, `useRef` from react/framer-motion
- Import `useDiagramMotion`, `DiagramShell`, `useDiagramMode` from local files
- Import `AnimatedBar` from `./AnimatedBar`
- Import `AlertTriangle`, `CheckCircle` from `lucide-react`
- Define `FlowStep` interface and `LEFT_STEPS` / `RIGHT_STEPS` const arrays per spec
- Define triple-mode `toneColors` and `headerColors` maps (same pattern as DualWriteVsACID)
- Compute timing constants: `STAGGER_MS = 120`, `SPRING_SETTLE_MS = 300`, `PHASE_1_MS = Math.max(LEFT_STEPS.length, RIGHT_STEPS.length) * STAGGER_MS + SPRING_SETTLE_MS`
- Implement `StepBox` sub-component (rounded box with label + detail, tone-colored)
- Implement `TokenEconomics` component:
  - Wraps in `DiagramShell` with title from spec
  - Root container: `role="figure"` with `aria-label="Token Economics: flat retrieval loads 88,000 tokens at 0.9% signal; MemPalace retrieval loads 3,000 tokens at 93% signal"`
  - Top half: two flow columns, left at `delayChildren: 0.15`, right at `delayChildren: 0.55`
  - Expanded layout: `flex-col sm:flex-row`
  - Divider: `motion.div` with `scaleX` 0->1 animation, `transition.delay` computed from `PHASE_1_MS / 1000`
  - Bottom half: two `AnimatedBar` instances with mode-resolved colors
  - Red bar: `value=88000, maxValue=88000, countUp, subLabel="0.9% signal-to-noise"`, `AlertTriangle` icon in expanded mode
  - Green bar: `value=3000, maxValue=88000, countUp, subLabel="93% signal-to-noise"`, `CheckCircle` icon in expanded mode, `minWidth=60`
  - Phase 3 bars delayed via `delay` prop computed from `(PHASE_1_MS + 400) / 1000`

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/diagrams/TokenEconomics.tsx
git commit -m "feat(diagrams): add TokenEconomics hybrid flow + bar diagram"
```

---

### Task 4: Create ContextWindowScale Diagram

**Files:**
- Create: `src/features/blog/diagrams/ContextWindowScale.tsx`

- [ ] **Step 1: Implement ContextWindowScale**

Create `src/features/blog/diagrams/ContextWindowScale.tsx` following the spec S3.2:

- Import same dependencies as TokenEconomics plus `CheckCircle`, `AlertTriangle` from lucide-react
- Define `ModelBar` interface and `MODEL_BARS` const array per spec (6 entries with model, value, color, optional minWidth)
- Define `MAX_VALUE = 1_000_000`
- Define triple-mode color maps for bar labels and model name text
- Compute: `STAGGER_MS = 100`, `SPRING_SETTLE_MS = 300`, `PHASE_1_MS = MODEL_BARS.length * STAGGER_MS + SPRING_SETTLE_MS`
- Implement `ContextWindowScale` component:
  - `DiagramShell` with title from spec
  - Root: `role="figure"` with `aria-label="Context Window Scale: model context windows range from 1M (Opus) to 8K (7B laptop), while MemPalace retrieval costs 2-5K tokens regardless of model"`
  - 6 model bars, each `AnimatedBar` with: `growDuration=0.5`, `countUp`, mode-resolved colors, `delay` staggered at `i * 0.1`
  - Left label for model name (fixed width via Tailwind `w-24` or similar)
  - Separator: `motion.div` with `scaleX` 0->1, delayed by `PHASE_1_MS / 1000`
  - MemPalace bar: `AnimatedBar` with `value=3500, maxValue=1_000_000, label="2-5K"` (no countUp), gradient color `{ from: "#52e3c8", to: "#34d399" }`, `minWidth=18`, `CheckCircle` icon prefix in expanded
  - MemPalace bar delayed by `(PHASE_1_MS + 300) / 1000`, glow via `onAnimationComplete`
  - Warning triangle on "7B 4-bit laptop" bar in expanded mode

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/diagrams/ContextWindowScale.tsx
git commit -m "feat(diagrams): add ContextWindowScale model bars + MemPalace comparison"
```

---

### Task 5: Create LatencyTax Diagram

**Files:**
- Create: `src/features/blog/diagrams/LatencyTax.tsx`

- [ ] **Step 1: Implement LatencyTax**

Create `src/features/blog/diagrams/LatencyTax.tsx` following the spec S3.3:

- Import dependencies + `AlertTriangle`, `CheckCircle` from lucide-react
- Import `useCountUp` directly for standalone hit rate numbers
- Define `LatencyBar` interface and `LATENCY_BARS` const array per spec
- Define `MAX_LATENCY = 119`
- Compute: `STAGGER_MS = 120`, `GROW_DURATION_MS = 800`, `SPRING_SETTLE_MS = 300`, `PHASE_1_MS = LATENCY_BARS.length * STAGGER_MS + GROW_DURATION_MS + SPRING_SETTLE_MS`
- Define triple-mode color maps
- Implement `LatencyTax` component:
  - `DiagramShell` with title from spec
  - Root: `role="figure"` with `aria-label="The Latency Tax: HNSW queries at 80ms with 40% hit rate vs sqlite-vec at 119ms with 100% hit rate. 39ms buys 100% correctness"`
  - **Section 1** - "Query Latency (lower is better)":
    - Section header: small uppercase mono text
    - Two `AnimatedBar` instances: HNSW (value=80, maxValue=119, red, countUp, "faster" badge, AlertTriangle), sqlite-vec (value=119, maxValue=119, green, countUp, "slower" badge, CheckCircle)
    - Sub-labels at regular contrast (not muted)
  - **Section 2** - "Hit Rate":
    - `showHitRate` local state, toggled via `setTimeout(fn, PHASE_1_MS)` in useEffect gated by `animate && expanded`. Cleanup cancels timeout.
    - Left: `useCountUp(40, 1.2, showHitRate)` in large red text (28px expanded / 24px inline). Sub-lines: "HNSW at 100K+", "17.2% data loss" (static text)
    - Right: `useCountUp(100, 1.2, showHitRate)` in large green text. Sub-lines: "sqlite-vec", "zero divergence"
    - Count-up numbers: `aria-hidden="true"` with sr-only spans for final values
    - Vertical divider between left and right
  - **Verdict**: `motion.div` with fade-in, delayed past Phase 2. Bold centered text: "+39ms per query buys 100% correctness"
  - Component ends at verdict line (footnote is in blog markdown per spec M3)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/blog/diagrams/LatencyTax.tsx
git commit -m "feat(diagrams): add LatencyTax tradeoff diagram with hit rate labels"
```

---

### Task 6: Registry Update + Full Test Suite

**Files:**
- Modify: `src/features/blog/diagrams/DiagramRegistry.tsx`

- [ ] **Step 1: Add three new lazy imports and registry entries**

Add to `src/features/blog/diagrams/DiagramRegistry.tsx`:

After existing lazy imports (QueryFlow), add:
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

- [ ] **Step 2: Run full test suite**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run 2>&1 | tail -15`
Expected: All tests pass (existing + new useCountUp + AnimatedBar tests)

- [ ] **Step 3: Verify TypeScript compiles with all new components**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/blog/diagrams/DiagramRegistry.tsx
git commit -m "feat(diagrams): register TokenEconomics, ContextWindowScale, LatencyTax"
```

---

### Task 7: Blog Post Wiring

**Files:**
- Create: `src/pages/content/blog/mempalace-retrieval-economics.md`
- Modify: `src/features/blog/data.ts`

- [ ] **Step 1: Add blog post entry to data.ts**

In `src/features/blog/data.ts`, add to the `blogPosts` array (after the `mempalace-sqlite-vec-migration` entry):

```typescript
{
  slug: "mempalace-retrieval-economics",
  title: "85,000 Memories, 3,000 Tokens - Why Retrieval Beats Context Every Time",
  date: "2026-05-18",
  tags: ["AI", "vector-databases", "sqlite-vec", "MemPalace", "local-AI", "token-economics"],
  category: "AI & Automation",
  excerpt:
    "I used to load 50K tokens of context to find a paragraph. Now I search 85K memories for 3K tokens. When local AI shrinks your context window to 128K, efficient retrieval stops being optional.",
  draft: true,
},
```

- [ ] **Step 2: Create signal-noise blog post with animated-diagram blocks**

Copy the draft from `TechnicalBlog/content/blog/drafts/2026-05-18-mempalace-retrieval-economics.md` to `src/pages/content/blog/mempalace-retrieval-economics.md`.

Replace the three `<!-- DIAGRAM: ... -->` comment placeholders:

After "Before the Palace" section, replace `<!-- DIAGRAM: token-economics ... -->` with:
````markdown
```animated-diagram
token-economics
```
````

After "The Token Math" section, replace `<!-- DIAGRAM: latency-tax ... -->` with:
````markdown
```animated-diagram
latency-tax
```

HNSW uses approximate graph traversal - faster per query but the C++ background thread diverges from SQLite metadata at scale. sqlite-vec uses brute-force cosine scan within a single SQLite transaction. The 39ms tax is the cost of ACID guarantees: both the metadata row and vector embedding commit together, or neither does.
````

After "The 128K Squeeze" section, replace `<!-- DIAGRAM: context-window-scale ... -->` with:
````markdown
```animated-diagram
context-window-scale
```
````

- [ ] **Step 3: Verify the post loads on dev server**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npm run dev`
Navigate to `http://localhost:8080/blog/mempalace-retrieval-economics`
Expected: Post renders with three diagram placeholders (Suspense loading states initially, then diagrams render)

- [ ] **Step 4: Commit**

```bash
git add src/features/blog/data.ts src/pages/content/blog/mempalace-retrieval-economics.md
git commit -m "feat(blog): wire retrieval economics post with animated diagram blocks"
```

---

### Task 8: Visual Verification + Bundle Check

**Files:** None (verification only)

- [ ] **Step 1: Full visual verification on dev server**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npm run dev`
Navigate to `http://localhost:8080/blog/mempalace-retrieval-economics`

Verify each diagram:

**TokenEconomics:**
- Phase 1: Flow columns stagger in (left slightly before right)
- Phase 2: Divider draws across, "Result" label appears
- Phase 3: Red bar grows to full width (88K count-up), green bar stays tiny (3K count-up)
- Expand: columns go side-by-side, icons appear (triangle on red, checkmark on green)
- Escape closes expanded view

**ContextWindowScale:**
- Bars stagger top-to-bottom (Opus full width, then decreasing)
- Separator draws after bars complete
- MemPalace bar enters last with bounce, glow appears after growth
- Count-up on all model bars, "2-5K" static label on MemPalace bar
- Expand: more horizontal room, icons visible

**LatencyTax:**
- Phase 1: Two latency bars grow (HNSW shorter at 67%, sqlite-vec full)
- Phase 2: Hit rate numbers count up (40% red, 100% green)
- Phase 3: Verdict fades in
- "faster"/"slower" badge annotations visible on bars
- Footnote prose appears in blog markdown below the diagram

- [ ] **Step 2: Reduced motion verification**

In browser console: `localStorage.setItem("signal-noise-motion-override", "off")`
Reload. Verify all three diagrams render statically with final values, no animations.
Revert: `localStorage.removeItem("signal-noise-motion-override")`

- [ ] **Step 3: Verify existing diagrams unchanged**

Navigate to `http://localhost:8080/blog/mempalace-sqlite-vec-migration`
Verify DualWriteVsACID, PalaceStructure, KGTunnelOverlay, QueryFlow all render and animate correctly.

- [ ] **Step 4: Bundle size check**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npm run build 2>&1 | tail -20`
Expected: Build succeeds. Note chunk sizes.

Run: `npx vite-bundle-visualizer 2>/dev/null` (if available)
Verify: No diagram-specific chunk exceeds ~15KB gzipped. Shared diagram chunk growth is incremental (~2-3KB).

- [ ] **Step 5: Run full test suite one final time**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run 2>&1 | tail -15`
Expected: All tests pass

---

## Dependency Graph

```
Task 0 (types.ts)
  |
  v
Task 1 (useCountUp extraction) ---> Task 2 (AnimatedBar)
                                       |
                        +--------------+--------------+
                        |              |              |
                        v              v              v
                    Task 3         Task 4         Task 5
                (TokenEconomics) (ContextWindow) (LatencyTax)
                        |              |              |
                        +--------------+--------------+
                                       |
                                       v
                                   Task 6
                              (Registry update)
                                       |
                                       v
                                   Task 7
                              (Blog post wiring)
                                       |
                                       v
                                   Task 8
                            (Visual verification)
```

Tasks 3, 4, 5 can run in parallel after Task 2 completes.
