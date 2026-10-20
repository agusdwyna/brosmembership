import type { Request, Response, NextFunction } from 'express';
import { roleService } from './service';
import { getRolePermissions } from '../../middlewares/auth';

class RoleController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roleService.list();
      const permissions = req.user ? await getRolePermissions(req.user.role) : [];

      // The full permission sets are only needed by the role editor. Everyone
      // else (e.g. the user form's role dropdown) gets just the identifying
      // fields, so role/permission config isn't exposed to non-managers.
      if (!permissions.includes('role.manage')) {
        res.json({
          data: data.map(({ id, key, label, description, isSystem }) => ({
            id,
            key,
            label,
            description,
            isSystem,
          })),
        });
        return;
      }

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roleService.create(req.body, req.user!.id);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roleService.update(req.params.id as string, req.body, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await roleService.remove(req.params.id as string, req.user!.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const roleController = new RoleController();
