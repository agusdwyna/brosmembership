import { Router } from 'express';
import { cardController } from './controller';
import { requirePermission } from '../../middlewares/auth';

const router = Router();

const canView = requirePermission('card.view');

router.get('/', canView, cardController.list);
router.get('/:id', canView, cardController.getById);
router.get('/membership/:membershipId/history', canView, cardController.getHistoryByMembership);

export { router as cardRoutes };
