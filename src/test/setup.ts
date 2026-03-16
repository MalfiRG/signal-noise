import "@testing-library/jest-dom";

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill navigator.clipboard for jsdom (jsdom does not implement the Clipboard API)
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
