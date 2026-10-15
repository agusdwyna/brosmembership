import type { Request, Response, NextFunction } from 'express';
import { companyService } from './service';
import { listResponse } from '../../lib/query';

class CompanyController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companyService.list();
      listResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companyService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companyService.create(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companyService.update(req.params.id as string, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companyService.deactivate(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await companyService.activate(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const companyController = new CompanyController();
