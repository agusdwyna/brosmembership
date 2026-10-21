import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { membersApi } from './api';
import type { ImportFailedRow, ImportRowDraft } from './types';
import {
  MAX_IMPORT_ROWS,
  downloadTemplateCsv,
  parseImportFile,
  type ParsedImportRow,
} from './import-parser';
import { companiesApi } from '@/features/companies/api';
import type { Company } from '@/features/companies/types';
import { membershipTypesApi } from '@/features/membership-types/api';
import type { MembershipType } from '@/features/membership-types/types';
import { toast } from '@/components/ui/toast-store';
import { getErrorMessage } from '@/lib/error';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/shared/DataTable';

type Stage = 'upload' | 'preview' | 'result';

interface DraftWithErrors extends ImportRowDraft {
  errors: string[];
}

/** Same rules as the single-member form; kept here because the shape differs. */
function rowErrors(row: ImportRowDraft): string[] {
  const errors: string[] = [];
  if (row.fullName.trim().length < 2) errors.push('Nama minimal 2 karakter');
  if (!/^\d{16}$/.test(row.nik)) errors.push('NIK harus 16 digit angka');
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Email tidak valid');
  if (!row.membershipTypeId) {
    errors.push(
      row.typeCode
        ? `Kode tipe "${row.typeCode}" tidak ditemukan`
        : 'Tipe membership belum dipilih',
    );
  }
  // Company stays optional, matching createMemberSchema on the backend — but a
  // code that matched nothing is worth flagging, or the member silently ends up
  // without a company.
  if (!row.companyId && row.companyCode) {
    errors.push(`Kode perusahaan "${row.companyCode}" tidak ditemukan`);
  }
  if (!row.startDate) errors.push('Tanggal mulai kosong');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.startDate)) errors.push('Tanggal mulai tidak valid');
  return errors;
}

export function MembersImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('upload');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRowDraft[]>([]);
  const [failed, setFailed] = useState<ImportFailedRow[]>([]);
  const [createdCount, setCreatedCount] = useState(0);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [types, setTypes] = useState<MembershipType[]>([]);

  useEffect(() => {
    companiesApi
      .list()
      .then((res) => setCompanies(res.data.data.filter((c) => c.status === 'ACTIVE')))
      .catch(() => toast.error('Gagal memuat data perusahaan'));
    membershipTypesApi
      .list()
      .then((res) => setTypes(res.data.data.filter((t) => t.status === 'ACTIVE')))
      .catch(() => toast.error('Gagal memuat tipe membership'));
  }, []);

  const companyByCode = useMemo(
    () => new Map(companies.map((c) => [c.code.toLowerCase(), c])),
    [companies],
  );
  const typeByCode = useMemo(() => new Map(types.map((t) => [t.code.toLowerCase(), t])), [types]);

  /**
   * Codes in the file are matched case-insensitively. A code that does not
   * exist leaves the dropdown empty — the operator picks manually in preview
   * rather than the row silently importing against the wrong company.
   */
  const toDraft = (row: ParsedImportRow): ImportRowDraft => ({
    rowNumber: row.rowNumber,
    fullName: row.fullName,
    nik: row.nik,
    phone: row.phone,
    email: row.email,
    address: row.address,
    dateOfBirth: row.dateOfBirth,
    companyId: companyByCode.get(row.companyCode.toLowerCase())?.id ?? '',
    membershipTypeId: typeByCode.get(row.membershipTypeCode.toLowerCase())?.id ?? '',
    startDate: row.startDate,
    companyCode: row.companyCode,
    typeCode: row.membershipTypeCode,
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    setFileErrors([]);
    try {
      const result = await parseImportFile(file);
      setFileName(file.name);
      setFileErrors(result.fileErrors);
      if (result.rows.length > 0) {
        setRows(result.rows.map(toDraft));
        setStage('preview');
      }
    } catch (err) {
      setFileErrors([getErrorMessage(err, 'Gagal membaca file')]);
    } finally {
      setParsing(false);
      // Allow re-selecting the same file after a failed parse.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const drafts: DraftWithErrors[] = useMemo(
    () => rows.map((row) => ({ ...row, errors: rowErrors(row) })),
    [rows],
  );
  const invalidCount = drafts.filter((d) => d.errors.length > 0).length;

  const updateRow = (rowNumber: number, patch: Partial<ImportRowDraft>) => {
    setRows((prev) => prev.map((r) => (r.rowNumber === rowNumber ? { ...r, ...patch } : r)));
  };

  const removeRow = (rowNumber: number) => {
    setRows((prev) => prev.filter((r) => r.rowNumber !== rowNumber));
  };

  const handleSubmit = async () => {
    const invalid = drafts.filter((d) => d.errors.length > 0);
    if (invalid.length > 0) {
      toast.error(`Masih ada ${invalid.length} baris bermasalah. Perbaiki dulu sebelum import.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = drafts.map(({ errors: _errors, dateOfBirth, ...row }) => ({
        ...row,
        // Optional: an untouched "Tanggal Lahir" cell is an empty string, which
        // the backend schema treats as an invalid date rather than "absent".
        dateOfBirth: dateOfBirth || undefined,
      }));
      const { data } = await membersApi.importMany(payload);
      setCreatedCount(data.data.created);
      setFailed(data.data.failed);

      if (data.data.failed.length === 0) {
        toast.success(`${data.data.created} member berhasil diimport`);
      } else {
        toast.warning(`${data.data.created} member dibuat, ${data.data.failed.length} baris gagal`);
      }
      setStage('result');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengimport member'));
    } finally {
      setSubmitting(false);
    }
  };

  /** Re-preview only the rows the server rejected, so they can be corrected. */
  const retryFailed = () => {
    const failedNumbers = new Set(failed.map((f) => f.rowNumber));
    setRows((prev) => prev.filter((r) => failedNumbers.has(r.rowNumber)));
    setStage('preview');
  };

  const companyOptions = companies.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }));
  const typeOptions = types.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }));

  return (
    <div>
      <PageHeader
        title="Import Member"
        description="Tambahkan banyak member sekaligus dari file Excel atau CSV"
        backTo="/members"
      />

      {fileErrors.length > 0 && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 bg-danger/10 text-danger text-[13px] px-4 py-3 rounded-[4px] border border-danger/20"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <ul className="space-y-1">
            {fileErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {stage === 'upload' && (
        <Card>
          <CardHeader>
            <h3>Unggah File</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-[13px] text-secondary">
                Format yang didukung: <span className="font-medium">.xlsx</span> dan{' '}
                <span className="font-medium">.csv</span>, maksimal {MAX_IMPORT_ROWS} baris per
                import. Kolom wajib: <span className="font-medium">nama</span> dan{' '}
                <span className="font-medium">nik</span>.
              </p>

              <div className="rounded-[4px] border border-dashed border-border-strong bg-bg px-4 py-3 text-[13px]">
                <p className="font-medium mb-1">Kolom yang dikenali</p>
                <p className="text-secondary leading-relaxed">
                  nama, nik, telepon, email, alamat, tanggal_lahir, kode_perusahaan,
                  kode_tipe_membership, tanggal_mulai
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={downloadTemplateCsv} type="button">
                  <Download className="w-4 h-4" /> Unduh Template CSV
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  loading={parsing}
                  type="button"
                >
                  <Upload className="w-4 h-4" /> Pilih File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="sr-only"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              {fileName && fileErrors.length === 0 && (
                <p className="flex items-center gap-2 text-[13px] text-secondary">
                  <FileSpreadsheet className="w-4 h-4" /> {fileName}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {stage === 'preview' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3>Pratinjau — {rows.length} baris</h3>
                <div className="flex items-center gap-2">
                  {invalidCount > 0 ? (
                    <Badge variant="danger">
                      <AlertCircle className="w-3 h-3" aria-hidden /> {invalidCount} baris perlu{' '}
                      diperbaiki
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      <CheckCircle2 className="w-3 h-3" aria-hidden /> Semua baris valid
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={drafts}
                getRowId={(row) => String(row.rowNumber)}
                pageSize={20}
                columns={[
                  {
                    key: 'rowNumber',
                    header: 'Baris',
                    width: 'w-[1%]',
                    render: (row) => <span className="text-secondary">{row.rowNumber}</span>,
                  },
                  {
                    key: 'fullName',
                    header: 'Nama / NIK',
                    render: (row) => (
                      <div>
                        <div className="font-medium">{row.fullName || '-'}</div>
                        <div className="text-[12px] text-secondary">{row.nik || '-'}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'companyId',
                    header: 'Perusahaan',
                    width: 'w-56',
                    render: (row) => (
                      <Select
                        aria-label={`Perusahaan baris ${row.rowNumber}`}
                        options={companyOptions}
                        placeholder="Tanpa perusahaan"
                        value={row.companyId}
                        onChange={(e) =>
                          // Clearing the code marker acknowledges the operator's
                          // choice, so "Tanpa perusahaan" stops being flagged.
                          updateRow(row.rowNumber, {
                            companyId: e.target.value,
                            companyCode: '',
                          })
                        }
                      />
                    ),
                  },
                  {
                    key: 'membershipTypeId',
                    header: 'Tipe Membership',
                    width: 'w-56',
                    render: (row) => (
                      <Select
                        aria-label={`Tipe membership baris ${row.rowNumber}`}
                        options={typeOptions}
                        placeholder="Pilih tipe"
                        value={row.membershipTypeId}
                        onChange={(e) =>
                          updateRow(row.rowNumber, {
                            membershipTypeId: e.target.value,
                            typeCode: '',
                          })
                        }
                      />
                    ),
                  },
                  {
                    key: 'startDate',
                    header: 'Tanggal Mulai',
                    width: 'w-40',
                    render: (row) => (
                      <Input
                        aria-label={`Tanggal mulai baris ${row.rowNumber}`}
                        type="date"
                        value={row.startDate}
                        onChange={(e) => updateRow(row.rowNumber, { startDate: e.target.value })}
                      />
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) =>
                      row.errors.length > 0 ? (
                        <div
                          role="alert"
                          className="flex items-start gap-1 text-[12px] text-danger"
                        >
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                          <span>{row.errors.join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-success">Siap diimport</span>
                      ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    width: 'w-[1%]',
                    render: (row) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Hapus baris ${row.rowNumber}`}
                        onClick={() => removeRow(row.rowNumber)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setStage('upload')}>
              Ganti File
            </Button>
            <Button
              type="button"
              loading={submitting}
              disabled={rows.length === 0 || invalidCount > 0}
              onClick={handleSubmit}
            >
              Import {rows.length} Member
            </Button>
          </div>
        </>
      )}

      {stage === 'result' && (
        <Card>
          <CardHeader>
            <h3>Hasil Import</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[13px]">
                <CheckCircle2 className="w-4 h-4 text-success" aria-hidden />
                <span>
                  <span className="font-medium">{createdCount}</span> member berhasil dibuat.
                </span>
              </div>

              {failed.length > 0 && (
                <>
                  <div
                    role="alert"
                    className="flex items-start gap-2 bg-danger/10 text-danger text-[13px] px-4 py-3 rounded-[4px] border border-danger/20"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                    <span>{failed.length} baris gagal dibuat.</span>
                  </div>

                  <div className="border border-border rounded-[4px] overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-bg text-secondary">
                        <tr>
                          <th className="text-left font-medium px-3 py-2 w-[1%]">Baris</th>
                          <th className="text-left font-medium px-3 py-2">Alasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failed.map((row) => (
                          <tr key={row.rowNumber} className="border-t border-border">
                            <td className="px-3 py-2 text-secondary">{row.rowNumber}</td>
                            <td className="px-3 py-2">{row.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3">
                {failed.length > 0 && (
                  <Button variant="secondary" type="button" onClick={retryFailed}>
                    Perbaiki Baris Gagal
                  </Button>
                )}
                <Button type="button" onClick={() => navigate('/members')}>
                  Selesai
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
