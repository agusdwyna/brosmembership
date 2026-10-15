import type { Request, Response, NextFunction } from 'express';
import { membershipTypeService } from './service';
import { listResponse } from '../../lib/query';

class MembershipTypeController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipTypeService.list();
      listResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipTypeService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipTypeService.create(req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipTypeService.update(req.params.id as string, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipTypeService.deactivate(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await membershipTypeService.activate(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const membershipTypeController = new MembershipTypeController();
