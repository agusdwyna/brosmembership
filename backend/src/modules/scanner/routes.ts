import { Router } from 'express';
import { scannerController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { verifySchema } from './schema';

const router = Router();

router.post(
  '/verify',
  requirePermission('scan.perform'),
  validate(verifySchema),
  scannerController.verify,
);

export { router as scannerRoutes };
