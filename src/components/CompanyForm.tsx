import { useEffect, useState } from 'react';
import {
  COMPANY_COLOR_PRESETS,
  createCompany,
  updateCompany,
  type Company,
} from '../db';
import { Button, Input, Sheet, useToast } from '../ui';
import { ColorSwatches } from './ColorSwatches';

export interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  company?: Company;
  onCreated?: (company: Company) => void;
}

export function CompanyForm({
  open,
  onClose,
  company,
  onCreated,
}: CompanyFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(COMPANY_COLOR_PRESETS[0]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const isEdit = company !== undefined;

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(company?.name ?? '');
    setColor(company?.color ?? COMPANY_COLOR_PRESETS[0]);
    setError(undefined);
    setSaving(false);
  }, [open, company]);

  const onSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateCompany(company.id, { name: trimmed, color });
        toast('Company updated', { tone: 'success' });
      } else {
        const created = await createCompany({ name: trimmed, color });
        toast('Company created', { tone: 'success' });
        onCreated?.(created);
      }
      onClose();
    } catch {
      toast('Could not save company', { tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit company' : 'New company'}
      footer={
        <Button fullWidth loading={saving} onClick={() => void onSubmit()}>
          {isEdit ? 'Save' : 'Create company'}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <Input
          label="Name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
          error={error}
          autoComplete="off"
          placeholder="Shufersal"
        />
        <ColorSwatches value={color} onChange={setColor} />
      </form>
    </Sheet>
  );
}
