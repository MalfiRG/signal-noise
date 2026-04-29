// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
import { useInstanceId } from './useInstanceId';

// [§Task 1.3, H6] CSS applicator handles for the 3-mechanism live-preview ladder.
// Mechanism precedence (low → high): layer-overrides < data-override < inline.
// Each applicator returns a CssApplyHandle that can revert its own change without
// touching the others — composability requirement for the editor's undo/redo.
export interface CssApplyHandle {
  selectorId: string;
  changes: Record<string, string>;
  mechanism: 'inline' | 'data-override' | 'layer-overrides';
  revert(): void;
}

export const applyInlineStyle = (el: HTMLElement, changes: Record<string, string>): CssApplyHandle => {
  const before: Record<string, string> = {};
  for (const [k, v] of Object.entries(changes)) {
    before[k] = el.style.getPropertyValue(k);
    el.style.setProperty(k, v);
  }
  return {
    selectorId: el.getAttribute('data-design-id') ?? '',
    changes, mechanism: 'inline',
    revert() { for (const [k, v] of Object.entries(before)) el.style.setProperty(k, v); },
  };
};

export const applyLayerOverrides = (selector: string, changes: Record<string, string>): CssApplyHandle => {
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-design-companion', 'ephemeral');
  const decl = Object.entries(changes).map(([k, v]) => `${k}: ${v};`).join(' ');
  styleEl.textContent = `@layer overrides { ${selector} { ${decl} } }`;
  document.head.appendChild(styleEl);
  return {
    selectorId: selector, changes, mechanism: 'layer-overrides',
    revert() { styleEl.remove(); },
  };
};

export const DesignOverridesContext = React.createContext<Map<string, Record<string, unknown>>>(new Map());

export function withDesignOverrides<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
) {
  return React.forwardRef<HTMLElement, P>(function Wrapped(props, ref) {
    // [C3] Thread an internal ref to useInstanceId. If the consumer also passed a ref,
    // merge both (mergeRefs pattern) so the wrapped component still receives its forwarded ref.
    const internalRef = React.useRef<HTMLElement | null>(null);
    const mergedRef = React.useCallback((el: HTMLElement | null) => {
      internalRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el;
    }, [ref]);
    const overrides = React.useContext(DesignOverridesContext);
    const instanceId = useInstanceId(internalRef);
    const overrideProps = (instanceId && overrides.get(instanceId)) || {};
    return <Component {...props} {...(overrideProps as P)} ref={mergedRef as never} />;
  });
}
