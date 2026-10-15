import type { Request, Response, NextFunction } from 'express';
import { scanHistoryService } from './service';
import { listResponse, HISTORY_LIMIT } from '../../lib/query';

class ScanHistoryController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo, result } = req.query;
      const data = await scanHistoryService.list({
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        result: result as string | undefined,
      });
      listResponse(res, data, HISTORY_LIMIT);
    } catch (err) {
      next(err);
    }
  }
}

export const scanHistoryController = new ScanHistoryController();
