import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { Role } from '../modules/roles/role.model';
import { ApiError } from '../common/ApiError';

export const authorize = (requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');
      }

      // Fetch user's roles
      const roles = await Role.find({ _id: { $in: req.user.roleIds }, status: 'ACTIVE' });
      
      const userPermissions = new Set<string>();
      roles.forEach(role => {
        role.permissions.forEach(permission => userPermissions.add(permission));
      });

      const hasPermission = requiredPermissions.every(permission => userPermissions.has(permission));

      if (!hasPermission) {
        throw new ApiError(403, 'Forbidden: Insufficient permissions', 'FORBIDDEN');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
