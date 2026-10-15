import type { Request, Response, NextFunction } from 'express';
import { reportService } from './service';

class ReportController {
  async getVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        res.status(400).json({ error: 'dateFrom dan dateTo wajib diisi' });
        return;
      }

      const data = await reportService.getVerificationReport(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
