import type { Request, Response, NextFunction } from 'express';
import { scannerService } from './service';

class ScannerController {
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await scannerService.verify(req.body, req.user!.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const scannerController = new ScannerController();
