// __DESIGN_COMPANION_DEV_ONLY__
import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export const useInstanceId = (ref: RefObject<HTMLElement | null>): string | null => {
  const [id, setId] = useState<string | null>(null);
  useLayoutEffect(() => {
    const found = ref.current?.closest('[data-design-id]')?.getAttribute('data-design-id') ?? null;
    setId(found);
  }, [ref]);
  return id;
};
