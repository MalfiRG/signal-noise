# Retrieval Economics Animated Diagrams Implementation Plan

> Status: Rev 2 - post-adversarial-review (36 findings + 9 Socratic questions from 5 reviewers; 5 critical, 8 high, 8 medium, 6 low applied)
> Review: 5-agent adversarial team (adversarial-TL, performance, consistency, socratic, traceability)

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
| `src/features/blog/diagrams/useCountUp.ts` | Create (extract) | Count-up hook (rAF cleanup handles re-entry) |
| `src/features/blog/diagrams/useCountUp.test.ts` | Create | Unit tests for count-up behavior |
| `src/features/blog/diagrams/AnimatedBar.tsx` | Create | Proportional bar primitive with grow animation, a11y |
| `src/features/blog/diagrams/AnimatedBar.test.tsx` | Create | Unit tests for rendering, props, ARIA, clamping |
| `src/features/blog/diagrams/TokenEconomics.tsx` | Create | Hero diagram - hybrid flow + bar payoff |
| `src/features/blog/diagrams/TokenEconomics.test.tsx` | Create | Unit tests for figure role, aria-label, bar count, reduced-motion |
| `src/features/blog/diagrams/ContextWindowScale.tsx` | Create | Thesis diagram - model bars + MemPalace bar |
| `src/features/blog/diagrams/ContextWindowScale.test.tsx` | Create | Unit tests for figure role, aria-label, bar count, reduced-motion |
| `src/features/blog/diagrams/LatencyTax.tsx` | Create | Tradeoff diagram - inverted bars + hit rate labels |
| `src/features/blog/diagrams/LatencyTax.test.tsx` | Create | Unit tests for figure role, aria-label, bar count, reduced-motion |
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
    const { result } = renderHook(() => useCountUp(88000, 1.5, false));
    expect(result.current).toBe(88000);
  });

  it("returns target as initial value before first rAF tick", async () => {
    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(3000, 1.5, true));
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
    const { result } = renderHook(() => useCountUp(100, 1, true));

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
    const { unmount } = renderHook(() => useCountUp(100, 1, true));

    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/useCountUp.test.ts 2>&1 | tail -10`
Expected: FAIL - module not found

- [ ] **Step 3: Create useCountUp.ts**

```typescript
// src/features/blog/diagrams/useCountUp.ts
import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }

    const durationMs = duration * 1000;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(Math.floor(target * progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, active]);

  return value;
}
```

Note: The public API accepts `duration` in seconds (per spec H2). Internal rAF logic converts via `duration * 1000`. React's cleanup function cancels the rAF before re-entry on dependency changes - no separate re-entry guard needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/useCountUp.test.ts 2>&1 | tail -10`
Expected: All 4 tests PASS (5th added in Step 6b after migration)

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

- [ ] **Step 6b: Add migration smoke assertion**

In `useCountUp.test.ts`, add a test after the existing four:

```typescript
  it("works with DualWriteVsACID typical values (migration smoke test)", async () => {
    const { useCountUp } = await import("./useCountUp");
    const { result } = renderHook(() => useCountUp(102568, 1.5, false));
    expect(result.current).toBe(102568);
  });
```

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/useCountUp.test.ts 2>&1 | tail -10`
Expected: 5 tests PASS

- [ ] **Step 7: Visual verification - DualWriteVsACID unchanged**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npm run dev`
Navigate to `http://localhost:8080/blog/mempalace-sqlite-vec-migration`. Verify:
- Count-up numbers still animate from 0 to 102,568 / 84,965 (broken side) and 85,033 / 85,033 (fixed side)
- In expanded mode, particle scatter animation still triggers
- Reduce motion: numbers show final values immediately (no animation)

- [ ] **Step 8: Commit**

```bash
git add src/features/blog/diagrams/useCountUp.ts src/features/blog/diagrams/useCountUp.test.ts src/features/blog/diagrams/DualWriteVsACID.tsx
git commit -m "refactor(diagrams): extract useCountUp to shared hook with seconds API"
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

  it("renders sr-only span with final value when countUp is true", () => {
    const { container } = render(<AnimatedBar {...requiredProps} countUp />);
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).not.toBeNull();
    expect(srOnly?.textContent).toContain("88,000");
  });

  it("does not render sr-only span when countUp is false", () => {
    const { container } = render(<AnimatedBar {...requiredProps} />);
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).toBeNull();
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

  it("clamps proportional width but preserves real value in aria-valuenow", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} value={200000} maxValue={100000} />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute("aria-valuenow")).toBe("200000");
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

  it("marks count-up number span as aria-hidden when countUp is true", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} countUp animate={true} />
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

Note: jsdom's IntersectionObserver mock never triggers intersection. Tests with `animate: true` verify the static (hidden) variant. Animated path verified via dev server in Task 8.

For bars narrower than label text (heuristic: `ratio < 0.15`), position label outside the bar to its right using `position: absolute; left: 100%; pl-2; whitespace-nowrap`.

```tsx
// src/features/blog/diagrams/AnimatedBar.tsx
import { motion, type Variants } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
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
  const countValue = useCountUp(value, countUpDuration, animate && !!countUp);
  const [glowing, setGlowing] = useState(!animate);

  useEffect(() => {
    if (animate) setGlowing(false);
  }, [animate]);

  if (maxValue <= 0) return null;

  const ratio = Math.min(value / maxValue, 1);
  const widthPercent = `${ratio * 100}%`;
  const bg =
    typeof color === "string"
      ? color
      : `linear-gradient(90deg, ${color.from}, ${color.to})`;

  const barVariants: Variants = useMemo(() => animate
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
      }, [animate, widthPercent, growDuration, delay]);

  const barStyle = useMemo(() => ({
    height,
    background: bg,
    minWidth: minWidth ? `${minWidth}px` : undefined,
  }), [height, bg, minWidth]);

  const handleAnimationComplete = useCallback(() => setGlowing(true), []);

  const labelOutside = ratio < 0.15;
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
        {countUp && (
          <span className="sr-only">{ariaLabel}: {value.toLocaleString()}</span>
        )}
        <motion.div
          variants={barVariants}
          className={`rounded ${glowing ? "shadow-[0_0_8px_rgba(82,227,200,0.33)]" : ""}`}
          style={barStyle}
          onAnimationComplete={handleAnimationComplete}
        >
          <span
            aria-hidden={countUp ? "true" : undefined}
            className={`absolute ${labelOutside ? "left-full pl-2 whitespace-nowrap" : "inset-0 flex items-center px-2"} text-xs font-mono font-medium`}
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
Expected: 10 tests PASS

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
- Create: `src/features/blog/diagrams/TokenEconomics.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/blog/diagrams/TokenEconomics.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TokenEconomics } from "./TokenEconomics";

describe("TokenEconomics", () => {
  it("renders with role=figure", () => {
    const { container } = render(<TokenEconomics expanded={false} animate={false} />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure).not.toBeNull();
  });

  it("has correct aria-label", () => {
    const { container } = render(<TokenEconomics expanded={false} animate={false} />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure?.getAttribute("aria-label")).toBe(
      "Token Economics: flat retrieval loads 88,000 tokens at 0.9% signal; MemPalace retrieval loads 3,000 tokens at 93% signal"
    );
  });

  it("renders 2 AnimatedBar children", () => {
    const { container } = render(<TokenEconomics expanded={false} animate={false} />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(2);
  });

  it("renders without error in reduced-motion mode", () => {
    expect(() => {
      const { unmount } = render(<TokenEconomics expanded={false} animate={false} />);
      unmount();
    }).not.toThrow();
  });

  it("cleans up on unmount without state-update warnings", () => {
    const { unmount } = render(<TokenEconomics expanded={false} animate={true} />);
    expect(() => unmount()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/TokenEconomics.test.tsx 2>&1 | tail -10`
Expected: FAIL - module not found

- [ ] **Step 3: Implement TokenEconomics**

Implement by consulting the spec at `docs/superpowers/specs/2026-05-19-retrieval-economics-diagrams-design.md` section S3.1. The spec contains full data structures, color maps, timing constants, and choreography details. Each component MUST be a child of a `motion.div` with `initial={animate ? "hidden" : "visible"} whileInView="visible" viewport={{ once: true, margin: "-80px" }}` to enable AnimatedBar variant propagation.

Key structural elements from spec S3.1:
- `DiagramShell` wrapper with title from spec
- Root container: `role="figure"` with `aria-label` as tested above
- Two flow columns (left/right) with `StepBox` sub-components
- Divider with `scaleX` 0->1 animation
- Two `AnimatedBar` instances (red bar value=88000, green bar value=3000, both maxValue=88000)
- Phase coordination via computed delay constants

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/TokenEconomics.test.tsx 2>&1 | tail -10`
Expected: 5 tests PASS

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/features/blog/diagrams/TokenEconomics.tsx src/features/blog/diagrams/TokenEconomics.test.tsx
git commit -m "feat(diagrams): add TokenEconomics hybrid flow + bar diagram"
```

---

### Task 4: Create ContextWindowScale Diagram

**Files:**
- Create: `src/features/blog/diagrams/ContextWindowScale.tsx`
- Create: `src/features/blog/diagrams/ContextWindowScale.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/blog/diagrams/ContextWindowScale.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ContextWindowScale } from "./ContextWindowScale";

describe("ContextWindowScale", () => {
  it("renders with role=figure", () => {
    const { container } = render(<ContextWindowScale expanded={false} animate={false} />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure).not.toBeNull();
  });

  it("has correct aria-label", () => {
    const { container } = render(<ContextWindowScale expanded={false} animate={false} />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure?.getAttribute("aria-label")).toBe(
      "Context Window Scale: model context windows range from 1M (Opus) to 8K (7B laptop), while MemPalace retrieval costs 2-5K tokens regardless of model"
    );
  });

  it("renders 7 AnimatedBar children (6 models + MemPalace)", () => {
    const { container } = render(<ContextWindowScale expanded={false} animate={false} />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(7);
  });

  it("renders without error in reduced-motion mode", () => {
    expect(() => {
      const { unmount } = render(<ContextWindowScale expanded={false} animate={false} />);
      unmount();
    }).not.toThrow();
  });

  it("cleans up on unmount without state-update warnings", () => {
    const { unmount } = render(<ContextWindowScale expanded={false} animate={true} />);
    expect(() => unmount()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/ContextWindowScale.test.tsx 2>&1 | tail -10`
Expected: FAIL - module not found

- [ ] **Step 3: Implement ContextWindowScale**

Implement by consulting the spec at `docs/superpowers/specs/2026-05-19-retrieval-economics-diagrams-design.md` section S3.2. The spec contains full data structures, color maps, timing constants, and choreography details. Each component MUST be a child of a `motion.div` with `initial={animate ? "hidden" : "visible"} whileInView="visible" viewport={{ once: true, margin: "-80px" }}` to enable AnimatedBar variant propagation.

Key structural elements from spec S3.2:
- `DiagramShell` wrapper with title from spec
- Root container: `role="figure"` with `aria-label` as tested above
- 6 model bars (`AnimatedBar` with `growDuration=0.5`, `countUp`, staggered delays)
- Separator triggered via `setTimeout` + local `showSeparator` boolean gated by `animate`, with cleanup. NOT via `transition.delay`.
- MemPalace bar: `value=3500, maxValue=1_000_000, label="2-5K"` (no countUp), gradient color, `minWidth=18`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/ContextWindowScale.test.tsx 2>&1 | tail -10`
Expected: 5 tests PASS

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/features/blog/diagrams/ContextWindowScale.tsx src/features/blog/diagrams/ContextWindowScale.test.tsx
git commit -m "feat(diagrams): add ContextWindowScale model bars + MemPalace comparison"
```

---

### Task 5: Create LatencyTax Diagram

**Files:**
- Create: `src/features/blog/diagrams/LatencyTax.tsx`
- Create: `src/features/blog/diagrams/LatencyTax.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/blog/diagrams/LatencyTax.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LatencyTax } from "./LatencyTax";

describe("LatencyTax", () => {
  it("renders with role=figure", () => {
    const { container } = render(<LatencyTax expanded={false} animate={false} />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure).not.toBeNull();
  });

  it("has correct aria-label", () => {
    const { container } = render(<LatencyTax expanded={false} animate={false} />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure?.getAttribute("aria-label")).toBe(
      "The Latency Tax: HNSW queries at 80ms with 40% hit rate vs sqlite-vec at 119ms with 100% hit rate. 39ms buys 100% correctness"
    );
  });

  it("renders 2 AnimatedBar children (HNSW + sqlite-vec)", () => {
    const { container } = render(<LatencyTax expanded={false} animate={false} />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(2);
  });

  it("renders without error in reduced-motion mode", () => {
    expect(() => {
      const { unmount } = render(<LatencyTax expanded={false} animate={false} />);
      unmount();
    }).not.toThrow();
  });

  it("cleans up on unmount without state-update warnings", () => {
    const { unmount } = render(<LatencyTax expanded={false} animate={true} />);
    expect(() => unmount()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/LatencyTax.test.tsx 2>&1 | tail -10`
Expected: FAIL - module not found

- [ ] **Step 3: Implement LatencyTax**

Implement by consulting the spec at `docs/superpowers/specs/2026-05-19-retrieval-economics-diagrams-design.md` section S3.3. The spec contains full data structures, color maps, timing constants, and choreography details. Each component MUST be a child of a `motion.div` with `initial={animate ? "hidden" : "visible"} whileInView="visible" viewport={{ once: true, margin: "-80px" }}` to enable AnimatedBar variant propagation.

DiagramShell has no `footer` prop - the footnote is exclusively in blog markdown. The spec's fallback ("pass as footer content") is out of scope. Component ends at the verdict line, period.

Key structural elements from spec S3.3:
- `DiagramShell` wrapper with title from spec
- Root container: `role="figure"` with `aria-label` as tested above
- **Section 1 - "Query Latency (lower is better)"**: Two `AnimatedBar` instances (HNSW value=80, sqlite-vec value=119, maxValue=119)
- **Section 2 - "Hit Rate"**: Phase-2 `setTimeout` fires in both inline and expanded modes when animation is enabled (gate is `animate`, not `animate && expanded`). In reduced-motion mode (animate=false), hit-rate numbers show final values immediately. `showHitRate` local state, toggled via `setTimeout(fn, PHASE_1_MS)` in useEffect gated by `animate`. Cleanup cancels timeout.
  - Left: `useCountUp(40, 1.2, showHitRate)` in red. Right: `useCountUp(100, 1.2, showHitRate)` in green.
  - Count-up numbers: `aria-hidden="true"` with sr-only spans for final values
- **Verdict**: `motion.div` with fade-in, delayed past Phase 2

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx vitest run src/features/blog/diagrams/LatencyTax.test.tsx 2>&1 | tail -10`
Expected: 5 tests PASS

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/features/blog/diagrams/LatencyTax.tsx src/features/blog/diagrams/LatencyTax.test.tsx
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

After copying the draft, update the frontmatter to match data.ts: change `category` to `AI & Automation`, change `tags` to `["AI", "vector-databases", "sqlite-vec", "MemPalace", "local-AI", "token-economics"]`.

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

- [ ] **Step 2b: Verify registry keys match blog post diagram names**

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && grep -A1 'animated-diagram' src/pages/content/blog/mempalace-retrieval-economics.md | grep -E '^[a-z-]+$'`

Expected output: `token-economics`, `context-window-scale`, `latency-tax`. Confirm each name exists as a key in `DiagramRegistry`'s registry object from Task 6.

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

Run: `cd /home/malfirg/programming_projects/MetaOrchestrator/TechnicalBlog/technical-blog/signal-noise && npm run build 2>&1 | grep -E '\.js\s' | head -15`
Expected: Build succeeds. Check that no individual diagram chunk exceeds ~15KB gzipped (shown in Vite build output gzip column). Shared diagram chunk growth is incremental (~2-3KB).

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

---

## Resolutions Applied in Rev 2

| ID | Finding | Resolution |
|----|---------|------------|
| C1 | useCountUp test durations use ms, API expects seconds | Changed all 4 test call sites: 1500->1.5, 1000->1 |
| C2 | AnimatedBar conditional return before hooks (Rules of Hooks violation) | Moved `if (maxValue <= 0) return null` after useCountUp and useState calls |
| C3 | Tasks 3-5 have no test files (TDD claim violation) | Added test files with 5 assertions each: role=figure, aria-label, meter count, reduced-motion, unmount cleanup |
| H1 | runningRef guard is dead code | Removed runningRef; React cleanup cancels rAF before re-entry |
| H2 | Tasks 3-5 bullet pseudocode not implementable | Replaced with spec-reference approach pointing to S3.1/S3.2/S3.3 with key structural elements |
| H3 | Label overflow on narrow bars | Added ratio < 0.15 heuristic; label positioned outside bar to the right |
| H4 | Frontmatter tags/category mismatch between data.ts and draft | Added explicit frontmatter reconciliation substep in Task 7 Step 2 |
| H5 | DiagramShell footer prop does not exist | Added note in Task 5: component ends at verdict line, footnote is blog markdown only |
| H6 | DualWriteVsACID migration smoke test gap | Added Step 6b with `useCountUp(102568, 1.5, false)` assertion. Brief stated `active=true` in call but `active=false` in assertion text - used `false` (reduced-motion path tests the magnitude, which is the migration risk) |
| H7 | AnimatedBar object/closure re-allocation on every countUp re-render | Added useMemo for barVariants and barStyle, useCallback for onAnimationComplete |
| H8 | Resolved by H1 (runningRef removal makes the guard test moot) | No action needed |
| M1 | LatencyTax phase-2 gate `animate && expanded` blocks inline animation | Changed gate to `animate` only; hit-rate animates in both inline and expanded modes |
| M2 | Glow useState does not track animate prop changes | Added useEffect that resets glowing to false when animate transitions to true |
| M3 | Clamping test asserts nothing about actual clamping | Added `aria-valuenow="200000"` assertion (real value preserved; visual clamping not testable in jsdom) |
| M4 | Accessibility double-announcement (sr-only span always rendered) | sr-only span now renders only when countUp is true |
| M5 | AnimatedBar variant propagation parent requirement | Addressed by H2 (motion.div wrapper explicitly stated in all Tasks 3-5) |
| M6 | ContextWindowScale separator mechanism contradicted spec | Aligned Task 4 with spec: setTimeout + showSeparator boolean, not transition.delay |
| M7 | Timer cleanup tests for component-level setTimeouts | Added unmount cleanup test to each of Tasks 3-5 test files |
| M8 | Test name "before effect fires" misleading | Renamed to "before first rAF tick" |
| L1 | Bundle size verification was a no-op (vite-bundle-visualizer optional) | Replaced with `npm run build` grep for JS chunk sizes |
| L2 | Visual verification step did not name blog slug | Changed to explicit `http://localhost:8080/blog/mempalace-sqlite-vec-migration` |
| L3 | Registry key typo risk | Added Step 2b in Task 7 to verify registry keys match animated-diagram block names |
| L4 | aria-hidden test did not exercise countUp branch | Changed test to render with `animate={true}` and `countUp` |
| L5 | IntersectionObserver mock note missing | Added note to AnimatedBar Step 3 about jsdom IO limitations |
