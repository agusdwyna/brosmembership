import { useEffect, useState } from 'react';
import { generateQRDataURL } from '@/lib/qr';
import { toast } from '@/components/ui/toast-store';
import { formatDate } from '@/lib/date';
import type { MembershipCard } from '../card-types';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 250;

interface CardPreviewProps {
  card: MembershipCard;
  side?: 'FRONT' | 'BACK';
}

export function CardPreview({ card, side = 'FRONT' }: CardPreviewProps) {
  const [qrUrl, setQrUrl] = useState<string>('');

  const templateSide = card.cardTemplate.sides.find((s) => s.side === side);
  const elements = templateSide?.elements || [];
  const bgImage = templateSide?.designUrl;

  useEffect(() => {
    if (card.membership.member.qrHash) {
      generateQRDataURL(card.membership.member.qrHash, 200)
        .then(setQrUrl)
        .catch(() => toast.error('Gagal membuat QR code'));
    }
  }, [card.membership.member.qrHash]);

  const renderValue = (type: string) => {
    switch (type) {
      case 'MEMBER_NAME':
        return card.membership.member.fullName;
      case 'MEMBER_NUMBER':
        return card.membership.member.memberNumber;
      case 'MEMBERSHIP_NAME':
        return card.membership.membershipType.name;
      case 'EXPIRY_DATE':
        return `Berlaku s/d ${formatDate(card.membership.endDate)}`;
      case 'QR_CODE':
        return qrUrl ? (
          <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
        ) : null;
      default:
        return type;
    }
  };

  return (
    <div
      className="relative border border-border rounded-[4px] overflow-hidden"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {/* Background image */}
      {bgImage && (
        <img
          src={bgImage}
          alt="Card background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Elements */}
      {elements.map((el, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
            fontSize: el.fontSize ? `${el.fontSize}px` : '12px',
            fontWeight: el.fontWeight || 'normal',
            textAlign: (el.alignment as any) || 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              el.alignment === 'center'
                ? 'center'
                : el.alignment === 'right'
                  ? 'flex-end'
                  : 'flex-start',
          }}
        >
          {renderValue(el.type)}
        </div>
      ))}

      {/* Fallback if no template sides */}
      {!templateSide && (
        <div className="absolute inset-0 p-6 flex flex-col justify-between bg-brand text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-bold">{card.membership.member.fullName}</div>
              <div className="text-sm opacity-80">{card.membership.member.memberNumber}</div>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-sm font-semibold">{card.membership.membershipType.name}</div>
              <div className="text-xs opacity-80">
                Berlaku s/d {formatDate(card.membership.endDate)}
              </div>
            </div>
            <div className="text-xs opacity-60">Card ••••{card.cardNumber.slice(-4)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
