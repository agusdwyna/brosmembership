import { Router } from 'express';
import { scannerController } from './controller';
import { validate } from '../../middlewares/validate';
import { verifySchema } from './schema';

const router = Router();

router.post('/verify', validate(verifySchema), scannerController.verify);

export { router as scannerRoutes };
