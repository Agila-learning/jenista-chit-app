import { Request, Response, NextFunction } from 'express';
import { Role } from './role.model';
import { ApiError } from '../../common/ApiError';

export class RoleController {
  static async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name, description, permissions } = req.body;

      const existingRole = await Role.findOne({ code });
      if (existingRole) {
        throw new ApiError(400, 'Role code already exists', 'VALIDATION_ERROR');
      }

      const role = await Role.create({ code, name, description, permissions });

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await Role.find();
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }
}
