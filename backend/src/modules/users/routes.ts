import { Router } from 'express';
import { userController } from './controller';
import { validate } from '../../middlewares/validate';
import { requireRole } from '../../middlewares/auth';
import { createUserSchema, resetPasswordSchema, updateUserSchema } from './schema';

const router = Router();

// User management is admin-only. Applied to the whole router.
router.use(requireRole('ADMIN'));

router.get('/', userController.list);
router.post('/', validate(createUserSchema), userController.create);
router.put('/:id', validate(updateUserSchema), userController.update);
router.post('/:id/activate', userController.activate);
router.post('/:id/deactivate', userController.deactivate);
router.post('/:id/reset-password', validate(resetPasswordSchema), userController.resetPassword);

export { router as userRoutes };
