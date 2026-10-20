import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { visitsApi } from './api';
import type { VisitItem } from './types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { ListCapNotice } from '@/components/shared/ListCapNotice';
import type { ListMeta } from '@/lib/list';
import { toast } from '@/components/ui/toast-store';
import { format } from 'date-fns';

export function VisitsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<VisitItem[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await visitsApi.list();
      setItems(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Gagal memuat data kunjungan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search
    ? items.filter(
        (v) =>
          v.member.fullName.toLowerCase().includes(search.toLowerCase()) ||
          v.member.memberNumber.toLowerCase().includes(search.toLowerCase()) ||
          (v.member.nik ?? '').toLowerCase().includes(search.toLowerCase()) ||
          v.officer.name.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const columns = [
    {
      key: 'member',
      header: 'Member',
      render: (v: VisitItem) => (
        <div>
          <div className="font-medium">{v.member.fullName}</div>
          <div className="text-[12px] text-muted">{v.member.memberNumber}</div>
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Waktu',
      render: (v: VisitItem) => (
        <span className="text-secondary">{format(new Date(v.createdAt), 'dd MMM yyyy HH:mm')}</span>
      ),
    },
    {
      key: 'officer',
      header: 'Petugas',
      render: (v: VisitItem) => <span className="text-secondary">{v.officer.name}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (v: VisitItem) => (
        <RowActions
          actions={[
            {
              key: 'detail',
              label: 'Lihat member',
              variant: 'brand',
              onClick: () => navigate(`/members/${v.member.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kunjungan"
        description={`Catatan kunjungan member — ${items.length} kunjungan terakhir`}
      />

      <Card>
        <TableToolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari member atau petugas..."
          />
        </TableToolbar>
        <ListCapNotice meta={meta} />
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="Belum ada kunjungan"
          emptyDescription="Kunjungan tercatat saat petugas menekan Daftarkan Kunjungan setelah scan valid."
          getRowId={(v) => v.id}
        />
      </Card>
    </div>
  );
}
