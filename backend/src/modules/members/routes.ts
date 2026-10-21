import { Router } from 'express';
import { memberController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { createMemberSchema, importMembersSchema, updateMemberSchema } from './schema';

const router = Router();

// Counter staff register/edit members; deactivation is a separate, higher grant.
const canView = requirePermission('member.view');
const canCreate = requirePermission('member.create');
const canEdit = requirePermission('member.edit');
const canManage = requirePermission('member.manage');

router.get('/', canView, memberController.list);
// Register import above `/:id` so the literal path is not read as a member id.
router.post('/import', canCreate, validate(importMembersSchema), memberController.importMany);
router.get('/:id', canView, memberController.getById);
router.post('/', canCreate, validate(createMemberSchema), memberController.create);
router.put('/:id', canEdit, validate(updateMemberSchema), memberController.update);
router.post('/:id/deactivate', canManage, memberController.deactivate);
router.post('/:id/activate', canManage, memberController.activate);

export { router as memberRoutes };
