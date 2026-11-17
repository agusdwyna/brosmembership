import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, FileDown, Share2, ShieldAlert } from 'lucide-react';
import { BrandLogos } from '@/components/shared/BrandLogos';
import { toast } from '@/components/ui/toast-store';
import { formatDate } from '@/lib/date';
import { downloadDataUrl } from '@/lib/download';
import { cardPublicUrl } from '@/lib/card-url';
import { exportCardsToPDF, renderCardToDataURL } from '@/lib/pdf-export';
import type { MembershipCard } from '@/features/members/card-types';
import { publicCardApi } from './api';
import type { PublicCardResponse, PublicValidity } from './types';
import { CardShowcase } from './components/CardShowcase';
import { NikLookupForm } from './components/NikLookupForm';

type Side = 'FRONT' | 'BACK';

function toMembershipCard(data: PublicCardResponse): MembershipCard {
  return {
    id: 'public',
    membershipId: 'public',
    // The card number is intentionally not part of the public payload; nothing
    // in the renderer uses it.
    cardNumber: '',
    cardTemplateId: 'public',
    templateVersion: data.card.templateVersion,
    issuedAt: data.membership.startDate,
    createdAt: data.membership.startDate,
    membership: {
      id: 'public',
      memberId: 'public',
      startDate: data.membership.startDate,
      endDate: data.membership.endDate,
      status: data.membership.status,
      member: {
        id: 'public',
        memberNumber: data.member.memberNumber,
        nikLast4: null,
        qrHash: data.member.qrHash,
        fullName: data.member.fullName,
        photo: data.member.photo ?? null,
      },
      membershipType: { id: 'public', code: '', name: data.membership.typeName },
    },
    cardTemplate: {
      id: 'public',
      name: data.card.template.name,
      sides: data.card.template.sides,
    },
  };
}

const VALIDITY_LABEL: Record<PublicValidity, string> = {
  VALID: 'Aktif',
  EXPIRED: 'Kedaluwarsa',
  SUSPENDED: 'Ditangguhkan',
  CANCELLED: 'Dibatalkan',
  INACTIVE: 'Tidak aktif',
};

const VALIDITY_STYLE: Record<PublicValidity, string> = {
  VALID: 'border-success/30 bg-success/5 text-success',
  EXPIRED: 'border-warning/30 bg-warning/5 text-warning',
  SUSPENDED: 'border-danger/30 bg-danger/5 text-danger',
  CANCELLED: 'border-danger/30 bg-danger/5 text-danger',
  INACTIVE: 'border-border bg-bg text-muted',
};

const DOWNLOADABLE: PublicValidity[] = ['VALID', 'EXPIRED'];

function isNotFound(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404;
}

function errorMessage(error: unknown): string {
  if (isNotFound(error)) return 'Kartu tidak ditemukan. Periksa kembali NIK Anda.';
  return 'Tidak dapat memuat kartu. Coba lagi sebentar lagi.';
}

export function PublicCardPage() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<PublicCardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<Side>('FRONT');
  const [images, setImages] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null,
  });
  const [rendering, setRendering] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  // The card page is personal: keep it out of search indexes while it is open.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Kartu Membership — Bali Royal Hospital';

    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const previousRobots = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');

    return () => {
      document.title = previousTitle;
      if (created) meta?.remove();
      else if (previousRobots !== null) meta?.setAttribute('content', previousRobots);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    publicCardApi
      .getByToken(token)
      .then(({ data: body }) => {
        if (!cancelled) setData(body.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(errorMessage(err));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const card = useMemo(() => (data ? toMembershipCard(data) : null), [data]);

  // Render both faces at print resolution once; the showcase and downloads all
  // reuse these data URLs instead of re-rendering on every toggle.
  useEffect(() => {
    if (!card) return;
    let cancelled = false;
    setRendering(true);
    setImages({ front: null, back: null });

    Promise.all([renderCardToDataURL(card, 'FRONT'), renderCardToDataURL(card, 'BACK')])
      .then(([front, back]) => {
        if (!cancelled) setImages({ front, back });
      })
      .catch(() => {
        if (!cancelled) toast.error('Gagal menyiapkan gambar kartu');
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [card]);

  /**
   * Return to the empty form. On `/cek` the path does not change, so the state has
   * to be cleared explicitly or the previous card would stay on screen.
   */
  const handleCheckAnother = () => {
    setData(null);
    setError(null);
    setImages({ front: null, back: null });
    setSide('FRONT');
    navigate('/cek');
  };

  const handleNikSubmit = useCallback(async (nik: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: body } = await publicCardApi.lookupByNik(nik);
      setData(body.data);
      setSide('FRONT');
    } catch (err) {
      setError(errorMessage(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownloadPng = () => {
    if (!images.front || !data) return;
    const image = side === 'FRONT' ? images.front : images.back;
    if (!image) return;
    downloadDataUrl(
      image,
      `kartu-${data.member.memberNumber}-${side === 'FRONT' ? 'depan' : 'belakang'}.png`,
    );
  };

  const handleDownloadPdf = async () => {
    if (!card || !data) return;
    setDownloadingPdf(true);
    try {
      await exportCardsToPDF([{ card }]);
    } catch {
      toast.error('Gagal membuat PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const shareUrl = useMemo(() => {
    if (data?.member.qrHash) return cardPublicUrl(data.member.qrHash);
    return window.location.href;
  }, [data]);

  const handleShare = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'Kartu Membership — Bali Royal Hospital',
          text: data ? `Kartu membership ${data.member.fullName}` : undefined,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Tautan kartu disalin');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // A cancelled native share sheet is not an error worth reporting.
    }
  };

  const downloadDisabled = !data || !DOWNLOADABLE.includes(data.validity) || rendering;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <BrandLogos variant="onLight" size="md" />
          <span className="text-[12px] font-bold leading-5 tracking-[0.08em] text-foreground">
            BROS MEMBERSHIP
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 py-14 sm:px-8 sm:py-20">
        {!token && !data && (
          <>
            <NikLookupForm onSubmit={handleNikSubmit} loading={loading} error={error} />
            <Link
              to="/login"
              className="mt-6 text-[12px] leading-5 text-muted transition-colors hover:text-secondary"
            >
              Masuk sebagai petugas
            </Link>
          </>
        )}

        {token && loading && (
          <div className="flex flex-col items-center gap-3 text-[13px] text-secondary">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            Memuat kartu…
          </div>
        )}

        {token && !loading && error && (
          <div className="w-full max-w-sm rounded-[6px] border border-border bg-surface p-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[6px] border border-border bg-bg">
              <ShieldAlert className="h-5 w-5 text-danger" aria-hidden />
            </div>
            <h1 className="text-lg font-bold text-foreground">Kartu tidak ditemukan</h1>
            <p className="mt-1 text-[13px] leading-relaxed text-secondary">{error}</p>
            <button
              type="button"
              onClick={handleCheckAnother}
              className="mt-4 inline-flex items-center gap-2 rounded-[4px] border border-border px-4 py-2 text-[13px] font-medium text-secondary transition-colors hover:bg-bg"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Cek dengan NIK
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="flex w-full max-w-lg flex-col items-center">
            <div className="text-center">
              <p className="text-[12px] font-medium leading-5 text-muted">
                {data.membership.typeName}
              </p>
              <h1 className="mt-2 text-xl font-bold leading-8 tracking-tight text-foreground sm:text-2xl">
                {data.member.fullName}
              </h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-[4px] border px-2.5 py-1 text-[11px] font-semibold leading-5 ${VALIDITY_STYLE[data.validity]}`}
                >
                  {data.validity === 'VALID' && <Check className="h-3 w-3" aria-hidden />}
                  {VALIDITY_LABEL[data.validity]}
                </span>
                <span className="rounded-[4px] border border-border bg-surface px-2.5 py-1 font-mono text-[11px] leading-5 text-secondary">
                  {data.member.memberNumber}
                </span>
              </div>
            </div>

            <CardShowcase
              frontImage={images.front}
              backImage={images.back}
              side={side}
              memberName={data.member.fullName}
            />

            <div className="mt-1 inline-flex rounded-[4px] border border-border bg-surface p-0.5">
              {(['FRONT', 'BACK'] as Side[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSide(value)}
                  aria-pressed={side === value}
                  className={`rounded-[3px] px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    side === value ? 'bg-brand text-white' : 'text-secondary hover:text-foreground'
                  }`}
                >
                  {value === 'FRONT' ? 'Depan' : 'Belakang'}
                </button>
              ))}
            </div>

            <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={downloadDisabled}
                className="flex items-center justify-center gap-2 rounded-[4px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" aria-hidden />
                Unduh PNG
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadDisabled || downloadingPdf}
                className="flex items-center justify-center gap-2 rounded-[4px] border border-border bg-surface px-4 py-2.5 text-[13px] font-medium text-secondary transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                ) : (
                  <FileDown className="h-4 w-4" aria-hidden />
                )}
                Unduh PDF
              </button>
            </div>

            {!DOWNLOADABLE.includes(data.validity) && (
              <p className="mt-5 max-w-md text-center text-[12px] leading-5 text-warning">
                Kartu tidak dapat diunduh karena status membership tidak aktif. Hubungi petugas Bali
                Royal Hospital.
              </p>
            )}

            {/* One rhythm for the meta rows: consistent gaps instead of each
                element carrying its own margin. */}
            <div className="mt-8 flex flex-col items-center gap-5">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium leading-5 text-muted transition-colors hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : typeof navigator.share === 'function' ? (
                  <Share2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                {copied ? 'Tautan disalin' : 'Bagikan tautan kartu'}
              </button>

              <p className="text-center text-[12px] leading-5 text-muted">
                Berlaku sampai {formatDate(data.membership.endDate)} · {data.card.template.name}
              </p>

              <button
                type="button"
                onClick={handleCheckAnother}
                className="inline-flex items-center gap-1.5 text-[12px] leading-5 text-muted transition-colors hover:text-secondary"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Cek kartu lain
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-5 py-5 text-[11px] leading-5 text-muted sm:flex-row sm:px-8">
          <span>2023 © IT/SIMRS · Bali Royal Hospital</span>
          <span>Jl. Tantular No. 6 Renon, Denpasar – Bali</span>
        </div>
      </footer>
    </div>
  );
}
