import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';
import { useSaveSettings, useSettings } from './use-settings';
import type { ScannerMethod } from './types';

const scannerOptions = [
  { value: 'MANUAL', label: 'Manual Input' },
  { value: 'PHYSICAL_READER', label: 'Physical Reader' },
  { value: 'CAMERA', label: 'Camera Scanner' },
];

export function PoliciesTab() {
  const { settings } = useSettings();
  const { saving, save } = useSaveSettings();

  const [expiringDays, setExpiringDays] = useState(settings.expiringSoonDays);
  const [scannerMethod, setScannerMethod] = useState<ScannerMethod>(settings.defaultScannerMethod);

  useEffect(() => {
    setExpiringDays(settings.expiringSoonDays);
    setScannerMethod(settings.defaultScannerMethod);
  }, [settings]);

  const days = parseInt(expiringDays, 10);
  const invalid = !Number.isInteger(days) || days < 1 || days > 365;

  const handleSave = async () => {
    if (invalid) return;
    await save({ expiringSoonDays: days, defaultScannerMethod: scannerMethod });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold">Kebijakan Membership</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Ambang Expiring Soon (hari)"
            type="number"
            min={1}
            max={365}
            value={expiringDays}
            onChange={(e) => setExpiringDays(e.target.value)}
            error={invalid ? 'Harus antara 1–365 hari' : undefined}
            helper="Membership yang berakhir dalam rentang ini dihitung di dashboard."
            disabled={saving}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold">Pengaturan Scanner</h3>
        </CardHeader>
        <CardContent>
          <Select
            label="Metode Scanner Default"
            options={scannerOptions}
            value={scannerMethod}
            onChange={(e) => setScannerMethod(e.target.value as ScannerMethod)}
            disabled={saving}
          />
          <p className="text-[12px] text-muted mt-2">
            Metode ini otomatis terpilih saat halaman Scanner dibuka.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} disabled={invalid}>
          <Save className="w-4 h-4" /> Simpan
        </Button>
      </div>
    </div>
  );
}
