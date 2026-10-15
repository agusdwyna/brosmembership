import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';
import { useSaveSettings, useSettings } from './use-settings';

export function BrandingTab() {
  const { settings } = useSettings();
  const { saving, save } = useSaveSettings();
  const [brandName, setBrandName] = useState(settings.brandName);

  useEffect(() => {
    setBrandName(settings.brandName);
  }, [settings.brandName]);

  const dirty = brandName.trim() !== settings.brandName;

  const handleSave = async () => {
    if (brandName.trim().length < 2) return;
    await save({ brandName: brandName.trim() });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold">Branding Aplikasi</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Brand Name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Bros Membership"
            helper="Nama ini tampil di header dan judul halaman."
            disabled={saving}
          />
          <p className="text-[12px] text-muted">
            Logo saat ini memakai berkas statis bawaan aplikasi (BROS + RSIA).
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          <Save className="w-4 h-4" /> Simpan
        </Button>
      </div>
    </div>
  );
}
