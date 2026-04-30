// __DESIGN_COMPANION_DEV_ONLY__
import * as React from 'react';
export interface MotionControlsProps {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  durations: string[];
  easings: string[];
}
export const MotionControls: React.FC<MotionControlsProps> = ({ value, onChange, durations, easings }) => {
  const set = (k: string, v: string) => {
    const next = { ...value };
    if (v === '') delete next[k]; else next[k] = `var(${v})`;
    onChange(next);
  };
  return (
    <fieldset className="design-companion-motion">
      <legend>Motion</legend>
      <label>
        transition-duration
        <select aria-label="transition-duration" defaultValue=""
          onChange={e => set('transition-duration', e.target.value)}>
          <option value="">—</option>
          {durations.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <label>
        transition-timing-function
        <select aria-label="transition-timing-function" defaultValue=""
          onChange={e => set('transition-timing-function', e.target.value)}>
          <option value="">—</option>
          {easings.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
    </fieldset>
  );
};
