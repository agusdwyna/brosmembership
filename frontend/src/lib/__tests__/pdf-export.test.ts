import { describe, it, expect, vi } from 'vitest';
import { drawElement, RENDER_SCALE } from '../pdf-export';
import type { MembershipCard } from '@/features/members/card-types';

/**
 * The exported PDF is drawn on a canvas at RENDER_SCALE× the template's 400×250
 * coordinate space. Every element value — including fontSize — is authored in
 * template units, so anything that reaches the canvas must be multiplied by the
 * same factor. Text used to skip that and printed 4× too small inside a
 * full-size box, which is what made exported cards look wrong.
 */

const card: MembershipCard = {
  id: 'c1',
  membershipId: 'ms1',
  cardNumber: 'CARD-000001',
  cardTemplateId: 'tpl1',
  templateVersion: 1,
  issuedAt: '',
  createdAt: '',
  membership: {
    id: 'ms1',
    memberId: 'm1',
    startDate: '',
    endDate: '2027-01-01',
    status: 'ACTIVE',
    member: {
      id: 'm1',
      memberNumber: '2610000001',
      nikLast4: null,
      qrHash: null,
      fullName: 'Budi Santoso',
    },
    membershipType: { id: 'mt1', code: 'GOLD', name: 'Gold Membership' },
  },
  cardTemplate: { id: 'tpl1', name: 'Gold', sides: [] },
};

function fakeContext() {
  return {
    canvas: { width: 400 * RENDER_SCALE, height: 250 * RENDER_SCALE },
    font: '',
    fillStyle: '',
    textBaseline: '',
    textAlign: '',
    fillText: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(0) }),
  } as unknown as CanvasRenderingContext2D & {
    fillText: ReturnType<typeof vi.fn>;
    font: string;
    fillStyle: string;
    textAlign: string;
  };
}

const element = {
  id: 'el1',
  type: 'MEMBER_NAME',
  x: 20,
  y: 120,
  width: 260,
  height: 30,
  fontSize: 16,
  fontWeight: 'bold' as const,
  alignment: 'left' as const,
  color: '#B82230',
};

describe('drawElement', () => {
  it('scales the font size with the canvas, like the box and position', () => {
    const ctx = fakeContext();

    drawElement(ctx, element, card, null, RENDER_SCALE);

    expect(ctx.font).toBe(`bold ${16 * RENDER_SCALE}px 'Roboto', system-ui, sans-serif`);
  });

  it('draws the text inside the element box in canvas coordinates', () => {
    const ctx = fakeContext();

    drawElement(ctx, element, card, null, RENDER_SCALE);

    // Left-aligned, vertically centred: (x, y + height/2) × scale.
    expect(ctx.fillText).toHaveBeenCalledWith(
      'Budi Santoso',
      20 * RENDER_SCALE,
      (120 + 30 / 2) * RENDER_SCALE,
    );
  });

  it('uses the template color when set', () => {
    const ctx = fakeContext();

    drawElement(ctx, element, card, null, RENDER_SCALE);

    expect(ctx.fillStyle).toBe('#B82230');
  });

  it('falls back to a readable color when the element has none', () => {
    const ctx = fakeContext();

    drawElement(ctx, { ...element, color: null }, card, null, RENDER_SCALE);

    expect(['#3A3F52', '#FFFFFF']).toContain(ctx.fillStyle);
  });

  it('centres text horizontally when alignment is center', () => {
    const ctx = fakeContext();

    drawElement(ctx, { ...element, alignment: 'center' }, card, null, RENDER_SCALE);

    expect(ctx.textAlign).toBe('center');
    expect(ctx.fillText).toHaveBeenCalledWith(
      'Budi Santoso',
      (20 + 260 / 2) * RENDER_SCALE,
      (120 + 30 / 2) * RENDER_SCALE,
    );
  });

  it('draws the QR at its element size, in canvas coordinates', () => {
    const ctx = fakeContext();
    const qr = {} as HTMLImageElement;

    drawElement(
      ctx,
      { ...element, type: 'QR_CODE', x: 160, y: 20, width: 80, height: 80 },
      card,
      qr,
      RENDER_SCALE,
    );

    expect(ctx.drawImage).toHaveBeenCalledWith(
      qr,
      160 * RENDER_SCALE,
      20 * RENDER_SCALE,
      80 * RENDER_SCALE,
      80 * RENDER_SCALE,
    );
  });
});
