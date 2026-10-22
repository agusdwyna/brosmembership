import { jsPDF } from 'jspdf';
import { formatDate } from '@/lib/date';
import { generateQRDataURL } from '@/lib/qr';
import type { MembershipCard } from '@/features/members/card-types';

// ─── Page geometry ──────────────────────────────────────

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Real card size (ISO/IEC 7810 ID-1) — 85.6 × 54 mm, the same 400:250 ratio the
// editor and preview use. Printing at the true size means a cut card fits a
// standard card sleeve.
const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 54;

// Vertical gap between the front and back card on a member's page.
const CARD_GAP_MM = 20;

// The template's own coordinate space. Every element value (x/y/width/height/
// fontSize) is authored in these units, so the canvas must be driven by them.
export const CARD_WIDTH = 400;
export const CARD_HEIGHT = 250;

// Supersample factor for the printed raster. The canvas is drawn at this
// multiple so the PDF image stays sharp at print DPI; element coordinates are
// scaled by the same factor, never mixed with unscaled values.
export const RENDER_SCALE = 4;

const CARD_FONT = "'Roboto', system-ui, sans-serif";

interface CardPrintData {
  card: MembershipCard;
}

type Side = 'FRONT' | 'BACK';
type TemplateSide = MembershipCard['cardTemplate']['sides'][number];
type TemplateElement = TemplateSide['elements'][number];

// ─── Asset loading ──────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Pick the most legible text color for a patch of background by sampling the
 * already-drawn canvas behind `el`. Used only when the element has no explicit
 * color, so it matches the automatic behavior of the on-screen preview.
 */
function contrastColor(
  ctx: CanvasRenderingContext2D,
  el: { x: number; y: number; width: number; height: number },
  scale: number,
): string {
  const pad = 6;
  const x0 = Math.max(0, Math.round((el.x - pad) * scale));
  const y0 = Math.max(0, Math.round((el.y - pad) * scale));
  const w = Math.min(ctx.canvas.width - x0, Math.round((el.width + pad * 2) * scale));
  const h = Math.min(ctx.canvas.height - y0, Math.round((el.height + pad * 2) * scale));
  if (w <= 0 || h <= 0) return '#3A3F52';

  let sum = 0;
  let count = 0;
  try {
    const { data } = ctx.getImageData(x0, y0, w, h);
    const step = 4 * 8; // sample every 8th pixel
    for (let i = 0; i < data.length; i += step) {
      if (data[i + 3] < 40) continue; // ignore fully transparent padding
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      count++;
    }
  } catch {
    return '#3A3F52';
  }
  if (count === 0) return '#3A3F52';
  const avg = sum / count;
  return avg > 140 ? '#3A3F52' : '#FFFFFF';
}

// ─── Card rendering ─────────────────────────────────────

function elementText(card: MembershipCard, type: string): string {
  switch (type) {
    case 'MEMBER_NAME':
      return card.membership.member.fullName ?? '';
    case 'MEMBER_NUMBER':
      return card.membership.member.memberNumber ?? '';
    case 'MEMBERSHIP_NAME':
      return card.membership.membershipType.name ?? '';
    case 'EXPIRY_DATE':
      return `Berlaku s/d ${formatDate(card.membership.endDate)}`;
    default:
      return '';
  }
}

export function drawElement(
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  card: MembershipCard,
  qrImg: HTMLImageElement | null,
  scale: number,
): void {
  if (el.type === 'QR_CODE') {
    if (!qrImg) return;
    // Fit the (square) QR inside the element box, centered.
    const size = Math.min(el.width, el.height);
    const dx = (el.x + (el.width - size) / 2) * scale;
    const dy = (el.y + (el.height - size) / 2) * scale;
    ctx.drawImage(qrImg, dx, dy, size * scale, size * scale);
    return;
  }

  const text = elementText(card, el.type);
  if (!text) return;

  // fontSize is in template units like every other coordinate, so it has to be
  // multiplied by the render scale. Leaving it unscaled printed the text at a
  // quarter of its designed size while the boxes were full size — the "kacau"
  // look in the exported PDF.
  const fontSize = (el.fontSize || 12) * scale;
  const weight = el.fontWeight || 'normal';
  ctx.font = `${weight} ${fontSize}px ${CARD_FONT}`;
  ctx.textBaseline = 'middle';
  // An explicit color from the template wins; otherwise pick a readable one
  // from whatever artwork sits behind the text.
  ctx.fillStyle = el.color || contrastColor(ctx, el, scale);

  const align = el.alignment || 'left';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  const tx = align === 'center' ? el.x + el.width / 2 : align === 'right' ? el.x + el.width : el.x;
  const ty = el.y + el.height / 2;
  ctx.fillText(text, tx * scale, ty * scale);
}

async function renderCard(card: MembershipCard, side: Side): Promise<string> {
  const templateSide: TemplateSide | undefined = card.cardTemplate?.sides?.find(
    (s) => s.side === side,
  );
  const scale = RENDER_SCALE;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH * scale;
  canvas.height = CARD_HEIGHT * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Artwork background
  if (templateSide?.designUrl) {
    const bg = await loadImage(templateSide.designUrl);
    if (bg) {
      // object-fit: cover
      const scaleImg = Math.max(canvas.width / bg.width, canvas.height / bg.height);
      const dw = bg.width * scaleImg;
      const dh = bg.height * scaleImg;
      ctx.drawImage(bg, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    }
  }

  const elements = templateSide?.elements ?? [];

  // Data elements first, so a QR element always paints on top of any overlap.
  for (const el of elements) {
    if (el.type !== 'QR_CODE') drawElement(ctx, el, card, null, scale);
  }

  // Pre-generate the QR for whichever side actually carries a QR_CODE element
  // (templates may put it on FRONT or BACK — the seeded default uses FRONT).
  const qrEl = elements.find((el) => el.type === 'QR_CODE');
  const qrHash = card.membership.member.qrHash;
  if (qrEl && qrHash) {
    try {
      const qrDataUrl = await generateQRDataURL(qrHash, 320);
      const qrImg = await loadImage(qrDataUrl);
      drawElement(ctx, qrEl, card, qrImg, scale);
    } catch {
      // QR is best-effort; a failure must not abort the whole export
    }
  }

  return canvas.toDataURL('image/png');
}

// ─── PDF assembly ───────────────────────────────────────

/**
 * Print cards to an A4 PDF, one member per page: front above, back below,
 * centred, at true card size, with no labels or cut borders.
 *
 * Each page is rendered from the same element geometry the preview uses, so
 * what the operator sees in the editor is what comes out of the printer.
 */
export async function exportCardsToPDF(
  cards: CardPrintData[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  if (cards.length === 0) return;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const totalSteps = cards.length * 2; // front + back for each card
  let currentStep = 0;

  const x = (A4_WIDTH - CARD_WIDTH_MM) / 2;
  // Two cards plus the gap, vertically centred on the sheet.
  const blockHeight = CARD_HEIGHT_MM * 2 + CARD_GAP_MM;
  const frontY = (A4_HEIGHT - blockHeight) / 2;
  const backY = frontY + CARD_HEIGHT_MM + CARD_GAP_MM;

  for (const [index, { card }] of cards.entries()) {
    if (index > 0) pdf.addPage();

    const front = await renderCard(card, 'FRONT');
    currentStep++;
    onProgress?.(currentStep, totalSteps);

    const back = await renderCard(card, 'BACK');
    currentStep++;
    onProgress?.(currentStep, totalSteps);

    if (front) pdf.addImage(front, 'PNG', x, frontY, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    if (back) pdf.addImage(back, 'PNG', x, backY, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  pdf.save(`cards-export-${timestamp}.pdf`);
}

/**
 * Print a single member's card in a new window: the same two renders used by
 * the PDF export, side by side on one page at true size.
 *
 * The previous implementation copied the preview node's innerHTML into a blank
 * document, which dropped every stylesheet and Tailwind class, then printed an
 * unstyled box. Rendering to images avoids depending on the page's CSS.
 */
export async function printCard(card: MembershipCard): Promise<void> {
  const front = await renderCard(card, 'FRONT');
  const back = await renderCard(card, 'BACK');

  // Same geometry the PDF uses, expressed in CSS mm so the browser prints it
  // at true card size.
  const style = `
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      width: ${A4_WIDTH}mm; height: ${A4_HEIGHT}mm;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: ${CARD_GAP_MM}mm;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    img { width: ${CARD_WIDTH_MM}mm; height: ${CARD_HEIGHT_MM}mm; display: block; }
  `;
  const image = (src: string) => (src ? `<img src="${src}" alt="">` : '');

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(
    `<!doctype html><html><head><title>Cetak Kartu</title><style>${style}</style></head>` +
      `<body>${image(front)}${image(back)}</body></html>`,
  );
  win.document.close();

  // Wait for the images to decode before opening the print dialog, otherwise
  // the preview comes up blank on a slow machine.
  const images = Array.from(win.document.images);
  await Promise.all(
    images.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {}))),
  );
  win.focus();
  win.print();
}
