import { Router } from 'express';
import { roleController } from './controller';
import { validate } from '../../middlewares/validate';
import { requirePermission } from '../../middlewares/auth';
import { createRoleSchema, updateRoleSchema } from './schema';

const router = Router();

// Reading roles is open to any authenticated user (the user form needs the list
// for its role dropdown); changing them requires the role.manage permission.
router.get('/', roleController.list);
router.post(
  '/',
  requirePermission('role.manage'),
  validate(createRoleSchema),
  roleController.create,
);
router.put(
  '/:id',
  requirePermission('role.manage'),
  validate(updateRoleSchema),
  roleController.update,
);
router.delete('/:id', requirePermission('role.manage'), roleController.remove);

export { router as roleRoutes };
