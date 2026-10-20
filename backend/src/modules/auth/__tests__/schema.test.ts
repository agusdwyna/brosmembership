import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '../schema';

describe('auth schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid login input', () => {
      const result = loginSchema.safeParse({
        email: 'admin@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = loginSchema.safeParse({
        email: 'admin@example.com',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('accepts valid register input', () => {
      const result = registerSchema.safeParse({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('OFFICER'); // default
      }
    });

    it('accepts register with ADMIN role', () => {
      const result = registerSchema.safeParse({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'ADMIN',
      });
      expect(result.success).toBe(true);
    });

    it('accepts a custom role key (validated against the roles table later)', () => {
      const result = registerSchema.safeParse({
        email: 'sup@example.com',
        password: 'password123',
        name: 'Supervisor',
        role: 'SUPERVISOR',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const result = registerSchema.safeParse({
        email: 'new@example.com',
        password: 'password123',
        name: 'A',
      });
      expect(result.success).toBe(false);
    });
  });
});
