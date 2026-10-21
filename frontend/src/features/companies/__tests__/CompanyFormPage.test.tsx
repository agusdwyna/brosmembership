import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const create = vi.fn();
const update = vi.fn();
const getById = vi.fn();

vi.mock('../api', () => ({
  companiesApi: {
    list: vi.fn(),
    getById: (...args: unknown[]) => getById(...args),
    create: (...args: unknown[]) => create(...args),
    update: (...args: unknown[]) => update(...args),
    deactivate: vi.fn(),
    activate: vi.fn(),
  },
}));

import { CompanyFormPage } from '../CompaniesPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/companies/new" element={<CompanyFormPage />} />
        <Route path="/companies/:id/edit" element={<CompanyFormPage />} />
        <Route path="/companies" element={<div>Company list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Kode'), 'ACME');
  await user.type(screen.getByLabelText('Nama'), 'Acme Corp');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
}

describe('CompanyFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates (not updates) from /companies/new, which has no :id', async () => {
    create.mockResolvedValue({ data: { data: { id: 'new-1' } } });
    renderAt('/companies/new');

    expect(screen.getByText('Tambah Perusahaan')).toBeInTheDocument();
    await fillAndSubmit();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ACME', name: 'Acme Corp' }),
    );
  });

  it('loads and updates the company on /companies/:id/edit', async () => {
    getById.mockResolvedValue({
      data: {
        data: {
          id: 'c1',
          code: 'BROS',
          name: 'BROs Hospital',
          address: null,
          phone: null,
          email: null,
          status: 'ACTIVE',
        },
      },
    });
    update.mockResolvedValue({ data: { data: { id: 'c1' } } });
    renderAt('/companies/c1/edit');

    await waitFor(() => expect(getById).toHaveBeenCalledWith('c1'));
    expect(await screen.findByDisplayValue('BROs Hospital')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith('c1', expect.any(Object)));
    expect(create).not.toHaveBeenCalled();
  });
});
