// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
export interface ElementHeaderProps {
  componentName: string; instanceId: string; file: string; currentVariant?: string;
}
export const ElementHeader: React.FC<ElementHeaderProps> = ({ componentName, instanceId, file, currentVariant }) => (
  <header className="design-companion-element-header">
    <strong>{componentName}</strong>
    <code title={instanceId}>{instanceId.slice(-8)}</code>
    <small>{file}</small>
    {currentVariant && <span data-current-variant={currentVariant}>variant: {currentVariant}</span>}
  </header>
);
