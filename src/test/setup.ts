import "@testing-library/jest-dom";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// framer-motion's InViewFeature instantiates IntersectionObserver on mount;
// jsdom does not implement it. Stub it so components using whileInView /
// viewport triggers render cleanly in unit tests.
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

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
