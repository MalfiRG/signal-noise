// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';

export type PanelLayout = 'right-sidebar' | 'bottom-drawer';

const KEY = 'design-companion:panel-layout';

export const useLayoutChoice = (): [PanelLayout, (v: PanelLayout) => void] => {
  const [v, setV] = React.useState<PanelLayout>(
    () => (localStorage.getItem(KEY) as PanelLayout | null) ?? 'right-sidebar',
  );
  const set = (next: PanelLayout) => {
    setV(next);
    localStorage.setItem(KEY, next);
  };
  return [v, set];
};

export const PanelLayoutToggle: React.FC<{
  value: PanelLayout;
  onChange: (v: PanelLayout) => void;
}> = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="Panel layout">
    <button
      role="radio"
      aria-checked={value === 'right-sidebar'}
      onClick={() => onChange('right-sidebar')}
    >
      Right sidebar
    </button>
    <button
      role="radio"
      aria-checked={value === 'bottom-drawer'}
      onClick={() => onChange('bottom-drawer')}
    >
      Bottom drawer
    </button>
  </div>
);
