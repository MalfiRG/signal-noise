// __DESIGN_COMPANION_DEV_ONLY__

import type { DesignableSpec } from '@/design-companion/types';

export const designable: Omit<DesignableSpec, 'file'> = {
  component: 'HeroSignalNoise',
  selectors: [
    '.hero-h',
    '.h-row',
    '.letter-reveal-linear',
    '.hero-glitch-entrance',
    '.hero-stamp-entrance',
    '.box-glow',
    '.btn-interactive',
    '.glitch-hover',
  ],
};
