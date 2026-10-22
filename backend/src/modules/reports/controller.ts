import type { Request, Response, NextFunction } from 'express';
import { reportService } from './service';
import { parseDateParam } from '../../lib/date-range';

class ReportController {
  async getVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        res.status(400).json({ error: 'dateFrom dan dateTo wajib diisi' });
        return;
      }

      const start = parseDateParam(dateFrom as string, false);
      const end = parseDateParam(dateTo as string, true);
      if (!start || !end) {
        res.status(400).json({ error: 'Format tanggal harus YYYY-MM-DD' });
        return;
      }

      const data = await reportService.getVerificationReport(start, end);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
