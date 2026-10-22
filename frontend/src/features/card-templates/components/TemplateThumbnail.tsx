import { cn } from '@/lib/cn';
import type { CardTemplate, CardTemplateElement } from '../types';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 250;

const ELEMENT_COLORS: Record<string, string> = {
  MEMBER_NAME: '#B82230',
  MEMBER_NUMBER: '#8E1A25',
  MEMBERSHIP_NAME: '#53627C',
  EXPIRY_DATE: '#3A3F52',
  QR_CODE: '#8DA2B5',
};

const ELEMENT_LABELS: Record<string, string> = {
  MEMBER_NAME: 'Member Name',
  MEMBER_NUMBER: 'Member Number',
  MEMBERSHIP_NAME: 'Membership',
  EXPIRY_DATE: 'Expiry Date',
  QR_CODE: 'QR Code',
};

interface TemplateThumbnailProps {
  template: CardTemplate;
  side?: 'FRONT' | 'BACK';
  /** Rendered card width in px; height follows the 400:250 aspect ratio. */
  width?: number;
  className?: string;
}

/**
 * Small, non-interactive preview of a card template's side. Reuses the same
 * element colors/labels as the editor canvas so a template reads identically
 * wherever it is shown, but scales everything down to the requested width.
 *
 * Values are placeholders because a template has no member data attached.
 */
export function TemplateThumbnail({
  template,
  side = 'FRONT',
  width = 320,
  className,
}: TemplateThumbnailProps) {
  const scale = width / CARD_WIDTH;
  const height = CARD_HEIGHT * scale;
  const templateSide = template.sides.find((s) => s.side === side);
  const elements: CardTemplateElement[] = templateSide?.elements || [];
  const bgImage = templateSide?.designUrl;

  return (
    <div
      className={cn('relative border border-border rounded-[4px] overflow-hidden bg-bg', className)}
      style={{ width, height }}
    >
      {bgImage && (
        <img
          src={bgImage}
          alt={`${template.name} ${side}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {!templateSide && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-muted">
          Sisi {side === 'FRONT' ? 'depan' : 'belakang'} kosong
        </div>
      )}

      {elements.map((el, idx) => (
        <div
          key={el.id || idx}
          className="absolute rounded-[4px] flex items-center justify-center text-center leading-tight"
          style={{
            left: el.x * scale,
            top: el.y * scale,
            width: el.width * scale,
            height: el.height * scale,
            fontSize: Math.max(7, (el.fontSize || 11) * scale),
            fontWeight: el.fontWeight || 'normal',
            color: el.color || ELEMENT_COLORS[el.type] || '#53627C',
            background: `${ELEMENT_COLORS[el.type] || '#53627C'}20`,
            border: `1px solid ${ELEMENT_COLORS[el.type] || '#53627C'}`,
          }}
        >
          {ELEMENT_LABELS[el.type] || el.type}
        </div>
      ))}
    </div>
  );
}
