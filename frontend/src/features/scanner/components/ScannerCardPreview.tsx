import { useEffect, useState } from 'react';
import { generateQRDataURL } from '@/lib/qr';
import { toast } from '@/components/ui/toast-store';
import { format } from 'date-fns';
import type { VerifyResponse } from '../types';

const CARD_WIDTH = 300;
const CARD_HEIGHT = 188;

interface ScannerCardPreviewProps {
  card: NonNullable<VerifyResponse['card']>;
  member?: VerifyResponse['member'];
  membership?: VerifyResponse['membership'];
}

export function ScannerCardPreview({ card, member, membership }: ScannerCardPreviewProps) {
  const [qrUrl, setQrUrl] = useState<string>('');

  const frontSide = card.template.sides.find((s) => s.side === 'FRONT');
  const elements = frontSide?.elements || [];
  const bgImage = frontSide?.designUrl;

  useEffect(() => {
    if (member?.qrHash) {
      generateQRDataURL(member.qrHash, 150)
        .then(setQrUrl)
        .catch(() => toast.error('Gagal membuat QR code'));
    }
  }, [member?.qrHash]);

  // Scale elements from editor size (400x250) to preview size (320x200)
  const scaleX = CARD_WIDTH / 400;
  const scaleY = CARD_HEIGHT / 250;

  const renderValue = (type: string) => {
    switch (type) {
      case 'MEMBER_NAME':
        return member?.fullName || '';
      case 'MEMBER_NUMBER':
        return member?.memberNumber || '';
      case 'MEMBERSHIP_NAME':
        return membership?.typeName || '';
      case 'EXPIRY_DATE':
        return membership
          ? `Valid until ${format(new Date(membership.endDate), 'dd MMM yyyy')}`
          : '';
      case 'QR_CODE':
        return qrUrl ? <img src={qrUrl} alt="QR" className="w-full h-full object-contain" /> : null;
      default:
        return type;
    }
  };

  return (
    <div
      className="relative border border-border rounded-[4px] overflow-hidden"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {bgImage && (
        <img src={bgImage} alt="Card" className="absolute inset-0 w-full h-full object-cover" />
      )}

      {elements.map((el, idx) => (
        <div
          key={idx}
          className="absolute overflow-hidden"
          style={{
            left: el.x * scaleX,
            top: el.y * scaleY,
            width: el.width * scaleX,
            height: el.height * scaleY,
            fontSize: el.fontSize ? `${el.fontSize * Math.min(scaleX, scaleY)}px` : '10px',
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
      {!frontSide && (
        <div className="absolute inset-0 p-5 flex flex-col justify-between bg-brand-dark text-white">
          <div>
            <div className="text-[15px] font-semibold">{member?.fullName}</div>
            <div className="text-[12px] opacity-70">{member?.memberNumber}</div>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[13px] font-medium">{membership?.typeName}</div>
              {membership && (
                <div className="text-[11px] opacity-70">
                  Valid until {format(new Date(membership.endDate), 'dd MMM yyyy')}
                </div>
              )}
            </div>
            <div className="text-[10px] opacity-50">Card ••••{card.cardNumber.slice(-4)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
