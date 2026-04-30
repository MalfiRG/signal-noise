// __DESIGN_COMPANION_DEV_ONLY__
import './design-companion.css';
import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { SelectionOverlay } from './SelectionOverlay';
import { DesignOverridesContext, applyInlineStyle, applyLayerOverrides } from './LivePreviewLayer';
import { RightSidebar } from '../layout/RightSidebar';
import { BottomDrawer } from '../layout/BottomDrawer';
import { PanelLayoutToggle, useLayoutChoice } from '../layout/PanelLayoutToggle';
import { SpacingControls } from '../controls/SpacingControls';
import { ColorControls } from '../controls/ColorControls';
import { TypographyControls } from '../controls/TypographyControls';
import { MotionControls } from '../controls/MotionControls';
import { ElementHeader } from '../controls/ElementHeader';
import { saveUnsavedBuffer, clearUnsavedBuffer, installBeforeUnload } from './sessionStore';
import { TokenProvider, useToken } from './useToken';
import { adapter } from '../adapter.config';

const ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

const DesignCompanionInner: React.FC = () => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const overridesNow = React.useMemo(() => new Map<string, Record<string, unknown>>(), []);
  const deferredOverrides = React.useDeferredValue(overridesNow);
  const handlesRef = React.useRef<Array<{ revert(): void }>>([]);
  const token = useToken();
  const [layout, setLayout] = useLayoutChoice();
  const [, startTransition] = React.useTransition();
  const onSelectId = (id: string | null) => {
    startTransition(() => { setSelectedId(id); setEdits({}); });
  };

  React.useEffect(() => installBeforeUnload(() => Object.keys(edits).length > 0), [edits]);

  const onChange = (next: Record<string, string>) => {
    setEdits(next);
    if (selectedId) saveUnsavedBuffer(selectedId, next);
    handlesRef.current.forEach(h => h.revert());
    handlesRef.current = [];
    if (!selectedId) return;
    const el = document.querySelector(`[data-design-id="${selectedId}"]`) as HTMLElement | null;
    if (el) handlesRef.current.push(applyInlineStyle(el, next));
    else handlesRef.current.push(applyLayerOverrides(`[data-design-id="${selectedId}"]`, next));
  };

  const onReset = () => {
    handlesRef.current.forEach(h => h.revert()); handlesRef.current = [];
    setEdits({});
    if (selectedId) clearUnsavedBuffer(selectedId);
  };

  const onSave = async () => {
    if (!selectedId || !token) return;
    const intent = {
      session_id: `${new Date().toISOString().replace(/[-:]/g, '').slice(0,15)}-${Math.random().toString(16).slice(2,10)}`,
      project: 'blog', page: window.location.pathname,
      timestamp: new Date().toISOString(),
      panel_layout: layout, status: 'pending' as const,
      edits: [{ type: 'css' as const, component: '?', file: '?', instance_id: selectedId,
                source_hash: '00000000', selector: `[data-design-id="${selectedId}"]`, changes: edits }],
    };
    const response = await fetch('http://127.0.0.1:8081/__design/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Design-Token': token },
      body: JSON.stringify({ author: 'malfi', intent, rationale: 'Captured in design mode.' }),
    });
    if (response.ok) {
      clearUnsavedBuffer(selectedId);
    } else if (response.status === 401) {
      // Token rotated; the next render of TokenProvider refetches.
    }
  };

  const Shell = layout === 'right-sidebar' ? RightSidebar : BottomDrawer;

  return (
    <DesignOverridesContext.Provider value={deferredOverrides}>
      <div className="design-companion-shell">
        <SelectionOverlay onSelect={onSelectId}>
          <Outlet />
        </SelectionOverlay>
        <Shell
          header={<ElementHeader componentName="?" instanceId={selectedId ?? '(none)'} file="?" />}
          content={<>
            <SpacingControls value={edits} onChange={onChange} />
            <ColorControls value={edits} onChange={onChange} palette={adapter.cssVarPalette} />
            <TypographyControls value={edits} onChange={onChange} />
            <MotionControls value={edits} onChange={onChange}
              durations={adapter.motionTokens?.durations ?? []}
              easings={adapter.motionTokens?.easings ?? []} />
          </>}
          actions={<>
            <button type="button" onClick={onSave} disabled={!selectedId || !token}>
              {token ? 'Save' : 'Save (loading token…)'}
            </button>
            <button type="button" onClick={onReset}>Reset</button>
            <PanelLayoutToggle value={layout} onChange={setLayout} />
          </>}
        />
      </div>
    </DesignOverridesContext.Provider>
  );
};

export const DesignCompanion: React.FC = () => {
  if (typeof window !== 'undefined' && !ALLOWED_HOSTNAMES.has(window.location.hostname)) {
    return (
      <div role="alert" className="design-companion-error">
        Design editor refused: not loopback. Open http://localhost:8080/__design instead.
      </div>
    );
  }
  return (
    <TokenProvider>
      <DesignCompanionInner />
    </TokenProvider>
  );
};
