import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import type { LoginInput, RegisterInput, UpdateMeInput, ChangePasswordInput } from './schema';
import type { AuthTokens, AuthUser } from './types';
import { getRolePermissions } from '../../middlewares/auth';
import { activityLogService } from '../activity-log/service';

const SALT_ROUNDS = 10;

export class AuthService {
  async register(input: RegisterInput): Promise<AuthUser> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw Object.assign(new Error('Email sudah terdaftar'), { status: 409 });
    }

    const role = await prisma.role.findUnique({ where: { key: input.role } });
    if (!role) throw Object.assign(new Error('Role tidak ditemukan'), { status: 400 });

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
      },
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async login(input: LoginInput): Promise<AuthTokens & { user: AuthUser }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.status !== 'ACTIVE') {
      throw Object.assign(new Error('Email atau password salah'), { status: 401 });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error('Email atau password salah'), { status: 401 });
    }

    const tokens = this.generateTokens({ id: user.id, email: user.email, role: user.role });
    const permissions = await getRolePermissions(user.role);

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions },
    };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error('User tidak ditemukan'), { status: 404 });
    }
    const permissions = await getRolePermissions(user.role);
    return { id: user.id, email: user.email, name: user.name, role: user.role, permissions };
  }

  async updateMe(userId: string, input: UpdateMeInput): Promise<AuthUser> {
    if (input.email) {
      const existing = await prisma.user.findFirst({
        where: { email: input.email, id: { not: userId } },
      });
      if (existing) throw Object.assign(new Error('Email sudah terdaftar'), { status: 409 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
    });
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  /** Self-service password change: the current password must be supplied. */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error('User tidak ditemukan'), { status: 404 });

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Password lama salah'), { status: 400 });

    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    await activityLogService.log({
      action: 'CHANGE_PASSWORD',
      description: `Password user ${user.email} diubah`,
      performedBy: userId,
    });
  }

  generateTokens(payload: { id: string; email: string; role: string }): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
