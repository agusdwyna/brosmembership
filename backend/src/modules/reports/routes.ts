import { Router } from 'express';
import { reportController } from './controller';
import { requirePermission } from '../../middlewares/auth';

const router = Router();

router.get('/verifications', requirePermission('report.view'), reportController.getVerifications);

export { router as reportRoutes };
