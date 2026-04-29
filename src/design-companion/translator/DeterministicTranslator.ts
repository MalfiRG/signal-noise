// src/design-companion/translator/DeterministicTranslator.ts
// __DESIGN_COMPANION_DEV_ONLY__
import type { IntentTranslator, DesignIntentEdit, TranslationOutcome } from '../types';

// Phase 0 stub — always returns `gap`. Phase 3 (Task 3.3) replaces with full implementation.
export class DeterministicTranslator implements IntentTranslator {
  applyIntent(_intent: DesignIntentEdit, _source: string): TranslationOutcome {
    return { kind: 'gap', reason: 'phase-0 stub — full impl in Task 3.3' };
  }
}
