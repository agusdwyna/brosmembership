import type { Request, Response, NextFunction } from 'express';
import { scanHistoryService } from './service';
import { listResponse, HISTORY_LIMIT } from '../../lib/query';
import { parseDateRange } from '../../lib/date-range';

class ScanHistoryController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo, result } = req.query;

      // An unparseable value used to become an Invalid Date and fail inside
      // Prisma as a 500; answer 400 instead. dateTo now covers the whole day.
      const range = parseDateRange(dateFrom, dateTo);
      if (!range) {
        res.status(400).json({ error: 'Format tanggal harus YYYY-MM-DD' });
        return;
      }

      const data = await scanHistoryService.list({
        dateFrom: range.from,
        dateTo: range.to,
        result: typeof result === 'string' ? result : undefined,
      });
      listResponse(res, data, HISTORY_LIMIT);
    } catch (err) {
      next(err);
    }
  }
}

export const scanHistoryController = new ScanHistoryController();
