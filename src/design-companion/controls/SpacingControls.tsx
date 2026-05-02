// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';

const FIELDS = ['padding', 'margin', 'gap'] as const;

export interface SpacingControlsProps {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export const SpacingControls: React.FC<SpacingControlsProps> = ({ value, onChange }) => {
  const update = (field: string, v: string) => {
    const next = { ...value };
    if (v === '') delete next[field]; else next[field] = v;
    onChange(next);
  };
  return (
    <fieldset className="design-companion-spacing">
      <legend>Spacing</legend>
      {FIELDS.map(f => (
        <label key={f}>
          {f}
          <input
            aria-label={f}
            type="text"
            value={value[f] ?? ''}
            onChange={e => update(f, e.target.value)}
            placeholder="e.g. 1.5rem"
          />
        </label>
      ))}
    </fieldset>
  );
};
