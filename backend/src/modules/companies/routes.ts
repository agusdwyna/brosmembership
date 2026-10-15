import { Router } from 'express';
import { companyController } from './controller';
import { validate } from '../../middlewares/validate';
import { requireRole } from '../../middlewares/auth';
import { createCompanySchema, updateCompanySchema } from './schema';

const router = Router();

// Company master data is admin-only; officers only read it.
const adminOnly = requireRole('ADMIN');

router.get('/', companyController.list);
router.get('/:id', companyController.getById);
router.post('/', adminOnly, validate(createCompanySchema), companyController.create);
router.put('/:id', adminOnly, validate(updateCompanySchema), companyController.update);
router.post('/:id/deactivate', adminOnly, companyController.deactivate);
router.post('/:id/activate', adminOnly, companyController.activate);

export { router as companyRoutes };
