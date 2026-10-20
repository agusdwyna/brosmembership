import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error]', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validasi gagal',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Map the common Prisma failures to proper HTTP statuses instead of a blanket
  // 500 — a duplicate key or a bad foreign reference is a client error.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Data sudah ada (duplikat).' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Referensi data tidak valid.' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Data tidak ditemukan.' });
      return;
    }
  }

  const status = (err as any).status || 500;
  const message = status === 500 ? 'Terjadi kesalahan server' : err.message;

  res.status(status).json({ error: message });
}
