import { Router } from 'express';
import { companyController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { createCompanySchema, updateCompanySchema } from './schema';

const router = Router();

// Company master data: everyone with view reads it; create/edit/manage are separate grants.
const canView = requirePermission('company.view');
const canCreate = requirePermission('company.create');
const canEdit = requirePermission('company.edit');
const canManage = requirePermission('company.manage');

router.get('/', canView, companyController.list);
router.get('/:id', canView, companyController.getById);
router.post('/', canCreate, validate(createCompanySchema), companyController.create);
router.put('/:id', canEdit, validate(updateCompanySchema), companyController.update);
router.post('/:id/deactivate', canManage, companyController.deactivate);
router.post('/:id/activate', canManage, companyController.activate);

export { router as companyRoutes };
