import { useState, type FormEvent } from 'react';
import { ArrowRight, CreditCard } from 'lucide-react';

interface NikLookupFormProps {
  onSubmit: (nik: string) => void;
  loading: boolean;
  error: string | null;
}

const NIK_LENGTH = 16;

export function NikLookupForm({ onSubmit, loading, error }: NikLookupFormProps) {
  const [nik, setNik] = useState('');
  const [touched, setTouched] = useState(false);

  const valid = nik.length === NIK_LENGTH;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!valid || loading) return;
    onSubmit(nik);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-[6px] border border-border bg-surface p-7 shadow-[0_10px_30px_-18px_rgba(58,63,82,0.25)]"
    >
      <div className="mb-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[6px] border border-border bg-bg">
          <CreditCard className="h-5 w-5 text-brand" aria-hidden />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">Cek Kartu Digital</h1>
        <p className="mt-2 text-[13px] leading-6 text-secondary">
          Masukkan NIK yang terdaftar untuk melihat dan mengunduh kartu membership Anda.
        </p>
      </div>

      <label htmlFor="nik" className="mb-2 block text-[12px] font-medium text-secondary">
        Nomor Induk Kependudukan
      </label>
      <input
        id="nik"
        name="nik"
        value={nik}
        onChange={(event) => {
          setNik(event.target.value.replace(/\D/g, '').slice(0, NIK_LENGTH));
          setTouched(false);
        }}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="16 digit NIK"
        aria-invalid={touched && !valid}
        aria-describedby={error ? 'nik-error' : undefined}
        className="w-full rounded-[4px] border border-border bg-surface px-3.5 py-3 font-mono text-[15px] text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] leading-4">
        <span className={touched && !valid ? 'text-danger' : 'text-muted'}>
          {touched && !valid ? 'NIK harus 16 digit angka' : 'Hanya angka, tanpa spasi'}
        </span>
        <span className="font-mono text-muted">
          {nik.length}/{NIK_LENGTH}
        </span>
      </div>

      {error && (
        <p id="nik-error" role="alert" className="mt-2.5 text-[12px] text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-[4px] bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Mencari kartu…
          </>
        ) : (
          <>
            Lihat Kartu <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>

      <p className="mt-8 border-t border-border pt-5 text-center text-[11px] leading-5 text-muted">
        Punya tautan atau QR dari kartu fisik? Pindai untuk langsung membuka halaman kartu.
      </p>
    </form>
  );
}
