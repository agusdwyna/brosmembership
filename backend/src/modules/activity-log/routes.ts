import { Router } from 'express';
import { activityLogController } from './controller';
import { requirePermission } from '../../middlewares/auth';

const router = Router();

// Both views expose the audit trail, so both require activityLog.view.
router.get('/', requirePermission('activityLog.view'), activityLogController.list);
router.get(
  '/member/:memberId',
  requirePermission('activityLog.view'),
  activityLogController.getByMemberId,
);

export { router as activityLogRoutes };
