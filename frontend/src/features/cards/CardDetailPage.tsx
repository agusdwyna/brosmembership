import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { cardsApi } from './api';
import type { MembershipCard } from './types';
import { CardPreview } from './components/CardPreview';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/shared/DataTable';
import { toast } from '@/components/ui/toast-store';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<MembershipCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeSide, setActiveSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [cardHistory, setCardHistory] = useState<MembershipCard[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await cardsApi.getById(id);
      setCard(data.data);
      // Load card history for this membership
      const { data: history } = await cardsApi.getHistoryByMembership(data.data.membershipId);
      setCardHistory(history.data);
    } catch {
      setLoadError(true);
      toast.error('Gagal memuat data kartu');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<html><head><title>Print Card</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}@media print{body{background:#fff}}</style></head><body>${content.innerHTML}<script>window.onload=function(){window.print();window.close()}</script></body></html>`,
    );
    win.document.close();
  };

  if (loading)
    return <div className="h-32 bg-surface rounded-[4px] border border-border animate-pulse" />;
  if (!card) {
    return (
      <div>
        <PageHeader title="Card" backTo="/cards" />
        <Card>
          {loadError ? (
            <EmptyState
              title="Gagal memuat kartu"
              description="Terjadi kesalahan saat mengambil data. Silakan coba lagi."
            />
          ) : (
            <EmptyState
              title="Kartu tidak ditemukan"
              description="Data kartu mungkin telah dihapus atau tautannya salah."
            />
          )}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Card ${card.cardNumber}`}
        description={card.membership.member.fullName}
        backTo="/cards"
        action={
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Cetak
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3>Card Preview</h3>
            <div className="flex gap-1">
              {(['FRONT', 'BACK'] as const).map((side) => (
                <button
                  key={side}
                  onClick={() => setActiveSide(side)}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-[4px] transition-colors ${activeSide === side ? 'bg-brand text-white' : 'text-secondary hover:text-foreground hover:bg-bg'}`}
                >
                  {side === 'FRONT' ? 'Front' : 'Back'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div ref={printRef}>
              <CardPreview card={card} side={activeSide} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3>Card Information</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-[13px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
              <div>
                <p className="text-muted">Card Number</p>
                <p className="font-mono font-medium">{card.cardNumber}</p>
              </div>
              <div>
                <p className="text-muted">Template</p>
                <p className="font-medium">
                  {card.cardTemplate.name} (v{card.templateVersion})
                </p>
              </div>
              <div>
                <p className="text-muted">Issued</p>
                <p className="font-medium">
                  {format(new Date(card.issuedAt), 'dd MMM yyyy HH:mm')}
                </p>
              </div>
            </div>
            <hr className="border-border" />
            <div>
              <p className="text-muted mb-1">Member</p>
              <p className="font-medium">{card.membership.member.fullName}</p>
              <p className="text-muted">{card.membership.member.memberNumber}</p>
              <p className="text-muted font-mono text-[12px]">NIK: {card.membership.member.nik}</p>
            </div>
            <div>
              <p className="text-muted mb-1">Membership</p>
              <p className="font-medium">{card.membership.membershipType.name}</p>
              <p className="text-muted">
                {format(new Date(card.membership.startDate), 'dd MMM yyyy')} —{' '}
                {format(new Date(card.membership.endDate), 'dd MMM yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card History */}
      {cardHistory.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <h3>Card History</h3>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={[
                {
                  key: 'cardNumber',
                  header: 'Card Number',
                  render: (c: MembershipCard) => <span className="font-mono">{c.cardNumber}</span>,
                },
                {
                  key: 'template',
                  header: 'Template',
                  render: (c: MembershipCard) => (
                    <span className="text-secondary">
                      {c.cardTemplate?.name || '-'} (v{c.templateVersion})
                    </span>
                  ),
                },
                {
                  key: 'issued',
                  header: 'Issued',
                  render: (c: MembershipCard) => (
                    <span className="text-secondary">
                      {format(new Date(c.issuedAt), 'dd MMM yyyy HH:mm')}
                    </span>
                  ),
                },
              ]}
              data={cardHistory}
              getRowId={(c) => c.id}
              pageSize={5}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
