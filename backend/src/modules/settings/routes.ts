import { Router } from 'express';
import { settingsController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { updateSettingsSchema } from './schema';

const router = Router();

// Every authenticated user reads settings (brand name, scanner default, ...),
// but only admins may change application-wide configuration.
router.get('/', settingsController.getAll);
router.patch(
  '/',
  requirePermission('settings.manage'),
  validate(updateSettingsSchema),
  settingsController.update,
);

export { router as settingsRoutes };
