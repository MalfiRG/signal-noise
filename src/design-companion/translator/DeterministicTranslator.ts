// src/design-companion/translator/DeterministicTranslator.ts
// __DESIGN_COMPANION_DEV_ONLY__
import type { IntentTranslator, DesignIntentEdit, TranslationOutcome } from '../types';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class DeterministicTranslator implements IntentTranslator {
  applyIntent(intent: DesignIntentEdit, source: string): TranslationOutcome {
    if (intent.type === 'prop') {
      const re = new RegExp(
        `(<${escapeRegex(intent.component)}\\b[^>]*\\b${escapeRegex(intent.prop)})="${escapeRegex(intent.from)}"`,
      );
      if (!re.test(source)) {
        return { kind: 'gap', reason: 'prop literal not found' };
      }
      return { kind: 'applied', updatedSource: source.replace(re, `$1="${intent.to}"`) };
    }
    let updated = source;
    let appliedAny = false;
    for (const [k, v] of Object.entries(intent.changes)) {
      const styleObj = new RegExp(
        `(style=\\{\\{[^}]*\\b${escapeRegex(k)}\\s*:\\s*['"])[^'"]*(['"])`,
      );
      if (styleObj.test(updated)) {
        updated = updated.replace(styleObj, `$1${v}$2`);
        appliedAny = true;
      }
    }
    return appliedAny
      ? { kind: 'applied', updatedSource: updated }
      : { kind: 'gap', reason: 'no inline style block matched the recorded property' };
  }
}
