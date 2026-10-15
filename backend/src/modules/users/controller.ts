import type { Request, Response, NextFunction } from 'express';
import { userService } from './service';
import { listResponse } from '../../lib/query';

class UserController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, role, status } = req.query;
      const data = await userService.list({
        search: typeof search === 'string' ? search : undefined,
        role: typeof role === 'string' ? role : undefined,
        status: typeof status === 'string' ? status : undefined,
      });
      listResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await userService.create(req.body, req.user!.id);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await userService.update(req.params.id as string, req.body, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await userService.activate(req.params.id as string, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await userService.deactivate(req.params.id as string, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await userService.resetPassword(req.params.id as string, req.body, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
