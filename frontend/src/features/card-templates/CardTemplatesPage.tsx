import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardTemplatesApi } from './api';
import type { CardTemplate } from './types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { ListCapNotice } from '@/components/shared/ListCapNotice';
import type { ListMeta } from '@/lib/list';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/toast-store';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/date';

export function CardTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggleTarget, setToggleTarget] = useState<CardTemplate | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await cardTemplatesApi.list();
      setTemplates(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Gagal memuat template kartu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      if (toggleTarget.status === 'ACTIVE') {
        await cardTemplatesApi.deactivate(toggleTarget.id);
        toast.success('Template kartu dinonaktifkan');
      } else {
        await cardTemplatesApi.activate(toggleTarget.id);
        toast.success('Template kartu diaktifkan');
      }
      await load();
    } catch {
      toast.error('Gagal mengubah status');
    } finally {
      setToggleLoading(false);
      setToggleTarget(null);
    }
  };

  const filteredTemplates = search
    ? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates;

  const columns = [
    {
      key: 'name',
      header: 'Nama',
      render: (t: CardTemplate) => <span className="font-medium">{t.name}</span>,
    },
    {
      key: 'sides',
      header: 'Sisi',
      render: (t: CardTemplate) => (
        <span className="text-secondary">
          {t.sides.length} sisi, {t.sides.reduce((a, s) => a + s.elements.length, 0)} elemen
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: CardTemplate) => <StatusBadge status={t.status} />,
    },
    {
      key: 'created',
      header: 'Dibuat',
      render: (t: CardTemplate) => (
        <span className="text-secondary">{formatDate(t.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (t: CardTemplate) => (
        <RowActions
          actions={[
            {
              key: 'edit',
              label: 'Ubah template',
              variant: 'brand',
              onClick: () => navigate(`/card-templates/${t.id}/edit`),
            },
            {
              key: 'toggle',
              label: t.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan',
              variant: t.status === 'ACTIVE' ? 'danger' : 'default',
              onClick: () => setToggleTarget(t),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Template Kartu"
        description="Kelola desain template kartu"
        action={
          <Button onClick={() => navigate('/card-templates/new/edit')}>
            <Plus className="w-4 h-4" /> Tambah Template
          </Button>
        }
      />
      <Card>
        <TableToolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari template..." />
        </TableToolbar>
        <ListCapNotice meta={meta} />
        <DataTable
          columns={columns}
          data={filteredTemplates}
          loading={loading}
          emptyTitle="Belum ada template"
          emptyDescription="Buat template kartu pertama"
          emptyAction={
            <Button onClick={() => navigate('/card-templates/new/edit')}>
              <Plus className="w-4 h-4" /> Tambah Template
            </Button>
          }
          getRowId={(t) => t.id}
        />
      </Card>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={
          toggleTarget?.status === 'ACTIVE'
            ? 'Nonaktifkan Template Kartu'
            : 'Aktifkan Template Kartu'
        }
        description={
          toggleTarget?.status === 'ACTIVE'
            ? `${toggleTarget.name} akan ditandai tidak aktif dan tidak dapat dipilih untuk membership baru.`
            : `${toggleTarget?.name ?? 'Template'} akan diaktifkan kembali dan dapat digunakan lagi.`
        }
        confirmLabel={toggleTarget?.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
        variant={toggleTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        loading={toggleLoading}
      />
    </div>
  );
}
