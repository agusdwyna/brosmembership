import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';
import { useSaveSettings, useSettings } from './use-settings';
import type { NumberReset } from './types';

const resetOptions = [
  { value: 'MONTHLY', label: 'Bulanan' },
  { value: 'YEARLY', label: 'Tahunan' },
  { value: 'GLOBAL', label: 'Global (tanpa reset)' },
];

export function NumberingTab() {
  const { settings } = useSettings();
  const { saving, save } = useSaveSettings();

  const [form, setForm] = useState({
    memberNumberPrefix: settings.memberNumberPrefix,
    memberNumberReset: settings.memberNumberReset,
    cardNumberPrefix: settings.cardNumberPrefix,
    cardNumberReset: settings.cardNumberReset,
  });

  useEffect(() => {
    setForm({
      memberNumberPrefix: settings.memberNumberPrefix,
      memberNumberReset: settings.memberNumberReset,
      cardNumberPrefix: settings.cardNumberPrefix,
      cardNumberReset: settings.cardNumberReset,
    });
  }, [settings]);

  // Illustrates how a monthly member number is composed, using the live prefix.
  const preview = `${form.memberNumberPrefix}${form.memberNumberReset === 'MONTHLY' ? 'YYMM' : form.memberNumberReset === 'YEARLY' ? 'YY' : ''}000001`;

  const handleSave = async () => {
    await save(form);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold">Penomoran Member</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Input
              label="Prefix Nomor Member"
              value={form.memberNumberPrefix}
              onChange={(e) => setForm({ ...form, memberNumberPrefix: e.target.value })}
              placeholder="mis. BROS-"
              disabled={saving}
            />
            <Select
              label="Reset Urutan"
              options={resetOptions}
              value={form.memberNumberReset}
              onChange={(e) =>
                setForm({ ...form, memberNumberReset: e.target.value as NumberReset })
              }
              disabled={saving}
            />
          </div>
          <p className="text-[12px] text-muted">
            Contoh hasil: <span className="font-mono text-foreground">{preview}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold">Penomoran Kartu</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Input
              label="Prefix Nomor Kartu"
              value={form.cardNumberPrefix}
              onChange={(e) => setForm({ ...form, cardNumberPrefix: e.target.value })}
              placeholder="mis. CARD-"
              disabled={saving}
            />
            <Select
              label="Reset Urutan"
              options={resetOptions}
              value={form.cardNumberReset}
              onChange={(e) => setForm({ ...form, cardNumberReset: e.target.value as NumberReset })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" /> Simpan
        </Button>
      </div>
    </div>
  );
}
