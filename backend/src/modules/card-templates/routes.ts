import { Router } from 'express';
import { cardTemplateController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { createCardTemplateSchema, updateCardTemplateSchema } from './schema';
import { upload } from '../../config/uploads';

const router = Router();

// Template design requires cardTemplate.manage; viewing is a separate grant.
const canView = requirePermission('cardTemplate.view');
const canManage = requirePermission('cardTemplate.manage');

router.get('/', canView, cardTemplateController.list);
router.get('/:id', canView, cardTemplateController.getById);
router.post('/', canManage, validate(createCardTemplateSchema), cardTemplateController.create);
router.put('/:id', canManage, validate(updateCardTemplateSchema), cardTemplateController.update);
router.post('/:id/deactivate', canManage, cardTemplateController.deactivate);
router.post('/:id/activate', canManage, cardTemplateController.activate);
router.post(
  '/:id/sides/:side/upload',
  canManage,
  upload.single('image'),
  cardTemplateController.uploadDesign,
);

export { router as cardTemplateRoutes };
