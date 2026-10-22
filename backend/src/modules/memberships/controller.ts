import type { Request, Response, NextFunction } from 'express';
import { membershipService } from './service';
import { listResponse, HISTORY_LIMIT } from '../../lib/query';

class MembershipController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.query.memberId as string | undefined;
      const data = await membershipService.list(memberId);
      listResponse(res, data, HISTORY_LIMIT);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async changeType(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipService.changeType(
        req.params.id as string,
        req.body,
        req.user!.id,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async renew(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipService.renew(req.params.id as string, req.body, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updateDates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipService.updateDates(
        req.params.id as string,
        req.body,
        req.user!.id,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async suspend(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipService.suspend(req.params.id as string, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipService.cancel(req.params.id as string, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const membershipController = new MembershipController();
