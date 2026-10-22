import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { maskDisplayDate, parseDisplayDate, toDisplayDate } from '@/lib/date';

interface DateInputProps {
  /** Canonical `YYYY-MM-DD` (what the API stores), or '' when empty. */
  value: string;
  /** Receives the canonical `YYYY-MM-DD`, or '' while the field is incomplete. */
  onChange: (isoDate: string) => void;
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

/**
 * Day-first date field (`21/10/2026`).
 *
 * The native `<input type="date">` always renders in the browser's locale, so it
 * cannot be forced to day-first — on an en-US install the operator sees
 * mm/dd/yyyy while the rest of the app shows dd/mm/yyyy. This renders a text
 * field with the display format the app already uses everywhere, and keeps a
 * native date input beside it purely as the calendar picker.
 */
export function DateInput({
  value,
  onChange,
  label,
  error,
  helper,
  required,
  disabled,
  id,
  className,
  size = 'md',
  'aria-label': ariaLabel,
}: DateInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  const [text, setText] = useState(() => toDisplayDate(value));
  const [touched, setTouched] = useState(false);
  // What this component last sent up. The effect below only resets the text when
  // the value changed elsewhere (e.g. opening the editor for another membership)
  // so normal typing is never overwritten mid-keystroke.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(toDisplayDate(value));
    }
  }, [value]);

  const completeButInvalid =
    touched && text.trim() !== '' && text.length === 10 && parseDisplayDate(text) === null;
  const shownError = error ?? (completeButInvalid ? 'Format tanggal dd/mm/yyyy' : undefined);

  const emit = (next: string) => {
    setText(next);
    const iso = next.trim() === '' ? '' : parseDisplayDate(next);
    // An incomplete or invalid field reports '' so the form's required check
    // fails on submit instead of silently keeping the previously parsed date.
    lastEmitted.current = iso ?? '';
    onChange(iso ?? '');
  };

  const handleTyping = (raw: string) => {
    // Pasting an ISO date (from a spreadsheet, a ticket, ...) is common enough
    // to accept; everything else is masked as dd/mm/yyyy.
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
    emit(iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : maskDisplayDate(raw));
  };

  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = pickerRef.current;
    if (!el || disabled) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // Not allowed on some browsers without the picker being visible.
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          value={value || ''}
          onChange={(e) => emit(toDisplayDate(e.target.value))}
          className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
        />
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          value={text}
          aria-label={ariaLabel}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={errorId}
          aria-required={required || undefined}
          disabled={disabled}
          onChange={(e) => handleTyping(e.target.value)}
          onBlur={() => setTouched(true)}
          className={cn(
            'w-full rounded-[4px] border bg-surface pr-9 pl-3 text-[13px] text-foreground',
            'placeholder:text-muted',
            'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand',
            'disabled:bg-bg disabled:opacity-50',
            size === 'sm' ? 'h-8' : 'h-9',
            shownError ? 'border-danger focus:ring-danger/20 focus:border-danger' : 'border-border',
          )}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          aria-label="Pilih tanggal dari kalender"
          className="absolute top-1/2 right-1 -translate-y-1/2 p-1.5 text-muted hover:text-foreground rounded-[4px] disabled:opacity-50"
        >
          <CalendarDays className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden />
        </button>
      </div>

      {shownError && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 text-[12px] leading-tight text-danger"
        >
          <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
          {shownError}
        </p>
      )}
      {helper && !shownError && <p className="text-[12px] text-muted">{helper}</p>}
    </div>
  );
}
