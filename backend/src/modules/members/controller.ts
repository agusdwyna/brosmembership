import type { Request, Response, NextFunction } from 'express';
import { memberService } from './service';
import { listResponse } from '../../lib/query';

class MemberController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const data = await memberService.list(search);
      listResponse(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await memberService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await memberService.create(req.body, req.user!.id);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await memberService.update(req.params.id as string, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await memberService.deactivate(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await memberService.activate(req.params.id as string);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const memberController = new MemberController();
