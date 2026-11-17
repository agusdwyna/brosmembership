import { jsPDF } from 'jspdf';
import { formatDate } from '@/lib/date';
import { generateQRDataURL } from '@/lib/qr';
import { cardPublicUrl } from '@/lib/card-url';
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

// Text layout within an element box. Canvas has no automatic wrapping, so the
// renderer measures and breaks lines itself; the same numbers must match the
// preview's CSS (line-height 1.2, natural wrapping).
const CARD_LINE_HEIGHT = 1.2;
const MIN_FONT_SIZE = 8;

/**
 * Make sure the webfont the card is designed in is actually available before
 * `fillText` runs. Roboto is loaded through a CSS `@import`, so on a cold load
 * the first render used to fall back to the system font and come out with the
 * wrong text widths. `fonts.ready` alone is not enough — the weight used by the
 * template may not have been requested yet.
 */
async function ensureFontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.load) return;
  try {
    await Promise.all([
      fonts.load(`400 16px ${CARD_FONT}`),
      fonts.load(`500 16px ${CARD_FONT}`),
      fonts.load(`700 16px ${CARD_FONT}`),
    ]);
    await fonts.ready;
  } catch {
    // A font failure must not abort the export; the system fallback still works.
  }
}

interface CardPrintData {
  card: MembershipCard;
}

type Side = 'FRONT' | 'BACK';
type TemplateSide = MembershipCard['cardTemplate']['sides'][number];
type TemplateElement = TemplateSide['elements'][number];

// ─── Asset loading ──────────────────────────────────────

/** Fetch a bundled asset (the brand logos) as a data URL jsPDF can embed. */
async function loadAssetDataUrl(src: string): Promise<string> {
  try {
    const response = await fetch(src);
    if (!response.ok) return '';
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    // Missing/blocked asset must not abort the export; the header degrades to text only.
    return '';
  }
}

interface BrandAssets {
  bros: string;
  rsia: string;
}

async function loadBrandAssets(): Promise<BrandAssets> {
  const [bros, rsia] = await Promise.all([
    loadAssetDataUrl('/images/logo.png'),
    loadAssetDataUrl('/images/logo-rsia.png'),
  ]);
  return { bros, rsia };
}

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

/** Shorten `text` with an ellipsis so it fits `maxWidth` in the current font. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
    end--;
  }
  return end > 0 ? `${text.slice(0, end)}…` : '';
}

/** Break `text` into lines that each fit `maxWidth` (canvas has no wrapping). */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);

  // A single word can still be wider than the box; clip it per line.
  return lines.map((line) => ellipsize(ctx, line, maxWidth));
}

/**
 * Fit `text` into a box: wrap at the designed font size, and only shrink when
 * the wrapped lines are taller than the box. Anything that still does not fit
 * is truncated with an ellipsis, so long names never spill outside the card.
 *
 * All values are in template units; the caller scales them to canvas pixels.
 */
export function layoutText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  baseFontSize: number,
  weight: string,
): { lines: string[]; fontSize: number } {
  let fontSize = baseFontSize;
  let lines: string[];

  while (true) {
    ctx.font = `${weight} ${fontSize}px ${CARD_FONT}`;
    lines = wrapLines(ctx, text, maxWidth);
    if (lines.length * fontSize * CARD_LINE_HEIGHT <= maxHeight || fontSize <= MIN_FONT_SIZE) {
      break;
    }
    fontSize -= 0.5;
  }

  const maxLines = Math.max(1, Math.floor(maxHeight / (fontSize * CARD_LINE_HEIGHT)));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1], maxWidth);
  }

  return { lines, fontSize };
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

  const weight = el.fontWeight || 'normal';
  // Layout happens in template units, then every metric is scaled once. Mixing
  // scaled and unscaled values is what used to print the text 4× too small.
  const { lines, fontSize } = layoutText(ctx, text, el.width, el.height, el.fontSize || 12, weight);
  if (lines.length === 0) return;

  ctx.font = `${weight} ${fontSize * scale}px ${CARD_FONT}`;
  ctx.textBaseline = 'middle';
  // An explicit color from the template wins; otherwise pick a readable one
  // from whatever artwork sits behind the text.
  ctx.fillStyle = el.color || contrastColor(ctx, el, scale);

  const align = el.alignment || 'left';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  const tx = align === 'center' ? el.x + el.width / 2 : align === 'right' ? el.x + el.width : el.x;

  // Vertically centre the whole block, not a single line.
  const lineHeight = fontSize * CARD_LINE_HEIGHT;
  const firstBaseline = el.y + (el.height - lines.length * lineHeight) / 2 + lineHeight / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, tx * scale, (firstBaseline + index * lineHeight) * scale);
  });
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

  // Paint an opaque base first. A template without artwork used to export a
  // transparent PNG, so text printed floating on the sheet with no card face.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Text needs the webfont loaded; render before it arrives silently falls back
  // to the system font and changes every text width.
  await ensureFontsReady();

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
      // Ask the QR generator for at least the printed pixel size; a fixed 320px
      // image was upscaled (and blurred) whenever the template made it bigger.
      const qrPixels = Math.max(320, Math.round(Math.min(qrEl.width, qrEl.height) * scale));
      // Encode the public URL: a phone camera opens the card, the dashboard
      // scanner extracts the token and verifies it as before.
      const qrDataUrl = await generateQRDataURL(cardPublicUrl(qrHash), qrPixels);
      const qrImg = await loadImage(qrDataUrl);
      drawElement(ctx, qrEl, card, qrImg, scale);
    } catch {
      // QR is best-effort; a failure must not abort the whole export
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Render one card face to a PNG data URL. Used by the public card page to show
 * the card exactly as it prints, and to offer the PNG download.
 */
export async function renderCardToDataURL(
  card: MembershipCard,
  side: 'FRONT' | 'BACK' = 'FRONT',
): Promise<string> {
  return renderCard(card, side);
}

// ─── PDF assembly ───────────────────────────────────────

// Page furniture. These are measured in mm and kept in the DESIGN.md palette:
// maroon for the one emphasis, ink for text, muted for labels, line for rules.
const PAGE_MARGIN = 12;
const CONTENT_LEFT = PAGE_MARGIN + 8;
const CONTENT_RIGHT = A4_WIDTH - PAGE_MARGIN - 8;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

const COLOR_BRAND: [number, number, number] = [184, 34, 48];
const COLOR_INK: [number, number, number] = [58, 63, 82];
const COLOR_MUTED: [number, number, number] = [141, 162, 181];
const COLOR_LINE: [number, number, number] = [237, 241, 242];
const COLOR_SOFT: [number, number, number] = [248, 249, 251];

/** Corner ticks just outside the trim box, the way a print shop crops. */
function drawCropMarks(pdf: jsPDF, x: number, y: number, w: number, h: number): void {
  const gap = 1.5;
  const len = 3;
  pdf.setDrawColor(...COLOR_INK);
  pdf.setLineWidth(0.2);

  // top-left
  pdf.line(x - gap - len, y, x - gap, y);
  pdf.line(x, y - gap - len, x, y - gap);
  // top-right
  pdf.line(x + w + gap, y, x + w + gap + len, y);
  pdf.line(x + w, y - gap - len, x + w, y - gap);
  // bottom-left
  pdf.line(x - gap - len, y + h, x - gap, y + h);
  pdf.line(x, y + h + gap, x, y + h + gap + len);
  // bottom-right
  pdf.line(x + w + gap, y + h, x + w + gap + len, y + h);
  pdf.line(x + w, y + h + gap, x + w, y + h + gap + len);
}

/** One card face: trim border, corner ticks and a caption above the card. */
function drawCardFace(pdf: jsPDF, image: string, label: string, x: number, y: number): void {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text(label, x + CARD_WIDTH_MM / 2, y - 3, { align: 'center' });

  if (image) {
    pdf.addImage(image, 'PNG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  }

  pdf.setDrawColor(...COLOR_MUTED);
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, 'S');

  drawCropMarks(pdf, x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
}

interface MemberPageGeometry {
  x: number;
  frontY: number;
  backY: number;
  panelY: number;
}

function memberPageGeometry(): MemberPageGeometry {
  const x = (A4_WIDTH - CARD_WIDTH_MM) / 2;
  const frontY = 58;
  const backY = frontY + CARD_HEIGHT_MM + CARD_GAP_MM;
  return { x, frontY, backY, panelY: backY + CARD_HEIGHT_MM + 10 };
}

/**
 * Branded header: the BROS and RSIA lockup on the left, the member it belongs
 * to on the right. The lockup is the same pair the app navbar shows, at an
 * 8 mm height so it stays legible in print.
 */
function drawHeader(pdf: jsPDF, card: MembershipCard, assets: BrandAssets): void {
  const logoTop = 16;
  const logoHeight = 8;
  let cursor = CONTENT_LEFT;

  if (assets.bros) {
    // logo.png is a 134×50 wordmark.
    const width = (logoHeight * 134) / 50;
    pdf.addImage(assets.bros, 'PNG', cursor, logoTop, width, logoHeight);
    cursor += width + 3;
  }

  if (assets.rsia) {
    pdf.setDrawColor(...COLOR_LINE);
    pdf.setLineWidth(0.3);
    pdf.line(cursor, logoTop, cursor, logoTop + logoHeight);
    cursor += 3;
    // logo-rsia.png is square.
    pdf.addImage(assets.rsia, 'PNG', cursor, logoTop, logoHeight, logoHeight);
    cursor += logoHeight + 4;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...COLOR_BRAND);
  pdf.text('BALI ROYAL HOSPITAL', cursor, logoTop + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text('KARTU MEMBERSHIP', cursor, logoTop + 10);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...COLOR_INK);
  pdf.text(card.membership.member.fullName, CONTENT_RIGHT, logoTop + 5, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text(card.membership.member.memberNumber, CONTENT_RIGHT, logoTop + 10, {
    align: 'right',
  });

  pdf.setFillColor(...COLOR_BRAND);
  pdf.rect(CONTENT_LEFT, logoTop + logoHeight + 4, CONTENT_WIDTH, 1.2, 'F');
}

/** Details below the cards: the identifiers an operator checks before cutting. */
function drawInfoPanel(pdf: jsPDF, card: MembershipCard, y: number): void {
  const height = 42;
  const x = (A4_WIDTH - CARD_WIDTH_MM) / 2;
  pdf.setFillColor(...COLOR_SOFT);
  pdf.rect(x, y, CARD_WIDTH_MM, height, 'F');

  const left = x + 7;
  const right = x + CARD_WIDTH_MM - 7;
  const rows: { label: string; value: string }[] = [
    { label: 'NOMOR MEMBERSHIP', value: card.membership.member.memberNumber },
    { label: 'JENIS MEMBERSHIP', value: card.membership.membershipType.name },
    { label: 'BERLAKU SAMPAI', value: formatDate(card.membership.endDate) },
  ];

  rows.forEach((row, index) => {
    const rowY = y + 9 + index * 12;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLOR_MUTED);
    pdf.text(row.label, left, rowY);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...COLOR_INK);
    pdf.text(row.value, right, rowY, { align: 'right' });
  });
}

/** Thin frame + footer so the sheet reads as one designed page, not loose cards. */
function drawPageFrame(pdf: jsPDF, page: number, total: number): void {
  pdf.setDrawColor(...COLOR_LINE);
  pdf.setLineWidth(0.4);
  pdf.rect(PAGE_MARGIN, PAGE_MARGIN, A4_WIDTH - PAGE_MARGIN * 2, A4_HEIGHT - PAGE_MARGIN * 2, 'S');

  const footerY = A4_HEIGHT - PAGE_MARGIN - 8;
  pdf.setDrawColor(...COLOR_LINE);
  pdf.setLineWidth(0.3);
  pdf.line(CONTENT_LEFT, footerY - 4, CONTENT_RIGHT, footerY - 4);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...COLOR_MUTED);
  pdf.text('2023 © IT/SIMRS · Bali Royal Hospital', CONTENT_LEFT, footerY);
  pdf.text(`Halaman ${page} / ${total}`, CONTENT_RIGHT, footerY, { align: 'right' });
}

/**
 * Print cards to an A4 PDF, one member per page: branded header, the front and
 * back card faces at true size (85.6 × 54 mm) with crop marks, a details panel
 * and a footer.
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
  const { x, frontY, backY, panelY } = memberPageGeometry();
  const assets = await loadBrandAssets();

  for (const [index, { card }] of cards.entries()) {
    if (index > 0) pdf.addPage();

    const front = await renderCard(card, 'FRONT');
    currentStep++;
    onProgress?.(currentStep, totalSteps);

    const back = await renderCard(card, 'BACK');
    currentStep++;
    onProgress?.(currentStep, totalSteps);

    drawPageFrame(pdf, index + 1, cards.length);
    drawHeader(pdf, card, assets);
    drawCardFace(pdf, front, 'KARTU DEPAN', x, frontY);
    drawCardFace(pdf, back, 'KARTU BELAKANG', x, backY);
    drawInfoPanel(pdf, card, panelY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLOR_MUTED);
    pdf.text(
      'Ukuran kartu 85,6 × 54 mm (ISO/IEC 7810 ID-1). Potong mengikuti garis potong.',
      A4_WIDTH / 2,
      panelY + 50,
      { align: 'center' },
    );
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  pdf.save(`cards-export-${timestamp}.pdf`);
}

/** Member fields come from the database; they must not be written as raw HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Print a single member's card in a new window: the same branded sheet the PDF
 * export builds (header, labelled card faces at true size, details panel).
 *
 * The previous implementation copied the preview node's innerHTML into a blank
 * document, which dropped every stylesheet and Tailwind class, then printed an
 * unstyled box. Rendering to images avoids depending on the page's CSS.
 */
export async function printCard(card: MembershipCard): Promise<void> {
  const front = await renderCard(card, 'FRONT');
  const back = await renderCard(card, 'BACK');

  // Same sheet the PDF builds: branded header, labelled card faces at true
  // size, details panel and footer, all in CSS mm so the browser prints it at
  // the correct physical size.
  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      width: ${A4_WIDTH}mm; height: ${A4_HEIGHT}mm; padding: ${PAGE_MARGIN}mm;
      font-family: 'Roboto', system-ui, sans-serif; color: #3A3F52;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .frame {
      height: 100%; border: 0.4mm solid #EDF1F2; padding: 8mm;
      display: flex; flex-direction: column;
    }
    .top {
      border-top: 1.2mm solid #B82230; padding-top: 4mm;
      display: flex; justify-content: space-between; align-items: center;
    }
    .brandwrap { display: flex; align-items: center; gap: 3mm; }
    .logos { display: flex; align-items: center; gap: 3mm; }
    .logos img { display: block; height: 8mm; width: auto; border: 0; }
    .logos .divider { width: 0; height: 8mm; border-left: 0.3mm solid #EDF1F2; }
    .brand { font-weight: 700; font-size: 11pt; color: #B82230; }
    .sub { font-size: 7.5pt; color: #8DA2B5; margin-top: 1mm; letter-spacing: 0.5pt; }
    .name { font-weight: 700; font-size: 11pt; text-align: right; }
    .num { font-size: 8pt; color: #8DA2B5; text-align: right; margin-top: 1mm; }
    .rule { border: 0; border-top: 0.3mm solid #EDF1F2; margin: 4mm 0 0; }
    main {
      display: flex; flex-direction: column; align-items: center;
      gap: 9mm; margin-top: 8mm;
    }
    figure { margin: 0; }
    figcaption {
      font-size: 7pt; font-weight: 700; color: #8DA2B5;
      text-align: center; margin-bottom: 2mm; letter-spacing: 0.5pt;
    }
    img {
      width: ${CARD_WIDTH_MM}mm; height: ${CARD_HEIGHT_MM}mm;
      display: block; border: 0.2mm solid #8DA2B5;
    }
    .panel {
      width: ${CARD_WIDTH_MM}mm; margin: 11mm auto 0;
      background: #F8F9FB; padding: 4mm 5mm;
    }
    .row { display: flex; justify-content: space-between; margin-top: 2.5mm; }
    .row:first-child { margin-top: 0; }
    .k { font-size: 6.5pt; color: #8DA2B5; letter-spacing: 0.3pt; }
    .v { font-size: 9pt; font-weight: 700; }
    footer {
      margin-top: auto; border-top: 0.3mm solid #EDF1F2; padding-top: 3mm;
      display: flex; justify-content: space-between; font-size: 7pt; color: #8DA2B5;
    }
  `;

  const image = (src: string, label: string) =>
    src ? `<figure><figcaption>${label}</figcaption><img src="${src}" alt=""></figure>` : '';
  const row = (label: string, value: string) =>
    `<div class="row"><span class="k">${label}</span><span class="v">${escapeHtml(value)}</span></div>`;

  // Absolute URLs: the print document is about:blank, so relative asset paths
  // would resolve against it and fail to load.
  const origin = window.location.origin;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(
    `<!doctype html><html><head><title>Cetak Kartu</title><style>${style}</style></head><body>` +
      `<div class="frame">` +
      `<header class="top">` +
      `<div class="brandwrap">` +
      `<div class="logos">` +
      `<img src="${origin}/images/logo.png" alt="Bali Royal Hospital">` +
      `<span class="divider"></span>` +
      `<img src="${origin}/images/logo-rsia.png" alt="RSIA Bali Royal">` +
      `</div>` +
      `<div><div class="brand">BALI ROYAL HOSPITAL</div><div class="sub">KARTU MEMBERSHIP</div></div>` +
      `</div>` +
      `<div><div class="name">${escapeHtml(card.membership.member.fullName)}</div>` +
      `<div class="num">${escapeHtml(card.membership.member.memberNumber)}</div></div>` +
      `</header><hr class="rule">` +
      `<main>${image(front, 'KARTU DEPAN')}${image(back, 'KARTU BELAKANG')}</main>` +
      `<section class="panel">` +
      row('NOMOR MEMBERSHIP', card.membership.member.memberNumber) +
      row('JENIS MEMBERSHIP', card.membership.membershipType.name) +
      row('BERLAKU SAMPAI', formatDate(card.membership.endDate)) +
      `</section>` +
      `<footer><span>2023 © IT/SIMRS · Bali Royal Hospital</span><span>Halaman 1 / 1</span></footer>` +
      `</div></body></html>`,
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
