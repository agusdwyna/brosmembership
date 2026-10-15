import type { Request, Response, NextFunction } from 'express';
import { cardTemplateService } from './service';
import { saveUploadedImage } from '../../config/uploads';
import { listResponse } from '../../lib/query';

class CardTemplateController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cardTemplateService.list();
      listResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cardTemplateService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cardTemplateService.create(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cardTemplateService.update(req.params.id as string, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cardTemplateService.deactivate(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cardTemplateService.activate(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async uploadDesign(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'File tidak ditemukan' });
        return;
      }

      const side = req.params.side as string; // 'FRONT' or 'BACK'
      if (!side || !['FRONT', 'BACK'].includes(side)) {
        res.status(400).json({ error: 'Parameter side harus FRONT atau BACK' });
        return;
      }

      // Validate the actual bytes and persist under a safe, random name.
      const designUrl = saveUploadedImage(file);
      if (!designUrl) {
        res.status(400).json({ error: 'Format file tidak didukung. Gunakan PNG, JPG, atau WEBP.' });
        return;
      }

      const data = await cardTemplateService.updateSideDesign(
        req.params.id as string,
        side,
        designUrl,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const cardTemplateController = new CardTemplateController();
