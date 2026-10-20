import type { Request, Response, NextFunction } from 'express';
import { visitService } from './service';
import { listResponse, HISTORY_LIMIT } from '../../lib/query';

class VisitController {
  async record(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await visitService.record(req.body, req.user!.id);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query;
      const data = await visitService.list({
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });
      listResponse(res, data, HISTORY_LIMIT);
    } catch (err) {
      next(err);
    }
  }

  async byMember(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await visitService.list({ memberId: req.params.memberId as string });
      listResponse(res, data, HISTORY_LIMIT);
    } catch (err) {
      next(err);
    }
  }
}

export const visitController = new VisitController();
