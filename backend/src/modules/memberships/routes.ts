import { Router } from 'express';
import { membershipController } from './controller';
import { validate } from '../../middlewares/validate';
import { requireRole } from '../../middlewares/auth';
import { renewMembershipSchema, changeTypeSchema } from './schema';

const router = Router();

// Membership lifecycle changes are admin-only; officers only read.
const adminOnly = requireRole('ADMIN');

router.get('/', membershipController.list);
router.get('/:id', membershipController.getById);
router.post(
  '/:id/change-type',
  adminOnly,
  validate(changeTypeSchema),
  membershipController.changeType,
);
router.post('/:id/renew', adminOnly, validate(renewMembershipSchema), membershipController.renew);
router.post('/:id/suspend', adminOnly, membershipController.suspend);
router.post('/:id/cancel', adminOnly, membershipController.cancel);

export { router as membershipRoutes };
