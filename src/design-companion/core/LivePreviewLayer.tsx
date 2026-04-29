// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
import { useInstanceId } from './useInstanceId';

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
