// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
import { isSafeCssValue } from '../plugin/security/value-allowlist';

export interface ColorControlsProps {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  palette: string[];
}

export const ColorControls: React.FC<ColorControlsProps> = ({ value, onChange, palette }) => {
  const [error, setError] = React.useState<string | null>(null);
  const apply = (color: string) => {
    if (!isSafeCssValue('color', color)) { setError('rejected: unsafe color'); return; }
    setError(null);
    onChange({ ...value, color });
  };
  return (
    <fieldset className="design-companion-color">
      <legend>Color</legend>
      <div role="list">
        {palette.map(t => (
          <button type="button" key={t} onClick={() => apply(`var(${t})`)}>{t}</button>
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
