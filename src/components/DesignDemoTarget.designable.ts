// src/components/DesignDemoTarget.designable.ts
// __DESIGN_COMPANION_DEV_ONLY__

import type { DesignableSpec } from '@/design-companion/types';

// `file` is intentionally omitted — `discoverDesignableSpecs` populates it
// from the filesystem walk. ESM has no `__filename`; an `import.meta.url`
// + `fileURLToPath` round-trip works but adds noise per registry entry.
// Per M13: keep the spec minimal; the walker owns path resolution.
export const designable: Omit<DesignableSpec, 'file'> = {
  component: 'DesignDemoTarget',
  selectors: ['.design-demo-title', '.design-demo-subtitle'],
};
