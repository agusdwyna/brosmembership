import { Router } from 'express';
import { dashboardController } from './controller';
import { requirePermission } from '../../middlewares/auth';

const router = Router();

router.get('/', requirePermission('dashboard.view'), dashboardController.getSummary);

export { router as dashboardRoutes };
