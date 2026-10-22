import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { DateInput } from '../DateInput';

/** Controlled wrapper, like every form in the app. */
function Harness({ initial = '', onChange }: { initial?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DateInput
      label="Tanggal Mulai"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('DateInput', () => {
  it('shows the stored date as dd/mm/yyyy', () => {
    render(<Harness initial="2026-10-21" />);

    expect(screen.getByLabelText('Tanggal Mulai')).toHaveValue('21/10/2026');
  });

  it('emits the API format while the operator types', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Tanggal Mulai'), '21102026');

    expect(screen.getByLabelText('Tanggal Mulai')).toHaveValue('21/10/2026');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-21');
  });

  it('accepts a pasted ISO date', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Tanggal Mulai'));
    await user.paste('2026-01-05');

    expect(screen.getByLabelText('Tanggal Mulai')).toHaveValue('05/01/2026');
    expect(onChange).toHaveBeenLastCalledWith('2026-01-05');
  });

  it('flags an impossible date instead of silently changing it', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Tanggal Mulai'), '31022026');
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent('Format tanggal dd/mm/yyyy');
    // The invalid text must not reach the form as a different date.
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('passes the calendar picker value through as the canonical date', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness initial="2026-10-21" onChange={onChange} />);

    const picker = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(picker, { target: { value: '2026-12-31' } });

    expect(screen.getByLabelText('Tanggal Mulai')).toHaveValue('31/12/2026');
    expect(onChange).toHaveBeenLastCalledWith('2026-12-31');
  });

  it('clears the value when the operator empties the field', async () => {
    const onChange = vi.fn();
    render(<Harness initial="2026-10-21" onChange={onChange} />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText('Tanggal Mulai'));

    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
