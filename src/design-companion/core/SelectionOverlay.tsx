// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';

export interface SelectionOverlayProps {
  children: React.ReactNode;
  onSelect: (id: string | null) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ children, onSelect }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onSelect(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelect]);
  const handle = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-design-id]') as HTMLElement | null;
    if (!target) return;
    e.preventDefault();
    onSelect(target.getAttribute('data-design-id'));
  };
  return <div className="design-companion-overlay" onClick={handle}>{children}</div>;
};
