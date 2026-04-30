// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';

export interface VariantControlsProps {
  value: string;
  variants: string[];
  onChange: (next: string) => void;
}

export const VariantControls: React.FC<VariantControlsProps> = ({ value, variants, onChange }) => (
  <fieldset className="design-companion-variant">
    <legend>Variant</legend>
    <label>
      variant
      <select aria-label="variant" value={value} onChange={e => onChange(e.target.value)}>
        {variants.map(v => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  </fieldset>
);
