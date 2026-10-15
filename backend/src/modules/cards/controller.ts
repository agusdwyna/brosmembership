import type { Request, Response, NextFunction } from 'express';
import { cardService } from './service';
import { listResponse } from '../../lib/query';

class CardController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const data = await cardService.list(search);
      listResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cardService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getHistoryByMembership(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cardService.getHistoryByMembershipId(req.params.membershipId as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const cardController = new CardController();
