// __DESIGN_COMPANION_DEV_ONLY__

import type { DesignableSpec } from '@/design-companion/types';

export const designable: Omit<DesignableSpec, 'file'> = {
  component: 'Navbar',
  selectors: ['.text-glow', '.nav-link-motion', '.glitch-hover'],
};
