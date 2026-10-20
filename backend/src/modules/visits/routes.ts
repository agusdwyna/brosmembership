import { Router } from 'express';
import { visitController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { createVisitSchema } from './schema';

const router = Router();

router.post(
  '/',
  requirePermission('visit.create'),
  validate(createVisitSchema),
  visitController.record,
);
router.get('/', requirePermission('visit.view'), visitController.list);
router.get('/member/:memberId', requirePermission('visit.view'), visitController.byMember);

export { router as visitRoutes };
