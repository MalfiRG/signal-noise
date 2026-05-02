// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
import { isSafeCssValue } from '../plugin/security/value-allowlist';

const COLOR_PROPS = ['color', 'background-color', 'border-color'] as const;
type ColorProp = typeof COLOR_PROPS[number];
const PROP_LABEL: Record<ColorProp, string> = {
  'color': 'text',
  'background-color': 'background',
  'border-color': 'border',
};

export interface ColorControlsProps {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  palette: string[];
}

export const ColorControls: React.FC<ColorControlsProps> = ({ value, onChange, palette }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [targetProp, setTargetProp] = React.useState<ColorProp>('background-color');
  const apply = (color: string) => {
    if (!isSafeCssValue(targetProp, color)) { setError(`rejected: unsafe ${targetProp}`); return; }
    setError(null);
    onChange({ ...value, [targetProp]: color });
  };
  return (
    <fieldset className="design-companion-color">
      <legend>Color</legend>
      <div className="design-companion-color-target" role="radiogroup" aria-label="apply color to">
        {COLOR_PROPS.map(p => (
          <label key={p} className={targetProp === p ? 'is-active' : ''}>
            <input
              type="radio"
              name="dc-color-target"
              checked={targetProp === p}
              onChange={() => setTargetProp(p)}
            />
            {PROP_LABEL[p]}
          </label>
        ))}
      </div>
      <div role="list" className="design-companion-swatch-grid">
        {palette.map(t => (
          <button
            type="button"
            key={t}
            onClick={() => apply(`var(${t})`)}
            title={t}
            aria-label={t}
            className="design-companion-swatch"
            style={{ background: `var(${t})` }}
          >
            <span className="design-companion-swatch-label">{t.replace(/^--/, '')}</span>
          </button>
        ))}
      </div>
      <label>
        custom color
        <input
          aria-label="custom color"
          type="text"
          onChange={e => apply(e.target.value)}
          placeholder="#a855f7 or rgb(...)"
        />
      </label>
      {error && <div role="alert">{error}</div>}
    </fieldset>
  );
};
