import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardsApi } from './api';
import type { MembershipCard } from './types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { ListCapNotice } from '@/components/shared/ListCapNotice';
import type { ListMeta } from '@/lib/list';
import { toast } from '@/components/ui/toast-store';
import { format } from 'date-fns';

export function CardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<MembershipCard[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const { data } = await cardsApi.list(q);
      setCards(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Gagal memuat data kartu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns = [
    {
      key: 'card',
      header: 'Card Number',
      render: (c: MembershipCard) => <span className="font-mono">{c.cardNumber}</span>,
    },
    {
      key: 'member',
      header: 'Member',
      render: (c: MembershipCard) => (
        <div>
          <div className="font-medium">{c.membership.member.fullName}</div>
          <div className="text-[12px] text-muted">{c.membership.member.memberNumber}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (c: MembershipCard) => c.membership.membershipType.name,
    },
    {
      key: 'issued',
      header: 'Issued',
      render: (c: MembershipCard) => (
        <span className="text-secondary">{format(new Date(c.issuedAt), 'dd MMM yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (c: MembershipCard) => (
        <RowActions
          actions={[
            {
              key: 'detail',
              label: 'Detail',
              variant: 'brand',
              onClick: () => navigate(`/cards/${c.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Cards" description="Manage membership cards" />

      <Card>
        <TableToolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search cards..."
            onSubmit={() => load(search)}
          />
        </TableToolbar>
        <ListCapNotice meta={meta} />
        <DataTable
          columns={columns}
          data={cards}
          loading={loading}
          emptyTitle="No cards yet"
          emptyDescription="Cards will appear when members are created"
          getRowId={(c) => c.id}
        />
      </Card>
    </div>
  );
}
