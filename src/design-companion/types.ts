// __DESIGN_COMPANION_DEV_ONLY__

export interface DesignableSpec {
  component: string;
  file: string;
  selectors: string[];
  variants?: string[];
}

export type EditType = 'css' | 'prop';

export interface CssEdit {
  type: 'css';
  component: string;
  file: string;
  instance_id: string;
  _legacy_position?: string;
  source_hash: string;
  selector: string;
  changes: Record<string, string>;
}

export interface PropEdit {
  type: 'prop';
  component: string;
  file: string;
  instance_id: string;
  _legacy_position?: string;
  source_hash: string;
  prop: string;
  from: string;
  to: string;
}

export type DesignIntentEdit = CssEdit | PropEdit;

export type IntentStatus = 'pending' | 'stale' | 'applied' | 'discarded';

export interface DesignIntentFile {
  session_id: string;
  project: string;
  page: string;
  timestamp: string;
  panel_layout: 'right-sidebar' | 'bottom-drawer';
  status: IntentStatus;
  edits: DesignIntentEdit[];
}

export interface ResolvedSource {
  file: string;
  componentName: string;
  jsxStart: { line: number; column: number };
}

export interface ProjectAdapter {
  projectName: string;
  cssVarPalette: string[];
  tailwindResolver?: (cssProperty: string, value: string) => string | null;
  motionTokens?: { durations: string[]; easings: string[] };
  fileResolver?: (instanceId: string) => Promise<ResolvedSource>;
}

// [H5] Three-tag outcome: 'applied' (deterministic success), 'gap' (unrecoverable),
// 'delegate' (LLM-eligible — translator could not handle but a Claude session might).
export type TranslationOutcome =
  | { kind: 'applied'; updatedSource: string }
  | { kind: 'gap'; reason: string }
  | { kind: 'delegate'; reason: string };

export interface IntentTranslator {
  applyIntent(intent: DesignIntentEdit, source: string): TranslationOutcome;
}
