import type { Request, Response, NextFunction } from 'express';
import { publicCardService } from './service';

/** Card data is personal: never cache it at the edge, never index it. */
function send(res: Response, data: unknown): void {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex');
  res.json({ data });
}

class PublicCardController {
  async getByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicCardService.getByToken(String(req.params.token));
      send(res, data);
    } catch (err) {
      next(err);
    }
  }

  async lookupByNik(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicCardService.getByNik(req.body.nik);
      send(res, data);
    } catch (err) {
      next(err);
    }
  }
}

export const publicCardController = new PublicCardController();
