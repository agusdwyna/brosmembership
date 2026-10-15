import { Router } from 'express';
import { authController } from './controller';
import { validate } from '../../middlewares/validate';
import { loginSchema, registerSchema, updateMeSchema } from './schema';
import { authMiddleware, requireRole } from '../../middlewares/auth';
import { loginLimiter } from '../../middlewares/rate-limit';

const router = Router();

// Creating users is an admin-only operation. Without the guard, anyone could
// POST /auth/register and receive a valid token for a new account.
router.post(
  '/register',
  authMiddleware,
  requireRole('ADMIN'),
  validate(registerSchema),
  authController.register,
);
router.post('/login', validate(loginSchema), loginLimiter, authController.login);
router.get('/me', authMiddleware, authController.me);
router.patch('/me', authMiddleware, validate(updateMeSchema), authController.updateMe);

export { router as authRoutes };
