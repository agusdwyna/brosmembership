import { describe, it, expect, vi, beforeEach } from 'vitest';

// A fake jsPDF that records what the layout code asks it to draw. Vitest hoists
// vi.mock above imports, so the class and its instance list must be hoisted too.
const { instances, FakePdf } = vi.hoisted(() => {
  const instances: any[] = [];
  class FakePdf {
    pages = 1;
    images: { img: string; x: number; y: number; w: number; h: number }[] = [];
    save = vi.fn();
    addPage = vi.fn(() => {
      this.pages++;
    });
    addImage = vi.fn((img: string, _format: string, x: number, y: number, w: number, h: number) => {
      this.images.push({ img, x, y, w, h });
    });
    constructor() {
      instances.push(this);
    }
  }
  return { instances, FakePdf };
});

vi.mock('jspdf', () => ({ jsPDF: FakePdf }));
vi.mock('@/lib/qr', () => ({ generateQRDataURL: vi.fn().mockResolvedValue('data:,') }));

import { exportCardsToPDF, CARD_WIDTH, CARD_HEIGHT } from '../pdf-export';

/**
 * Canvas is not implemented in jsdom, so provide a minimal 2d context: the
 * renderer only needs it to exist before it returns a data URL.
 */
function stubCanvas() {
  const ctx = {
    canvas: { width: CARD_WIDTH * 4, height: CARD_HEIGHT * 4 },
    font: '',
    fillStyle: '',
    textBaseline: '',
    textAlign: '',
    fillText: vi.fn(),
    drawImage: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(0) }),
  };
  const original = document.createElement.bind(document);
  (document as any).createElement = (tag: string) =>
    tag === 'canvas'
      ? ({
          width: 0,
          height: 0,
          getContext: () => ctx,
          toDataURL: () => 'data:image/png;base64,x',
        } as any)
      : original(tag);
  return () => {
    document.createElement = original as any;
  };
}

const card = (n: number) => ({
  card: {
    id: `c${n}`,
    membershipId: `ms${n}`,
    cardNumber: `CARD-${n}`,
    cardTemplateId: 'tpl',
    templateVersion: 1,
    issuedAt: '',
    createdAt: '',
    membership: {
      id: `ms${n}`,
      memberId: `m${n}`,
      startDate: '',
      endDate: '2027-01-01',
      status: 'ACTIVE',
      member: {
        id: `m${n}`,
        memberNumber: `M${n}`,
        nikLast4: null,
        qrHash: null,
        fullName: `Member ${n}`,
      },
      membershipType: { id: 'mt', code: 'GOLD', name: 'Gold Membership' },
    },
    cardTemplate: { id: 'tpl', name: 'Gold', sides: [] },
  },
});

beforeEach(() => {
  instances.length = 0;
});

describe('exportCardsToPDF layout', () => {
  it('puts one member on each page', async () => {
    const restore = stubCanvas();
    try {
      await exportCardsToPDF([card(1), card(2), card(3)] as any);
    } finally {
      restore();
    }

    expect(instances).toHaveLength(1);
    expect(instances[0].pages).toBe(3);
  });

  it('prints front and back on the same page, one above the other', async () => {
    const restore = stubCanvas();
    try {
      await exportCardsToPDF([card(1)] as any);
    } finally {
      restore();
    }

    const pdf = instances[0];
    expect(pdf.addPage).not.toHaveBeenCalled();
    expect(pdf.images).toHaveLength(2);

    const [front, back] = pdf.images;
    expect(front.y).toBeLessThan(back.y);
    // Horizontally centred on A4 (210mm).
    expect(front.x).toBeCloseTo((210 - front.w) / 2, 2);
    expect(back.x).toBeCloseTo(front.x, 2);
  });

  it('prints at true card size (85.6 × 54 mm)', async () => {
    const restore = stubCanvas();
    try {
      await exportCardsToPDF([card(1)] as any);
    } finally {
      restore();
    }

    for (const image of instances[0].images) {
      expect(image.w).toBeCloseTo(85.6, 2);
      expect(image.h).toBeCloseTo(54, 2);
    }
  });
});
