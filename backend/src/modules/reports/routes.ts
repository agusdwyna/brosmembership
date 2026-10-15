import { Router } from 'express';
import { reportController } from './controller';

const router = Router();

router.get('/verifications', reportController.getVerifications);

export { router as reportRoutes };
