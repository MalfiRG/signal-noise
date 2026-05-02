// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';

export interface BottomDrawerProps {
  header: React.ReactNode;
  content: React.ReactNode;
  actions: React.ReactNode;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({ header, content, actions }) => (
  <section className="design-companion-bottom-drawer" aria-label="Design panel">
    <div className="design-companion-drawer-header">{header}</div>
    <div className="design-companion-drawer-content">{content}</div>
    <div className="design-companion-drawer-actions">{actions}</div>
  </section>
);
