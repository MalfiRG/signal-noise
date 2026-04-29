// __DESIGN_COMPANION_DEV_ONLY__
// [M9, M16, F-ADV-21] Per-property allowlist with mandatory-unit length tokens and
// per-property token-count caps.

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|var\(--[a-z0-9-]+\))$/;
// Mandatory unit per spec §7.1 (drop the trailing `?` — F-ADV-21).
const LENGTH_TOKEN = '-?[0-9.]+(px|rem|em|%|vh|vw|ch)';
const SIMPLE_NUMBER_RE = /^-?[0-9.]+$/;
const FORBIDDEN = /url\(|@import|\\|<|>|\n|;/;

const lengthRe = (maxTokens: number) =>
  new RegExp(`^(${LENGTH_TOKEN})(\\s+(${LENGTH_TOKEN})){0,${maxTokens - 1}}$`);

const COLOR_PROPS = new Set(['color', 'background-color', 'border-color', 'fill', 'stroke']);

// [M16] Per-property token-count map. font-size accepts 1; padding/margin/border-width 1–4.
const LENGTH_PROP_TOKEN_MAX: Record<string, number> = {
  'padding': 4, 'margin': 4, 'border-width': 4,
  'gap': 2, 'width': 1, 'height': 1, 'top': 1, 'left': 1, 'right': 1, 'bottom': 1,
  'font-size': 1, 'letter-spacing': 1,
};
const NUMBER_PROPS = new Set(['line-height', 'font-weight', 'opacity']);

const FONT_FAMILY_RE = /^[a-zA-Z0-9 ,'"_-]+$/;
const TIME_RE = /^[0-9.]+(s|ms)$/;
const TIMING_RE = /^(var\(--ease-[a-z0-9-]+\)|cubic-bezier\([0-9.,\s-]+\)|ease|linear|ease-in|ease-out|ease-in-out)$/;
// box-shadow / border are composite — basic shape check, deferred fuller grammar to v2.
const BOX_SHADOW_RE = /^(inset\s+)?(-?[0-9.]+(px|rem)\s+){2,4}(rgb|rgba|hsl|#)/;
const BORDER_RE = /^(-?[0-9.]+(px|rem)\s+)(solid|dashed|dotted|double|none)\s+(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|var\(--[a-z0-9-]+\))$/;

export const isSafeCssValue = (property: string, value: string): boolean => {
  if (FORBIDDEN.test(value)) return false;
  if (COLOR_PROPS.has(property)) return COLOR_RE.test(value);
  if (property in LENGTH_PROP_TOKEN_MAX) return lengthRe(LENGTH_PROP_TOKEN_MAX[property]).test(value);
  if (NUMBER_PROPS.has(property)) return SIMPLE_NUMBER_RE.test(value);
  if (property === 'font-family') return FONT_FAMILY_RE.test(value);
  if (property === 'transition-duration') return TIME_RE.test(value);
  if (property === 'transition-timing-function') return TIMING_RE.test(value);
  if (property === 'box-shadow') return BOX_SHADOW_RE.test(value);
  if (property === 'border') return BORDER_RE.test(value);
  return false;
};
