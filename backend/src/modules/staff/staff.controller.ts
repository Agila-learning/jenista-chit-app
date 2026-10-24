import { Request, Response, NextFunction } from 'express';
import { User } from '../users/user.model';
import { Role } from '../roles/role.model';

export class StaffController {
  static async getStaff(req: Request, res: Response, next: NextFunction) {
    try {
      // Find roles that map to 'STAFF' conceptually, e.g. code: 'STAFF'
      const role = await Role.findOne({ code: 'STAFF' });
      if (!role) {
        return res.status(200).json({ success: true, data: [] });
      }

      const staff = await User.find({ roleIds: role._id }).select('-passwordHash');
      res.status(200).json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  }
}
