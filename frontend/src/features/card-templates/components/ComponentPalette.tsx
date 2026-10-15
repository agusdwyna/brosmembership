import type { ElementType } from '../types';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { User, Hash, Tag, Calendar, QrCode } from 'lucide-react';

interface ComponentPaletteProps {
  onAdd: (type: ElementType) => void;
}

const components: { type: ElementType; label: string; icon: React.ReactNode }[] = [
  { type: 'MEMBER_NAME', label: 'Member Name', icon: <User className="w-4 h-4" /> },
  { type: 'MEMBER_NUMBER', label: 'Member Number', icon: <Hash className="w-4 h-4" /> },
  { type: 'MEMBERSHIP_NAME', label: 'Membership', icon: <Tag className="w-4 h-4" /> },
  { type: 'EXPIRY_DATE', label: 'Expiry Date', icon: <Calendar className="w-4 h-4" /> },
  { type: 'QR_CODE', label: 'QR Code', icon: <QrCode className="w-4 h-4" /> },
];

export function ComponentPalette({ onAdd }: ComponentPaletteProps) {
  return (
    <Card>
      <CardHeader>
        <h3>Components</h3>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {components.map((comp) => (
          <button
            key={comp.type}
            onClick={() => onAdd(comp.type)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-foreground rounded-[4px] border border-border hover:bg-bg transition-colors text-left"
          >
            <span className="w-6 h-6 rounded-[4px] bg-bg flex items-center justify-center text-muted">
              {comp.icon}
            </span>
            <span className="font-medium">{comp.label}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
