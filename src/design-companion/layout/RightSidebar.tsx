// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
export interface RightSidebarProps {
  header: React.ReactNode; content: React.ReactNode; actions: React.ReactNode;
}
export const RightSidebar: React.FC<RightSidebarProps> = ({ header, content, actions }) => (
  <aside className="design-companion-right-sidebar" aria-label="Design panel">
    <div className="design-companion-panel-header">{header}</div>
    <div className="design-companion-panel-content">{content}</div>
    <div className="design-companion-panel-actions">{actions}</div>
  </aside>
);
