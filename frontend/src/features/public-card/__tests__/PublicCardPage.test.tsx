import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../api', () => ({
  publicCardApi: {
    getByToken: vi.fn(),
    lookupByNik: vi.fn(),
  },
}));

vi.mock('@/lib/pdf-export', () => ({
  renderCardToDataURL: vi.fn().mockResolvedValue('data:image/png;base64,card'),
  exportCardsToPDF: vi.fn().mockResolvedValue(undefined),
}));

import { publicCardApi } from '../api';
import { PublicCardPage } from '../PublicCardPage';
import type { PublicCardResponse } from '../types';

const TOKEN = 'a'.repeat(64);

const response: PublicCardResponse = {
  member: {
    fullName: 'Budi Santoso',
    memberNumber: 'M-000001',
    qrHash: TOKEN,
    photo: null,
  },
  membership: {
    status: 'ACTIVE',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2027-01-01T00:00:00.000Z',
    typeName: 'Gold Membership',
  },
  validity: 'VALID',
  card: {
    templateVersion: 1,
    template: {
      name: 'Gold Card',
      sides: [
        {
          id: 's1',
          side: 'FRONT',
          designUrl: null,
          elements: [
            {
              id: 'e1',
              type: 'MEMBER_NAME',
              x: 10,
              y: 10,
              width: 200,
              height: 30,
              fontSize: 16,
              fontWeight: 'bold',
              alignment: 'left',
              color: null,
            },
          ],
        },
      ],
    },
  },
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cek" element={<PublicCardPage />} />
        <Route path="/cek/:token" element={<PublicCardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PublicCardPage', () => {
  it('opens the card directly from a shared token', async () => {
    (publicCardApi.getByToken as any).mockResolvedValue({ data: { data: response } });

    renderAt(`/cek/${TOKEN}`);

    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Gold Membership')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh PNG/i })).toBeEnabled();
    expect(publicCardApi.getByToken).toHaveBeenCalledWith(TOKEN);
  });

  it('shows the NIK form when there is no token', async () => {
    renderAt('/cek');

    expect(screen.getByLabelText(/Nomor Induk Kependudukan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lihat Kartu/i })).toBeInTheDocument();
  });

  it('looks the card up by NIK and reveals it', async () => {
    (publicCardApi.lookupByNik as any).mockResolvedValue({ data: { data: response } });
    const user = userEvent.setup();

    renderAt('/cek');
    await user.type(screen.getByLabelText(/Nomor Induk Kependudukan/i), '3201234567890123');
    await user.click(screen.getByRole('button', { name: /Lihat Kartu/i }));

    await waitFor(() => expect(publicCardApi.lookupByNik).toHaveBeenCalledWith('3201234567890123'));
    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
  });

  it('renders a generic not-found state for an unknown token', async () => {
    (publicCardApi.getByToken as any).mockRejectedValue({ response: { status: 404 } });

    renderAt(`/cek/${TOKEN}`);

    expect(await screen.findByText('Kartu tidak ditemukan')).toBeInTheDocument();
  });

  it('disables downloads when the membership is not active', async () => {
    (publicCardApi.getByToken as any).mockResolvedValue({
      data: { data: { ...response, validity: 'SUSPENDED' } },
    });

    renderAt(`/cek/${TOKEN}`);

    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh PNG/i })).toBeDisabled();
  });
});
