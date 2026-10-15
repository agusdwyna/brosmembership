import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

vi.mock('../../config/env', () => ({
  env: { JWT_SECRET: 'test-secret' },
}));

import { prisma } from '../../config/database';
import { authMiddleware } from '../auth';

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const token = jwt.sign({ id: 'u1', email: 'a@b.co', role: 'ADMIN' }, 'test-secret', {
  expiresIn: '1d',
});

beforeEach(() => vi.clearAllMocks());

describe('authMiddleware', () => {
  it('rejects a request with no bearer token', async () => {
    const req: any = { headers: {} };
    const res = makeRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a deactivated user even with a valid token', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      role: 'ADMIN',
      status: 'INACTIVE',
    });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a deleted user even with a valid token', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('trusts the role from the DB, not the token (demotion takes effect)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      role: 'OFFICER',
      status: 'ACTIVE',
    });
    // Token still claims ADMIN — it must be ignored.
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.role).toBe('OFFICER');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const bad = jwt.sign({ id: 'u1', role: 'ADMIN' }, 'wrong-secret');
    const req: any = { headers: { authorization: `Bearer ${bad}` } };
    const res = makeRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
