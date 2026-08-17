import { useMemo } from 'react';
import { COMPANY_COLOR_PRESETS, type Company } from '../db';
import { cx } from '../lib/cx';
import { Input, Select } from '../ui';

export const NEW_COMPANY_VALUE = '__new__';

export interface CompanyPickerProps {
  companies: readonly Company[] | undefined;
  companyId: string;
  newName: string;
  newColor: string;
  suggestedName: string;
  error?: string;
  onCompanyIdChange: (value: string) => void;
  onNewNameChange: (value: string) => void;
  onNewColorChange: (value: string) => void;
}

export function CompanyPicker({
  companies,
  companyId,
  newName,
  newColor,
  suggestedName,
  error,
  onCompanyIdChange,
  onNewNameChange,
  onNewColorChange,
}: CompanyPickerProps) {
  const options = useMemo(() => {
    const existing = (companies ?? []).map((company) => ({
      value: company.id,
      label: company.name,
    }));
    return [
      ...existing,
      { value: NEW_COMPANY_VALUE, label: 'Create new company…' },
    ];
  }, [companies]);

  const creating = companyId === NEW_COMPANY_VALUE;

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Company"
        value={companyId}
        options={options}
        placeholder={companies === undefined ? 'Loading companies…' : 'Select a company'}
        error={creating ? undefined : error}
        onChange={onCompanyIdChange}
      />
      {creating ? (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-canvas px-3 py-3">
          <Input
            label="Company name"
            value={newName}
            placeholder={suggestedName || 'e.g. Shufersal'}
            error={error}
            autoComplete="off"
            onChange={(event) => onNewNameChange(event.target.value)}
          />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">Color</legend>
            <div className="flex flex-wrap gap-2">
              {COMPANY_COLOR_PRESETS.map((color) => {
                const selected = newColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use company color ${color}`}
                    aria-pressed={selected}
                    className={cx(
                      'size-11 rounded-full border-2 transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                      selected
                        ? 'border-ink shadow-[var(--shadow-sm)]'
                        : 'border-transparent hover:scale-105',
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => onNewColorChange(color)}
                  />
                );
              })}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
