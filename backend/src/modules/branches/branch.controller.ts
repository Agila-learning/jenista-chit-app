import { Request, Response, NextFunction } from 'express';
import { Branch } from './branch.model';
import { ApiError } from '../../common/ApiError';

export class BranchController {
  static async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await Branch.findOne({ branchCode: req.body.branchCode });
      if (existing) {
        throw new ApiError(400, 'Branch code already exists', 'VALIDATION_ERROR');
      }

      const branch = await Branch.create(req.body);
      res.status(201).json({ success: true, data: branch });
    } catch (error) {
      next(error);
    }
  }

  static async getBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const branches = await Branch.find().populate('companyId').populate('managerId', 'name email phone');
      res.status(200).json({ success: true, data: branches });
    } catch (error) {
      next(error);
    }
  }
}
