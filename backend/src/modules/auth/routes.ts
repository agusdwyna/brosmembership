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
// Limiter BEFORE validation: a malformed body used to be rejected by Zod before
// the throttle counted it, so a brute-force loop could send garbage bodies for
// free. Order does not weaken normal use — the key is IP + submitted email.
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.me);
router.patch('/me', authMiddleware, validate(updateMeSchema), authController.updateMe);
router.patch(
  '/me/password',
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword,
);

export { router as authRoutes };
