// __DESIGN_COMPANION_DEV_ONLY__

import type { DesignableSpec } from '@/design-companion/types';

export const designable: Omit<DesignableSpec, 'file'> = {
  component: 'HowIDoItPage',
  selectors: ['.text-glow', '.font-display', '.hidden-in-reading'],
};
