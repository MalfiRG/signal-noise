import { lazy, Suspense } from "react";

const PalaceStructure = lazy(() =>
  import("./PalaceStructure").then((m) => ({ default: m.PalaceStructure }))
);
const DualWriteVsACID = lazy(() =>
  import("./DualWriteVsACID").then((m) => ({ default: m.DualWriteVsACID }))
);

const registry: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  "palace-structure": PalaceStructure,
  "dual-write-vs-acid": DualWriteVsACID,
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
