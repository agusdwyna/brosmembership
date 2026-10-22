import { jsPDF } from 'jspdf';
import { formatDate } from '@/lib/date';
import { generateQRDataURL } from '@/lib/qr';
import type { MembershipCard } from '@/features/members/card-types';

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Grid layout per A4 page: 2 cards side by side (a lone card — e.g. the last
// one in a batch — is centred on its own page). Fronts and backs print on
// separate sheets, 2 up each.
const GRID_COLS = 2;
const GRID_ROWS = 1;
const CARDS_PER_PAGE = GRID_COLS * GRID_ROWS;

// Card dimensions in mm (400:250 ratio)
const CARD_WIDTH_MM = 85;
const CARD_HEIGHT_MM = CARD_WIDTH_MM * (250 / 400); // ~53.125mm

// Gap between cards and from the page edges (mm)
const CARD_GAP_MM = 12;

// Card render size in px (the template's own coordinate space) and a supersample
// factor so the printed raster stays crisp at print DPI.
const CARD_WIDTH = 400;
const CARD_HEIGHT = 250;
const RENDER_SCALE = 3;

const CARD_FONT = "'Roboto', system-ui, sans-serif";

interface CardPrintData {
  card: MembershipCard;
}

type Side = 'FRONT' | 'BACK';
type TemplateSide = MembershipCard['cardTemplate']['sides'][number];
type TemplateElement = TemplateSide['elements'][number];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
 * Pick the most legible text color for a patch of background by walking a
 * coarse grid over `el`'s box on an already-drawn canvas. Falls back to the
 * dark ink when the region is empty/transparent.
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

function drawElement(
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

  const fontSize = el.fontSize || 12;
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

  await delay(0);
  return canvas.toDataURL('image/png');
}

// ─── PDF assembly ───────────────────────────────────────

export async function exportCardsToPDF(
  cards: CardPrintData[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  if (cards.length === 0) return;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const totalSteps = cards.length * 2; // front + back for each card
  let currentStep = 0;

  // Process FRONT sides
  const frontImages: string[] = [];
  for (const { card } of cards) {
    frontImages.push(await renderCard(card, 'FRONT'));
    currentStep++;
    onProgress?.(currentStep, totalSteps);
  }

  // Process BACK sides
  const backImages: string[] = [];
  for (const { card } of cards) {
    backImages.push(await renderCard(card, 'BACK'));
    currentStep++;
    onProgress?.(currentStep, totalSteps);
  }

  addCardsToPage(pdf, frontImages, 'FRONT');
  addCardsToPage(pdf, backImages, 'BACK');

  const timestamp = new Date().toISOString().slice(0, 10);
  pdf.save(`cards-export-${timestamp}.pdf`);
}

function addCardsToPage(pdf: jsPDF, images: string[], label: string): void {
  const valid = images.filter((img) => !!img);
  if (valid.length === 0) return;

  const totalPages = Math.ceil(valid.length / CARDS_PER_PAGE);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) pdf.addPage();

    const startIdx = pageIdx * CARDS_PER_PAGE;
    const pageImages = valid.slice(startIdx, startIdx + CARDS_PER_PAGE);

    // Add page label
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`${label} - Page ${pageIdx + 1}/${totalPages}`, A4_WIDTH / 2, 5, { align: 'center' });

    // Centre the cards actually placed on this page, so a lone card sits in the
    // middle of the sheet instead of hugging the left edge.
    const cols = Math.min(GRID_COLS, pageImages.length);
    const rows = Math.ceil(pageImages.length / GRID_COLS);
    const gridWidth = cols * CARD_WIDTH_MM + (cols - 1) * CARD_GAP_MM;
    const gridHeight = rows * CARD_HEIGHT_MM + (rows - 1) * CARD_GAP_MM;
    const offsetX = (A4_WIDTH - gridWidth) / 2;
    const offsetY = (A4_HEIGHT - gridHeight) / 2;

    pageImages.forEach((imgData, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);

      const x = offsetX + col * (CARD_WIDTH_MM + CARD_GAP_MM);
      const y = offsetY + row * (CARD_HEIGHT_MM + CARD_GAP_MM);

      pdf.addImage(imgData, 'PNG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);

      // Add subtle border
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.1);
      pdf.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    });
  }
}
