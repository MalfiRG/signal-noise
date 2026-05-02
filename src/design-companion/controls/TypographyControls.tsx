// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
const FIELDS = ['font-size', 'font-weight', 'line-height', 'letter-spacing'] as const;
export interface TypographyControlsProps {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}
export const TypographyControls: React.FC<TypographyControlsProps> = ({ value, onChange }) => (
  <fieldset className="design-companion-type">
    <legend>Typography</legend>
    {FIELDS.map(f => (
      <label key={f}>
        {f}
        <input
          aria-label={f}
          type="text"
          value={value[f] ?? ''}
          onChange={e => {
            const next = { ...value };
            if (e.target.value === '') delete next[f]; else next[f] = e.target.value;
            onChange(next);
          }}
        />
      </label>
    ))}
  </fieldset>
);
