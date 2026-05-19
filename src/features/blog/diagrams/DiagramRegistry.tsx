import { lazy, Suspense } from "react";

const PalaceStructure = lazy(() =>
  import("./PalaceStructure").then((m) => ({ default: m.PalaceStructure }))
);
const DualWriteVsACID = lazy(() =>
  import("./DualWriteVsACID").then((m) => ({ default: m.DualWriteVsACID }))
);
const KGTunnelOverlay = lazy(() =>
  import("./KGTunnelOverlay").then((m) => ({ default: m.KGTunnelOverlay }))
);
const QueryFlow = lazy(() =>
  import("./QueryFlow").then((m) => ({ default: m.QueryFlow }))
);
const TokenEconomics = lazy(() =>
  import("./TokenEconomics").then((m) => ({ default: m.TokenEconomics }))
);
const ContextWindowScale = lazy(() =>
  import("./ContextWindowScale").then((m) => ({ default: m.ContextWindowScale }))
);
const LatencyTax = lazy(() =>
  import("./LatencyTax").then((m) => ({ default: m.LatencyTax }))
);

const registry: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  "palace-structure": PalaceStructure,
  "dual-write-vs-acid": DualWriteVsACID,
  "kg-tunnel-overlay": KGTunnelOverlay,
  "query-flow": QueryFlow,
  "token-economics": TokenEconomics,
  "context-window-scale": ContextWindowScale,
  "latency-tax": LatencyTax,
};

export function AnimatedDiagram({ name }: { name: string }) {
  const Component = registry[name.trim()];
  if (!Component) {
    return (
      <div className="my-6 rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Unknown diagram: <code>{name}</code>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="my-8 flex h-48 items-center justify-center rounded-xl border border-border bg-[#0b0d12]">
          <span className="text-xs tracking-widest text-muted-foreground animate-pulse">
            Loading diagram...
          </span>
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}
