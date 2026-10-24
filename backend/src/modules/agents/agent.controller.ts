import { Request, Response, NextFunction } from 'express';
import { User } from '../users/user.model';
import { Role } from '../roles/role.model';

export class AgentController {
  static async getAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await Role.findOne({ code: 'COLLECTION_AGENT' });
      if (!role) {
        return res.status(200).json({ success: true, data: [] });
      }

      const agents = await User.find({ roleIds: role._id }).select('-passwordHash');
      res.status(200).json({ success: true, data: agents });
    } catch (error) {
      next(error);
    }
  }
}
