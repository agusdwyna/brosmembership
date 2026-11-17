import { describe, it, expect, vi } from 'vitest';

vi.mock('../service', () => ({
  publicCardService: {
    getByToken: vi.fn().mockResolvedValue({ member: { fullName: 'Budi' } }),
    getByNik: vi.fn().mockResolvedValue({ member: { fullName: 'Budi' } }),
  },
}));

import { publicCardController } from '../controller';

/**
 * Router handlers are passed as bare functions (`router.get(path, controller.x)`),
 * so they must not rely on `this`. A `this.send(...)` implementation returned a
 * 500 at runtime; these tests call the methods unbound to keep that from
 * happening again.
 */
function fakeResponse() {
  return { set: vi.fn(), json: vi.fn() };
}

describe('PublicCardController', () => {
  it('answers a NIK lookup when the handler is called unbound', async () => {
    const handler = publicCardController.lookupByNik;
    const res = fakeResponse();
    const next = vi.fn();

    await handler({ body: { nik: '3201234567890123' } } as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.set).toHaveBeenCalledWith('X-Robots-Tag', 'noindex');
    expect(res.json).toHaveBeenCalledWith({ data: { member: { fullName: 'Budi' } } });
  });

  it('answers a token lookup when the handler is called unbound', async () => {
    const handler = publicCardController.getByToken;
    const res = fakeResponse();
    const next = vi.fn();

    await handler({ params: { token: 'a'.repeat(64) } } as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });
});
