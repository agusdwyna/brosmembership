import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { settingsApi } from './api';
import type { SystemInfo } from './types';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}h`);
  if (h) parts.push(`${h}j`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function Row({
  label,
  value,
  status,
}: {
  label: string;
  value: React.ReactNode;
  status?: 'ok' | 'error';
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-[4px] border border-border bg-bg">
      <span className="text-[13px] font-medium">{label}</span>
      <span className="flex items-center gap-2 text-[13px] text-secondary">
        {status === 'ok' && <CheckCircle2 className="w-4 h-4 text-success" />}
        {status === 'error' && <XCircle className="w-4 h-4 text-danger" />}
        {value}
      </span>
    </div>
  );
}

export function SystemTab() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi
      .systemInfo()
      .then((res) => setInfo(res.data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat info sistem...
      </div>
    );
  }

  if (!info) {
    return (
      <Card>
        <CardContent>
          <p className="text-[13px] text-danger">Gagal memuat info sistem.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-[15px] font-semibold">Info Sistem</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Versi Aplikasi" value={info.version} />
          <Row label="Environment" value={<Badge variant="info">{info.env}</Badge>} />
          <Row
            label="Koneksi Database"
            value={info.db === 'ok' ? 'Terhubung' : 'Gagal'}
            status={info.db === 'ok' ? 'ok' : 'error'}
          />
          <Row label="Uptime Server" value={formatUptime(info.uptime)} />
        </CardContent>
      </Card>
    </div>
  );
}
