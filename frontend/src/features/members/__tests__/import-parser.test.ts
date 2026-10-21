import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
  parseRows,
  normalizeDateInput,
  buildTemplateCsv,
  MAX_IMPORT_ROWS,
  type RawRow,
} from '../import-parser';

const HEADER = [
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

const DATA_ROW: RawRow = [
  'Budi Santoso',
  '3171234567890001',
  '081234567890',
  'budi@contoh.com',
  'Jl. Contoh No. 1',
  '1990-05-12',
  'BROS',
  'GOLD',
  '2026-01-01',
];

describe('parseRows', () => {
  it('maps a standard header + row', () => {
    const result = parseRows([HEADER, DATA_ROW]);

    expect(result.fileErrors).toEqual([]);
    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        fullName: 'Budi Santoso',
        nik: '3171234567890001',
        phone: '081234567890',
        email: 'budi@contoh.com',
        address: 'Jl. Contoh No. 1',
        dateOfBirth: '1990-05-12',
        companyCode: 'BROS',
        membershipTypeCode: 'GOLD',
        startDate: '2026-01-01',
      },
    ]);
  });

  it('accepts English headers and punctuation/case variants', () => {
    const header = [
      'Full Name',
      'NIK',
      'Phone',
      'Email',
      'Address',
      'Date of Birth',
      'Company',
      'Membership Type',
      'Start Date',
    ];
    const result = parseRows([header, DATA_ROW]);

    expect(result.fileErrors).toEqual([]);
    expect(result.rows[0].fullName).toBe('Budi Santoso');
    expect(result.rows[0].companyCode).toBe('BROS');
    expect(result.rows[0].membershipTypeCode).toBe('GOLD');
  });

  it('keeps a numeric NIK out of scientific notation', () => {
    const row = [...DATA_ROW];
    row[1] = 3171234567890001;
    const result = parseRows([HEADER, row]);

    expect(result.rows[0].nik).toBe('3171234567890001');
  });

  it('strips spaces from NIK and phone', () => {
    const row = [...DATA_ROW];
    row[1] = '3171 2345 6789 0001';
    row[2] = '0812-3456-7890';
    const result = parseRows([HEADER, row]);

    expect(result.rows[0].nik).toBe('3171234567890001');
    expect(result.rows[0].phone).toBe('0812-3456-7890');
  });

  it('skips blank trailing rows but keeps the real row numbers', () => {
    const result = parseRows([HEADER, DATA_ROW, ['', '', '', '', '', '', '', '', '']]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].rowNumber).toBe(2);
  });

  it('keeps row numbers aligned to the file when rows are blank in the middle', () => {
    const blank = ['', '', '', '', '', '', '', '', ''];
    const second = [...DATA_ROW];
    second[1] = '3171234567890002';
    const result = parseRows([HEADER, DATA_ROW, blank, second]);

    expect(result.rows.map((r) => r.rowNumber)).toEqual([2, 4]);
  });

  it('fails the whole file when required columns are missing', () => {
    const result = parseRows([
      ['email', 'alamat'],
      ['a@b.com', 'Jl. X'],
    ]);

    expect(result.rows).toEqual([]);
    expect(result.fileErrors[0]).toContain('nama');
    expect(result.fileErrors[0]).toContain('nik');
  });

  it('rejects an empty file', () => {
    expect(parseRows([]).fileErrors[0]).toBe('File kosong.');
  });

  it('rejects a file above the row cap', () => {
    const rows: RawRow[] = [HEADER];
    for (let i = 0; i < MAX_IMPORT_ROWS + 1; i++) rows.push(DATA_ROW);

    const result = parseRows(rows);

    expect(result.rows).toEqual([]);
    expect(result.fileErrors[0]).toContain(String(MAX_IMPORT_ROWS));
  });

  it('leaves an unrecognised date as-is so preview can flag it', () => {
    const row = [...DATA_ROW];
    row[8] = '31 Desember 2026';
    const result = parseRows([HEADER, row]);

    expect(result.rows[0].startDate).toBe('31 Desember 2026');
  });
});

describe('normalizeDateInput', () => {
  it('formats a Date object as YYYY-MM-DD', () => {
    expect(normalizeDateInput(new Date(2026, 0, 31))).toBe('2026-01-31');
  });

  it('pads an ISO date', () => {
    expect(normalizeDateInput('2026-1-5')).toBe('2026-01-05');
  });

  it('converts day-first dates', () => {
    expect(normalizeDateInput('31/01/2026')).toBe('2026-01-31');
    expect(normalizeDateInput('05-12-2025')).toBe('2025-12-05');
    // Excel strips the leading zero when it treats a cell as a date.
    expect(normalizeDateInput('5/12/2025')).toBe('2025-12-05');
  });

  it('leaves an out-of-range day-first value for the preview to flag', () => {
    expect(normalizeDateInput('31/13/2026')).toBe('31/13/2026');
  });

  it('returns empty for blank input', () => {
    expect(normalizeDateInput('')).toBe('');
    expect(normalizeDateInput(null)).toBe('');
  });
});

describe('buildTemplateCsv', () => {
  it('produces a header plus one importable sample row', () => {
    const lines = buildTemplateCsv().split('\r\n');

    expect(lines).toHaveLength(2);
    expect(lines[0].split(',')).toHaveLength(HEADER.length);
    expect(lines[1]).toContain('Budi Santoso');
    // The sample uses the same dd/mm/yyyy operators see in the app.
    expect(lines[1]).toContain('12/05/1990');
    expect(lines[1]).toContain('01/01/2026');
  });

  it('round-trips through a real CSV parse', () => {
    // The sample address contains a comma, so it must be quoted on output and
    // reassembled by a real parser rather than a naive split.
    const parsed = Papa.parse<string[]>(buildTemplateCsv(), { skipEmptyLines: 'greedy' });
    const result = parseRows(parsed.data);

    expect(result.fileErrors).toEqual([]);
    expect(result.rows[0].nik).toBe('3171234567890001');
    expect(result.rows[0].address).toBe('Jl. Contoh No. 1, Jakarta');
    // Day-first input is normalised to the ISO string the API expects.
    expect(result.rows[0].dateOfBirth).toBe('1990-05-12');
    expect(result.rows[0].startDate).toBe('2026-01-01');
  });
});
