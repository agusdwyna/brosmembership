import { Router } from 'express';
import { membershipTypeController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { createMembershipTypeSchema, updateMembershipTypeSchema } from './schema';

const router = Router();

// Membership type config: view for everyone; create/edit/manage are separate grants.
const canView = requirePermission('membershipType.view');
const canCreate = requirePermission('membershipType.create');
const canEdit = requirePermission('membershipType.edit');
const canManage = requirePermission('membershipType.manage');

router.get('/', canView, membershipTypeController.list);
router.get('/:id', canView, membershipTypeController.getById);
router.post('/', canCreate, validate(createMembershipTypeSchema), membershipTypeController.create);
router.put('/:id', canEdit, validate(updateMembershipTypeSchema), membershipTypeController.update);
router.post('/:id/deactivate', canManage, membershipTypeController.deactivate);
router.post('/:id/activate', canManage, membershipTypeController.activate);

export { router as membershipTypeRoutes };
