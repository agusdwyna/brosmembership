import { useEffect, useMemo, useState } from 'react';
import { addYears } from 'date-fns';
import { formatDate } from '@/lib/date';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardPreview } from '@/features/members/components/CardPreview';
import type { MembershipCard } from '@/features/members/card-types';
import type { CardTemplate, SideType } from '../types';

/**
 * Sample member used only to fill the template's elements. There is no real
 * member attached to a template, and a preview with blank fields would not show
 * whether the layout actually works.
 */
const SAMPLE = {
  fullName: 'Budi Santoso',
  memberNumber: '2601000001',
  // Drives the QR image; any stable string works, the card never scans it.
  qrHash: 'PREVIEW-SAMPLE',
  membershipName: 'Gold Membership',
  cardNumber: 'CARD-000001',
};

/** Scale applied on top of the 400×250 renderer so the preview reads comfortably. */
const SCALE = 1.3;

interface TemplatePreviewModalProps {
  template: CardTemplate | null;
  onClose: () => void;
  /** Side to show first — the editor passes the side being edited. */
  initialSide?: SideType;
}

export function TemplatePreviewModal({
  template,
  onClose,
  initialSide = 'FRONT',
}: TemplatePreviewModalProps) {
  const [side, setSide] = useState<SideType>(initialSide);

  // Reopening for another template (or another editor side) must not inherit
  // the previous selection.
  useEffect(() => {
    setSide(initialSide);
  }, [initialSide, template?.id]);

  /**
   * Templates are not cards, so a card-shaped object is synthesised for
   * `CardPreview`. Reusing that component keeps the preview pixel-identical to
   * the card shown on member/card pages instead of re-implementing the renderer.
   */
  const previewCard = useMemo<MembershipCard | null>(() => {
    if (!template) return null;

    const now = new Date();
    return {
      id: 'preview',
      membershipId: 'preview',
      cardNumber: SAMPLE.cardNumber,
      cardTemplateId: template.id,
      templateVersion: 1,
      issuedAt: now.toISOString(),
      createdAt: now.toISOString(),
      membership: {
        id: 'preview',
        memberId: 'preview',
        startDate: now.toISOString(),
        endDate: addYears(now, 1).toISOString(),
        status: 'ACTIVE',
        member: {
          id: 'preview',
          memberNumber: SAMPLE.memberNumber,
          nikLast4: null,
          qrHash: SAMPLE.qrHash,
          fullName: SAMPLE.fullName,
        },
        membershipType: { id: 'preview', code: 'PREVIEW', name: SAMPLE.membershipName },
      },
      cardTemplate: {
        id: template.id,
        name: template.name,
        sides: template.sides.map((s) => ({
          id: s.id,
          side: s.side,
          designUrl: s.designUrl ?? null,
          // Spread the element instead of listing fields: a hand-written map is
          // how `color` went missing here while the card (which reads the
          // element directly) rendered it correctly. Any field added to the
          // template element now reaches the preview automatically.
          elements: s.elements.map((el, idx) => ({
            ...el,
            fontSize: el.fontSize ?? null,
            fontWeight: el.fontWeight ?? null,
            alignment: el.alignment ?? null,
            color: el.color ?? null,
            // Unsaved editor elements have a generated id; give every preview
            // element a stable, side-scoped one.
            id: el.id ?? `preview-${s.side}-${idx}`,
          })),
        })),
      },
    };
  }, [template]);

  const activeSide = template?.sides.find((s) => s.side === side);

  return (
    <Modal
      open={!!template}
      onClose={onClose}
      title={`Pratinjau — ${template?.name ?? ''}`}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-[4px] border border-border overflow-hidden">
            {(['FRONT', 'BACK'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSide(value)}
                className={
                  side === value
                    ? 'px-3 h-8 text-[13px] font-medium bg-brand text-white'
                    : 'px-3 h-8 text-[13px] text-secondary hover:bg-bg'
                }
              >
                {value === 'FRONT' ? 'Depan' : 'Belakang'}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-muted">Data contoh — {formatDate(new Date())}</span>
        </div>

        {!activeSide || activeSide.elements.length === 0 ? (
          <EmptyState
            title={side === 'FRONT' ? 'Sisi depan belum diatur' : 'Sisi belakang belum diatur'}
            description="Tambahkan elemen lewat panel komponen di sebelah kiri, lalu pratinjau lagi."
          />
        ) : (
          // The renderer is fixed at 400×250; the wrapper reserves the scaled
          // box so the transform does not overlap surrounding content.
          <div className="flex justify-center overflow-x-auto">
            <div
              style={{
                width: 400 * SCALE,
                height: 250 * SCALE,
              }}
            >
              <div
                style={{
                  transform: `scale(${SCALE})`,
                  transformOrigin: 'top left',
                }}
              >
                {previewCard && <CardPreview card={previewCard} side={side} />}
              </div>
            </div>
          </div>
        )}

        {activeSide && activeSide.elements.length > 0 && (
          <p className="text-[12px] text-muted">
            {activeSide.elements.length} elemen pada sisi {side === 'FRONT' ? 'depan' : 'belakang'}.
          </p>
        )}
      </div>
    </Modal>
  );
}
