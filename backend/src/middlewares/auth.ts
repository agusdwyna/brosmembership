import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token tidak ditemukan' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as AuthUser & { type?: string };

    // Both tokens are signed with the same secret, so without this check the
    // 7-day refresh token would also authenticate — a much longer-lived
    // credential than the 1-day access token it is meant to sit beside.
    if (payload.type === 'refresh') {
      res.status(401).json({ error: 'Token tidak valid atau expired' });
      return;
    }

    // Re-check the user on every request. The JWT can stay valid for a day, so
    // without this a deactivated account (or a demoted admin) would keep its
    // old access until the token expired. Role is taken from the DB, not the
    // token, so a role change takes effect immediately.
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({ error: 'Akun tidak aktif atau tidak ditemukan' });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid atau expired' });
  }
}

/**
 * Role → permissions memoized in-process. Roles change rarely, so a plain Map
 * avoids a DB round-trip on every request; the roles module clears it on write.
 */
const rolePermissionCache = new Map<string, string[]>();

export function clearRolePermissionCache(): void {
  rolePermissionCache.clear();
}

export async function getRolePermissions(roleKey: string): Promise<string[]> {
  const cached = rolePermissionCache.get(roleKey);
  if (cached) return cached;

  const role = await prisma.role.findUnique({
    where: { key: roleKey },
    select: { permissions: true },
  });
  const permissions = role?.permissions ?? [];
  rolePermissionCache.set(roleKey, permissions);
  return permissions;
}

/** Passes when the caller's role grants ANY of the required permissions. */
export function requirePermission(...required: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({ error: 'Akses ditolak' });
        return;
      }
      const permissions = await getRolePermissions(req.user.role);
      if (!required.some((permission) => permissions.includes(permission))) {
        res.status(403).json({ error: 'Akses ditolak' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Legacy name-based guard, kept for call sites not yet migrated to permissions. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Akses ditolak' });
      return;
    }
    next();
  };
}
