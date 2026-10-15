import type { Request, Response, NextFunction } from 'express';
import { activityLogService } from './service';
import { listResponse, HISTORY_LIMIT } from '../../lib/query';

class ActivityLogController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, action } = req.query;
      const data = await activityLogService.list({
        search: typeof search === 'string' ? search : undefined,
        action: typeof action === 'string' ? action : undefined,
      });
      listResponse(res, data, HISTORY_LIMIT);
    } catch (err) {
      next(err);
    }
  }

  async getByMemberId(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await activityLogService.getByMemberId(req.params.memberId as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const activityLogController = new ActivityLogController();
