import { Router } from 'express';
import { authController } from './controller';
import { validate } from '../../middlewares/validate';
import { loginSchema, registerSchema, updateMeSchema, changePasswordSchema } from './schema';
import { authMiddleware, requirePermission } from '../../middlewares/auth';
import { loginLimiter } from '../../middlewares/rate-limit';

const router = Router();

// Creating users is an admin-only operation. Without the guard, anyone could
// POST /auth/register and receive a valid token for a new account.
router.post(
  '/register',
  authMiddleware,
  requirePermission('user.manage'),
  validate(registerSchema),
  authController.register,
);
router.post('/login', validate(loginSchema), loginLimiter, authController.login);
router.get('/me', authMiddleware, authController.me);
router.patch('/me', authMiddleware, validate(updateMeSchema), authController.updateMe);
router.patch(
  '/me/password',
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword,
);

export { router as authRoutes };
