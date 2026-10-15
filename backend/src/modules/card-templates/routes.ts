import { Router } from 'express';
import { cardTemplateController } from './controller';
import { validate } from '../../middlewares/validate';
import { requireRole } from '../../middlewares/auth';
import { createCardTemplateSchema, updateCardTemplateSchema } from './schema';
import { upload } from '../../config/uploads';

const router = Router();

// Template design is admin-only; officers only read.
const adminOnly = requireRole('ADMIN');

router.get('/', cardTemplateController.list);
router.get('/:id', cardTemplateController.getById);
router.post('/', adminOnly, validate(createCardTemplateSchema), cardTemplateController.create);
router.put('/:id', adminOnly, validate(updateCardTemplateSchema), cardTemplateController.update);
router.post('/:id/deactivate', adminOnly, cardTemplateController.deactivate);
router.post('/:id/activate', adminOnly, cardTemplateController.activate);
router.post(
  '/:id/sides/:side/upload',
  adminOnly,
  upload.single('image'),
  cardTemplateController.uploadDesign,
);

export { router as cardTemplateRoutes };
