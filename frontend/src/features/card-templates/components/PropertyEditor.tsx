import type { CardTemplateElement } from '../types';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';

interface PropertyEditorProps {
  element: CardTemplateElement | null;
  onChange: (element: CardTemplateElement) => void;
  onDelete: () => void;
}

export function PropertyEditor({ element, onChange, onDelete }: PropertyEditorProps) {
  if (!element) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted">
          Pilih elemen untuk mengedit properti
        </CardContent>
      </Card>
    );
  }

  const update = (field: keyof CardTemplateElement, value: string | number | null) => {
    onChange({ ...element, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="text-sm font-semibold">Properti</h3>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-danger" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="X"
            type="number"
            value={element.x}
            onChange={(e) => update('x', parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Y"
            type="number"
            value={element.y}
            onChange={(e) => update('y', parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Width"
            type="number"
            value={element.width}
            onChange={(e) => update('width', parseFloat(e.target.value) || 10)}
          />
          <Input
            label="Height"
            type="number"
            value={element.height}
            onChange={(e) => update('height', parseFloat(e.target.value) || 10)}
          />
        </div>

        {(element.type === 'MEMBER_NAME' ||
          element.type === 'MEMBER_NUMBER' ||
          element.type === 'MEMBERSHIP_NAME' ||
          element.type === 'EXPIRY_DATE') && (
          <>
            <Input
              label="Font Size"
              type="number"
              value={element.fontSize || 12}
              onChange={(e) => update('fontSize', parseFloat(e.target.value) || 12)}
            />
            <Select
              label="Font Weight"
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'bold', label: 'Bold' },
              ]}
              value={element.fontWeight || 'normal'}
              onChange={(e) => update('fontWeight', e.target.value)}
            />
            <Select
              label="Alignment"
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
              value={element.alignment || 'left'}
              onChange={(e) => update('alignment', e.target.value)}
            />
            {/*
              Text color. The native picker always holds some value, so it is
              paired with an explicit "Otomatis" toggle: automatic is the null
              case, where the card picks a readable color from the artwork.
            */}
            <div className="space-y-1.5">
              <label
                htmlFor={`color-${element.id}`}
                className="block text-[13px] font-medium text-foreground"
              >
                Warna Teks
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`color-${element.id}`}
                  type="color"
                  aria-label="Pilih warna teks"
                  value={element.color || '#3A3F52'}
                  onChange={(e) => update('color', e.target.value)}
                  className="h-9 w-12 rounded-[4px] border border-border bg-surface p-0.5"
                />
                <Button
                  variant={element.color ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => update('color', null)}
                  title="Pakai warna otomatis yang kontras dengan latar"
                >
                  {element.color ? 'Otomatis' : 'Otomatis ✓'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
