// src/design-companion/translator/LLMTranslator.ts
// __DESIGN_COMPANION_DEV_ONLY__
import type { IntentTranslator, DesignIntentEdit, TranslationOutcome } from '../types';
import { DeterministicTranslator } from './DeterministicTranslator';

// [H5] LLMTranslator wraps DeterministicTranslator and promotes any
// non-applied outcome to the third tag `'delegate'`. Consumers
// (scripts/design-apply.ts) route delegate-tagged outcomes to
// `design-intents/needs-llm/<author>/` for the user's Claude session
// to translate. The framework owns deterministic mass; the LLM owns
// the gaps. This wrapper does not invoke any LLM directly — it only
// re-tags outcomes for the script-layer router.
export class LLMTranslator implements IntentTranslator {
  constructor(private readonly determ: DeterministicTranslator) {}

  applyIntent(intent: DesignIntentEdit, source: string): TranslationOutcome {
    const r = this.determ.applyIntent(intent, source);
    if (r.kind === 'applied') return r;
    return { kind: 'delegate', reason: r.reason };
  }
}
