import type { Request, Response, NextFunction } from 'express';
import { visitService } from './service';
import { listResponse, HISTORY_LIMIT } from '../../lib/query';
import { parseDateRange } from '../../lib/date-range';

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

      // Same contract as scan history: 400 for a malformed date, and `dateTo`
      // includes the whole final day instead of stopping at midnight.
      const range = parseDateRange(dateFrom, dateTo);
      if (!range) {
        res.status(400).json({ error: 'Format tanggal harus YYYY-MM-DD' });
        return;
      }

      const data = await visitService.list({ dateFrom: range.from, dateTo: range.to });
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
