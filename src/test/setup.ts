import "@testing-library/jest-dom";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom has no IntersectionObserver — required by framer-motion InViewFeature
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  writable: true,
  value: { writeText: () => Promise.resolve() },
});

let __mockViewportWidth__ = 1440;

export function setMockViewportWidth(width: number): void {
  __mockViewportWidth__ = width;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => {
    const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/);
    const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);
    const reducedMotionMatch = query.match(/prefers-reduced-motion:\s*reduce/);

    let matches = false;
    if (minWidthMatch) {
      matches = __mockViewportWidth__ >= parseInt(minWidthMatch[1], 10);
    } else if (maxWidthMatch) {
      matches = __mockViewportWidth__ <= parseInt(maxWidthMatch[1], 10);
    } else if (reducedMotionMatch) {
      matches = false;
    }

    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };
  },
});
