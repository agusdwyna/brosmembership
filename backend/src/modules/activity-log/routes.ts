import { Router } from 'express';
import { activityLogController } from './controller';
import { requireRole } from '../../middlewares/auth';

const router = Router();

// Global audit trail is admin-only; the per-member view stays available to all
// authenticated users (it is linked from the member detail page).
router.get('/', requireRole('ADMIN'), activityLogController.list);
router.get('/member/:memberId', activityLogController.getByMemberId);

export { router as activityLogRoutes };
