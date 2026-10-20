import type { Request, Response, NextFunction } from 'express';
import { reportService } from './service';

/**
 * Parse a YYYY-MM-DD query value in server-local time. The UI sends plain dates,
 * so `dateTo` must cover the whole final day instead of stopping at midnight.
 */
function parseDate(value: string, endOfDay: boolean): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );

  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? date : null;
}

class ReportController {
  async getVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        res.status(400).json({ error: 'dateFrom dan dateTo wajib diisi' });
        return;
      }

      const start = parseDate(dateFrom as string, false);
      const end = parseDate(dateTo as string, true);
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
