// __DESIGN_COMPANION_DEV_ONLY__
// [M8] Drop the `i` flag — spec literally allows lowercase only. Uppercase classes are rejected.
// eslint-disable-next-line no-useless-escape -- explicit `\[` mirrors the matching `\]` for review-symmetry; keeping verbatim per spec adversarial-review record.
const SELECTOR_RE = /^[.#a-z0-9_:\[\]=" \-,>+*~()]+$/;
export const isSafeSelector = (s: string): boolean => SELECTOR_RE.test(s);
