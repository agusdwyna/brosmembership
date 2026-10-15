import { Card, CardContent } from '@/components/ui/Card';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
}

export function KpiCard({ label, value, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="w-9 h-9 rounded-[4px] bg-brand/8 flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-brand" />
        </div>
        <div>
          <p className="text-[12px] text-muted leading-[16px]">{label}</p>
          <p className="text-[20px] font-semibold text-foreground leading-[28px]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
