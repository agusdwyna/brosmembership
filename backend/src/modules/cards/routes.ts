import { Router } from 'express';
import { cardController } from './controller';

const router = Router();

router.get('/', cardController.list);
router.get('/:id', cardController.getById);
router.get('/membership/:membershipId/history', cardController.getHistoryByMembership);

export { router as cardRoutes };
