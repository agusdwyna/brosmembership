import readXlsxFile from 'read-excel-file';
import Papa from 'papaparse';

/**
 * Spreadsheet → preview rows for the bulk member import.
 *
 * Parsing happens in the browser so the operator can see and fix bad rows before
 * anything is written. Every row is normalised to strings here; the backend
 * schema then validates the same way it does for a single registration.
 */

export type RawCell = string | number | Date | null | undefined;
export type RawRow = RawCell[];

export interface ParsedImportRow {
  /** 1-based row number in the source file (header is row 1). */
  rowNumber: number;
  fullName: string;
  nik: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth: string;
  /** Company code as written in the file; resolved to an id on the preview screen. */
  companyCode: string;
  /** Membership type code as written in the file. */
  membershipTypeCode: string;
  startDate: string;
}

export interface ParseResult {
  rows: ParsedImportRow[];
  /** Problems that make the whole file unusable (no header, empty file, …). */
  fileErrors: string[];
}

export const MAX_IMPORT_ROWS = 500;

/** Canonical field → accepted header spellings (lowercased, punctuation stripped). */
const HEADER_ALIASES: Record<keyof Omit<ParsedImportRow, 'rowNumber'>, string[]> = {
  fullName: ['nama', 'nama lengkap', 'full name', 'fullname', 'name'],
  nik: ['nik', 'no ktp', 'noktp', 'ktp', 'nomor ktp'],
  phone: ['telepon', 'no telepon', 'notelepon', 'hp', 'no hp', 'nohp', 'phone', 'wa', 'whatsapp'],
  email: ['email', 'e mail', 'surel'],
  address: ['alamat', 'address', 'alamat lengkap'],
  dateOfBirth: ['tanggal lahir', 'tgl lahir', 'tanggallahir', 'date of birth', 'dob'],
  companyCode: ['kode perusahaan', 'kodeperusahaan', 'perusahaan', 'company', 'company code'],
  membershipTypeCode: [
    'kode tipe membership',
    'kode tipe',
    'tipe membership',
    'tipe',
    'membership type',
    'membership',
    'type',
  ],
  startDate: [
    'tanggal mulai',
    'tgl mulai',
    'mulai',
    'start date',
    'startdate',
    'tanggal bergabung',
  ],
};

/** Lowercase, drop diacritics and strip punctuation so "Tanggal_Lahir" matches "tanggal lahir". */
function normalizeHeader(value: RawCell): string {
  return (
    String(value ?? '')
      .normalize('NFKD')
      // Strip combining diacritics so "Nama Lengkap" and "Nama Lèngkap" match.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );
}

/** Column index per canonical field, or -1 when the header is absent. */
type ColumnMap = Record<keyof Omit<ParsedImportRow, 'rowNumber'>, number>;

function mapHeaders(headerRow: RawRow): ColumnMap {
  const normalized = headerRow.map(normalizeHeader);
  const map = {} as ColumnMap;

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof ColumnMap, string[]][]) {
    map[field] = normalized.findIndex((h) => aliases.includes(h));
  }
  return map;
}

/**
 * Excel stores numbers, not strings: a NIK typed as a number arrives as
 * 3171234567890001 and would otherwise stringify in scientific notation.
 */
function cellToString(value: RawCell): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'number') {
    // Phone numbers may arrive as 81234567890; keep them as digits.
    return Number.isInteger(value) ? value.toFixed(0) : String(value);
  }
  return String(value).trim();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Accepts what people actually type in a date column: ISO (`2026-01-31`),
 * Indonesian day-first (`31/01/2026` or `31-01-2026`), and Excel Date objects
 * (already handled by cellToString).
 */
export function normalizeDateInput(value: RawCell): string {
  if (value instanceof Date) return formatDate(value);

  const text = cellToString(value);
  if (!text) return '';

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;

  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (dayFirst) return `${dayFirst[3]}-${pad(Number(dayFirst[2]))}-${pad(Number(dayFirst[1]))}`;

  // Unrecognised: pass through so the row is flagged during preview validation
  // instead of silently turning into an empty date.
  return text;
}

function rowFromCells(cells: RawRow, columns: ColumnMap, rowNumber: number): ParsedImportRow {
  const pick = (field: keyof ColumnMap) => {
    const index = columns[field];
    return index >= 0 ? (cells[index] ?? '') : '';
  };

  return {
    rowNumber,
    fullName: cellToString(pick('fullName')).replace(/\s+/g, ' '),
    nik: cellToString(pick('nik')).replace(/\s+/g, ''),
    phone: cellToString(pick('phone')).replace(/\s+/g, ''),
    email: cellToString(pick('email')).toLowerCase(),
    address: cellToString(pick('address')),
    dateOfBirth: normalizeDateInput(pick('dateOfBirth')),
    companyCode: cellToString(pick('companyCode')),
    membershipTypeCode: cellToString(pick('membershipTypeCode')),
    startDate: normalizeDateInput(pick('startDate')),
  };
}

/** Trailing empty rows are common in exports and should not become failures. */
function isBlankRow(cells: RawRow): boolean {
  return cells.every((c) => cellToString(c) === '');
}

export function parseRows(rows: RawRow[], fileErrors: string[] = []): ParseResult {
  if (rows.length === 0) {
    return { rows: [], fileErrors: [...fileErrors, 'File kosong.'] };
  }

  const columns = mapHeaders(rows[0]);
  const missing: string[] = [];
  if (columns.fullName < 0) missing.push('nama');
  if (columns.nik < 0) missing.push('nik');

  if (missing.length > 0) {
    return {
      rows: [],
      fileErrors: [
        ...fileErrors,
        `Kolom wajib tidak ditemukan: ${missing.join(', ')}. Unduh template untuk melihat format yang benar.`,
      ],
    };
  }

  const parsed: ParsedImportRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (isBlankRow(rows[i])) continue;
    parsed.push(rowFromCells(rows[i], columns, i + 1));
  }

  if (parsed.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      fileErrors: [
        ...fileErrors,
        `File berisi ${parsed.length} baris, melebihi batas ${MAX_IMPORT_ROWS} baris per import.`,
      ],
    };
  }

  if (parsed.length === 0) {
    return { rows: [], fileErrors: [...fileErrors, 'Tidak ada baris data di file.'] };
  }

  return { rows: parsed, fileErrors };
}

export async function parseImportFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) {
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
    const fileErrors = result.errors
      .filter((e) => e.type === 'Quotes')
      .map((e) => `Baris ${(e.row ?? 0) + 1}: ${e.message}`);
    return parseRows(result.data, fileErrors);
  }

  if (name.endsWith('.xlsx')) {
    const rows = (await readXlsxFile(file)) as RawRow[];
    return parseRows(rows);
  }

  return {
    rows: [],
    fileErrors: ['Format file tidak didukung. Gunakan .xlsx atau .csv.'],
  };
}

/** Header + one example row, so the downloaded file imports without editing. */
export const TEMPLATE_HEADERS = [
  'nama',
  'nik',
  'telepon',
  'email',
  'alamat',
  'tanggal_lahir',
  'kode_perusahaan',
  'kode_tipe_membership',
  'tanggal_mulai',
];

const TEMPLATE_SAMPLE = [
  'Budi Santoso',
  '3171234567890001',
  '081234567890',
  'budi@contoh.com',
  'Jl. Contoh No. 1, Jakarta',
  '1990-05-12',
  'BROS',
  'GOLD',
  '2026-01-01',
];

/** Quote a CSV cell only when it needs it (comma, quote, or newline). */
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildTemplateCsv(): string {
  return [TEMPLATE_HEADERS, TEMPLATE_SAMPLE]
    .map((cells) => cells.map(csvCell).join(','))
    .join('\r\n');
}

export function downloadTemplateCsv(): void {
  // Prepend a UTF-8 BOM so Excel opens Indonesian names and phone numbers
  // with the correct encoding.
  const BOM = String.fromCharCode(0xfeff);
  const blob = new Blob([BOM + buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template-import-member.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
