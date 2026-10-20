import { useEffect, useState } from 'react';
import { activityLogApi } from './api';
import type { ActivityLogEntry } from './types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { ListCapNotice } from '@/components/shared/ListCapNotice';
import type { ListMeta } from '@/lib/list';
import { toast } from '@/components/ui/toast-store';

const actionOptions = [
  { value: '', label: 'Semua Aksi' },
  { value: 'ASSIGN', label: 'Assign' },
  { value: 'RENEW', label: 'Perpanjang' },
  { value: 'CHANGE_TYPE', label: 'Ubah Tipe' },
  { value: 'SUSPEND', label: 'Tangguhkan' },
  { value: 'CANCEL', label: 'Batalkan' },
  { value: 'UPDATE_SETTINGS', label: 'Ubah Pengaturan' },
  { value: 'CREATE_USER', label: 'Buat Pengguna' },
  { value: 'UPDATE_USER', label: 'Ubah Pengguna' },
  { value: 'ACTIVATE_USER', label: 'Aktifkan Pengguna' },
  { value: 'DEACTIVATE_USER', label: 'Nonaktifkan Pengguna' },
  { value: 'RESET_PASSWORD', label: 'Reset Password' },
  { value: 'CHANGE_PASSWORD', label: 'Ubah Password' },
  { value: 'CREATE_ROLE', label: 'Buat Role' },
  { value: 'UPDATE_ROLE', label: 'Ubah Role' },
  { value: 'DELETE_ROLE', label: 'Hapus Role' },
];

export function ActivityTab() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    activityLogApi
      .list({ search: search || undefined, action: actionFilter || undefined })
      .then((res) => {
        setLogs(res.data.data);
        setMeta(res.data.meta);
      })
      .catch(() => toast.error('Gagal memuat log aktivitas'))
      .finally(() => setLoading(false));
  }, [search, actionFilter]);

  const columns = [
    {
      key: 'createdAt',
      header: 'Waktu',
      render: (l: ActivityLogEntry) => (
        <span className="text-secondary">{new Date(l.createdAt).toLocaleString('id-ID')}</span>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (l: ActivityLogEntry) => <Badge>{l.action}</Badge>,
    },
    { key: 'description', header: 'Keterangan', render: (l: ActivityLogEntry) => l.description },
    {
      key: 'officer',
      header: 'Oleh',
      render: (l: ActivityLogEntry) => (
        <span className="text-secondary">{l.officer?.name ?? '-'}</span>
      ),
    },
  ];

  return (
    <Card>
      <TableToolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Cari keterangan..." />
        <div className="w-48">
          <Select
            options={actionOptions}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
      </TableToolbar>
      <ListCapNotice meta={meta} />
      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyTitle="Belum ada aktivitas"
        emptyDescription="Aktivitas pengguna dan perubahan data akan tercatat di sini."
        getRowId={(l) => l.id}
      />
    </Card>
  );
}
