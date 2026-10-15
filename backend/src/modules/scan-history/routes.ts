import { Router } from 'express';
import { scanHistoryController } from './controller';

const router = Router();

router.get('/', scanHistoryController.list);

export { router as scanHistoryRoutes };
