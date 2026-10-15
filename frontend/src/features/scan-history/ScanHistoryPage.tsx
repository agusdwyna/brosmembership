import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanHistoryApi } from './api';
import type { ScanHistoryItem } from './types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { ListCapNotice } from '@/components/shared/ListCapNotice';
import type { ListMeta } from '@/lib/list';
import { toast } from '@/components/ui/toast-store';
import { format } from 'date-fns';

export function ScanHistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ScanHistoryItem[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [resultFilter, setResultFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await scanHistoryApi.list(
        resultFilter ? { result: resultFilter } : undefined,
      );
      setItems(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Gagal memuat riwayat scan');
    } finally {
      setLoading(false);
    }
  }, [resultFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = search
    ? items.filter(
        (i) =>
          i.member?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          i.member?.memberNumber?.toLowerCase().includes(search.toLowerCase()) ||
          i.member?.nik?.toLowerCase().includes(search.toLowerCase()) ||
          i.officer?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const columns = [
    {
      key: 'member',
      header: 'Member',
      render: (i: ScanHistoryItem) => (
        <div>
          <div className="font-medium">{i.member?.fullName || '-'}</div>
          <div className="text-[12px] text-muted">{i.member?.memberNumber}</div>
        </div>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      render: (i: ScanHistoryItem) => <StatusBadge status={i.result} />,
    },
    {
      key: 'method',
      header: 'Method',
      render: (i: ScanHistoryItem) => (
        <span className="text-secondary">{i.scannerMethod.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (i: ScanHistoryItem) => (
        <span className="text-secondary">{format(new Date(i.createdAt), 'dd MMM yyyy HH:mm')}</span>
      ),
    },
    {
      key: 'officer',
      header: 'Officer',
      render: (i: ScanHistoryItem) => <span className="text-secondary">{i.officer.name}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (i: ScanHistoryItem) => (
        <RowActions
          actions={[
            {
              key: 'detail',
              label: 'Lihat member',
              variant: 'brand',
              disabled: !i.member?.id,
              onClick: () => i.member?.id && navigate(`/members/${i.member.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Scan History" description="Verification activity log" />

      <Card>
        <TableToolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by member, NIK, officer..."
          />
          <div className="w-40">
            <Select
              options={[
                { value: '', label: 'All Results' },
                { value: 'VALID', label: 'Valid' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'CANCELLED', label: 'Cancelled' },
                { value: 'NOT_FOUND', label: 'Not Found' },
              ]}
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
            />
          </div>
        </TableToolbar>
        <ListCapNotice meta={meta} />
        <DataTable
          columns={columns}
          data={filteredItems}
          loading={loading}
          emptyTitle="No scan history"
          emptyDescription="Scan results will appear here"
          getRowId={(i) => i.id}
        />
      </Card>
    </div>
  );
}
