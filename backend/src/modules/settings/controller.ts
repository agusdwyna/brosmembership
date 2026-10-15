import type { Request, Response, NextFunction } from 'express';
import { settingsService } from './service';

class SettingsController {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getAll();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.update(req.body, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();
