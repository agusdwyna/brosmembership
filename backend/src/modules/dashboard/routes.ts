import { Router } from 'express';
import { dashboardController } from './controller';

const router = Router();

router.get('/', dashboardController.getSummary);

export { router as dashboardRoutes };
