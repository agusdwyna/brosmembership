import { Router } from 'express';
import { membershipTypeController } from './controller';
import { validate } from '../../middlewares/validate';
import { requireRole } from '../../middlewares/auth';
import { createMembershipTypeSchema, updateMembershipTypeSchema } from './schema';

const router = Router();

// Membership type config is admin-only; officers only read it.
const adminOnly = requireRole('ADMIN');

router.get('/', membershipTypeController.list);
router.get('/:id', membershipTypeController.getById);
router.post('/', adminOnly, validate(createMembershipTypeSchema), membershipTypeController.create);
router.put(
  '/:id',
  adminOnly,
  validate(updateMembershipTypeSchema),
  membershipTypeController.update,
);
router.post('/:id/deactivate', adminOnly, membershipTypeController.deactivate);
router.post('/:id/activate', adminOnly, membershipTypeController.activate);

export { router as membershipTypeRoutes };
