import { COMPANY_COLOR_PRESETS } from '../db';
import { cx } from '../lib/cx';

export interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorSwatches({
  value,
  onChange,
  label = 'Color',
}: ColorSwatchesProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {COMPANY_COLOR_PRESETS.map((color) => {
          const selected = color === value;
          return (
            <button
              key={color}
              type="button"
              aria-label={`Color ${color}`}
              aria-pressed={selected}
              className={cx(
                'size-11 rounded-full border-2 transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                selected
                  ? 'border-ink shadow-[var(--shadow-sm)]'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
