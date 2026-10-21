import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersApi } from './api';
import type { Member } from './types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { ListCapNotice } from '@/components/shared/ListCapNotice';
import type { ListMeta } from '@/lib/list';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/toast-store';
import { exportCardsToPDF } from '@/lib/pdf-export';
import { useCan } from '@/lib/use-permission';
import { Plus, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { MembershipCard } from '@/features/cards/types';

export function MembersPage() {
  const navigate = useNavigate();
  const canCreate = useCan('member.create');
  const canManage = useCan('member.manage');
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [toggleTarget, setToggleTarget] = useState<Member | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = statusFilter ? members.filter((m) => m.status === statusFilter) : members;

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter]);

  const loadMembers = async (q?: string) => {
    setLoading(true);
    try {
      const { data } = await membersApi.list(q);
      setMembers(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Gagal memuat data member');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      if (toggleTarget.status === 'ACTIVE') {
        await membersApi.deactivate(toggleTarget.id);
        toast.success('Member dinonaktifkan');
      } else {
        await membersApi.activate(toggleTarget.id);
        toast.success('Member diaktifkan');
      }
      await loadMembers();
    } catch {
      toast.error('Gagal mengubah status member');
    } finally {
      setToggleLoading(false);
      setToggleTarget(null);
    }
  };

  const handleExportPDF = async () => {
    const selectedMembers = members.filter((m) => selectedIds.includes(m.id));

    // Collect cards from selected members
    const cards: { card: MembershipCard }[] = [];
    for (const member of selectedMembers) {
      const ms = member.memberships?.[0];
      const cardSummary = ms?.cards?.[0];
      if (ms && cardSummary?.cardTemplate) {
        cards.push({
          card: {
            id: cardSummary.id,
            membershipId: cardSummary.membershipId,
            cardNumber: cardSummary.cardNumber,
            cardTemplateId: cardSummary.cardTemplateId,
            templateVersion: cardSummary.templateVersion,
            issuedAt: cardSummary.issuedAt,
            createdAt: cardSummary.createdAt,
            membership: {
              id: ms.id,
              memberId: member.id,
              startDate: ms.startDate,
              endDate: ms.endDate,
              status: ms.status,
              member: {
                id: member.id,
                memberNumber: member.memberNumber,
                nik: member.nik,
                qrHash: member.qrHash,
                fullName: member.fullName,
                photo: member.photo,
              },
              membershipType: ms.membershipType,
            },
            cardTemplate: cardSummary.cardTemplate,
          },
        });
      }
    }

    if (cards.length === 0) {
      toast.error('Tidak ada kartu untuk di-export');
      return;
    }

    setExporting(true);
    setExportProgress({ current: 0, total: cards.length * 2 });

    try {
      await exportCardsToPDF(cards, (current, total) => {
        setExportProgress({ current, total });
      });
      toast.success(`${cards.length} kartu berhasil di-export`);
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Gagal export PDF');
    } finally {
      setExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const columns = [
    {
      key: 'member',
      header: 'Member',
      render: (m: Member) => (
        <div>
          <div className="font-medium">{m.fullName}</div>
          <div className="text-[12px] text-muted">{m.phone || m.email || '-'}</div>
        </div>
      ),
    },
    {
      key: 'number',
      header: 'No. Member',
      render: (m: Member) => <span className="font-mono">{m.memberNumber}</span>,
    },
    {
      key: 'company',
      header: 'Perusahaan',
      render: (m: Member) => <span className="text-secondary">{m.company?.name || '-'}</span>,
    },
    {
      key: 'membership',
      header: 'Membership',
      render: (m: Member) => {
        const ms = m.memberships?.[0];
        return ms ? (
          <div>
            <div>{ms.membershipType.name}</div>
            <div className="text-[12px] text-muted">
              s/d {format(new Date(ms.endDate), 'dd MMM yyyy')}
            </div>
          </div>
        ) : (
          <span className="text-muted">-</span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (m: Member) => <StatusBadge status={m.status} />,
    },
    {
      key: 'created',
      header: 'Terdaftar',
      render: (m: Member) => (
        <span className="text-secondary">{format(new Date(m.createdAt), 'dd MMM yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (m: Member) => (
        <RowActions
          actions={[
            {
              key: 'detail',
              label: 'Detail & ubah',
              variant: 'brand',
              onClick: () => navigate(`/members/${m.id}`),
            },
            {
              key: 'toggle',
              label: m.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan',
              variant: m.status === 'ACTIVE' ? 'danger' : 'default',
              disabled: !canManage,
              onClick: () => setToggleTarget(m),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Member"
        description="Kelola data member terdaftar"
        action={
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button variant="secondary" onClick={handleExportPDF} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Mengekspor {exportProgress.current}
                    /{exportProgress.total}
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" /> Export PDF ({selectedIds.length})
                  </>
                )}
              </Button>
            )}
            {canCreate && (
              <>
                <Button variant="secondary" onClick={() => navigate('/members/import')}>
                  <FileSpreadsheet className="w-4 h-4" /> Import Excel
                </Button>
                <Button onClick={() => navigate('/members/create')}>
                  <Plus className="w-4 h-4" /> Tambah Member
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <TableToolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari member..."
            onSubmit={() => loadMembers(search)}
          />
          <div className="w-40">
            <Select
              options={[
                { value: '', label: 'Semua Status' },
                { value: 'ACTIVE', label: 'Aktif' },
                { value: 'INACTIVE', label: 'Nonaktif' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </TableToolbar>
        <ListCapNotice meta={meta} />
        <DataTable
          columns={columns}
          data={filteredMembers}
          loading={loading}
          emptyTitle="Belum ada member"
          emptyDescription="Tambahkan member pertama untuk memulai"
          emptyAction={
            <Button onClick={() => navigate('/members/create')}>
              <Plus className="w-4 h-4" /> Tambah Member
            </Button>
          }
          getRowId={(m) => m.id}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </Card>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={toggleTarget?.status === 'ACTIVE' ? 'Nonaktifkan Member' : 'Aktifkan Member'}
        description={
          toggleTarget?.status === 'ACTIVE'
            ? `${toggleTarget.fullName} akan ditandai tidak aktif dan tidak dapat diverifikasi.`
            : `${toggleTarget?.fullName ?? 'Member'} akan diaktifkan kembali dan dapat diverifikasi.`
        }
        confirmLabel={toggleTarget?.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
        variant={toggleTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        loading={toggleLoading}
      />
    </div>
  );
}
