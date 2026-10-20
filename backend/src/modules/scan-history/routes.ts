import { Router } from 'express';
import { scanHistoryController } from './controller';
import { requirePermission } from '../../middlewares/auth';

const router = Router();

router.get('/', requirePermission('scanHistory.view'), scanHistoryController.list);

export { router as scanHistoryRoutes };
