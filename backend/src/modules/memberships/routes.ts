import { Router } from 'express';
import { membershipController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { renewMembershipSchema, changeTypeSchema } from './schema';

const router = Router();

// Membership lifecycle changes require membership.manage; view is a separate grant.
const canView = requirePermission('membership.view');
const canManage = requirePermission('membership.manage');

router.get('/', canView, membershipController.list);
router.get('/:id', canView, membershipController.getById);
router.post(
  '/:id/change-type',
  canManage,
  validate(changeTypeSchema),
  membershipController.changeType,
);
router.post('/:id/renew', canManage, validate(renewMembershipSchema), membershipController.renew);
router.post('/:id/suspend', canManage, membershipController.suspend);
router.post('/:id/cancel', canManage, membershipController.cancel);

export { router as membershipRoutes };
