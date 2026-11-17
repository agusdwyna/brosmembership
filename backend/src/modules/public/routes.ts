import { Router } from 'express';
import { publicCardController } from './controller';
import { validate } from '../../middlewares/validate';
import { publicNikLimiter, publicTokenLimiter } from '../../middlewares/rate-limit';
import { cardTokenParamSchema, nikLookupSchema } from './schema';

const router = Router();

// Both routes are intentionally unauthenticated: a member must be able to open
// their digital card before the card has been handed to them.

router.get(
  '/cards/:token',
  publicTokenLimiter,
  validate(cardTokenParamSchema, 'params'),
  publicCardController.getByToken,
);

router.post(
  '/cards/lookup',
  publicNikLimiter,
  validate(nikLookupSchema),
  publicCardController.lookupByNik,
);

export { router as publicRoutes };
