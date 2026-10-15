import { Router } from 'express';
import { memberController } from './controller';
import { validate } from '../../middlewares/validate';
import { requireRole } from '../../middlewares/auth';
import { createMemberSchema, updateMemberSchema } from './schema';

const router = Router();

// Officer needs to register members at the counter; only admin may deactivate.
const adminOrOfficer = requireRole('ADMIN', 'OFFICER');

router.get('/', memberController.list);
router.get('/:id', memberController.getById);
router.post('/', adminOrOfficer, validate(createMemberSchema), memberController.create);
router.put('/:id', adminOrOfficer, validate(updateMemberSchema), memberController.update);
router.post('/:id/deactivate', requireRole('ADMIN'), memberController.deactivate);
router.post('/:id/activate', requireRole('ADMIN'), memberController.activate);

export { router as memberRoutes };
