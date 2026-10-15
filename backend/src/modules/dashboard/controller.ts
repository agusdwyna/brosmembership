import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from './service';

class DashboardController {
  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getSummary();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
