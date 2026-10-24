import { Request, Response, NextFunction } from 'express';
import { ChitGroup } from './chit-group.model';
import { ChitPlan } from '../chit-plans/chit-plan.model';
import { ApiError } from '../../common/ApiError';
import { AuthRequest } from '../../middleware/authenticate';

export class ChitGroupController {
  static async createGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const existing = await ChitGroup.findOne({ groupCode: req.body.groupCode });
      if (existing) {
        throw new ApiError(400, 'Group code already exists', 'VALIDATION_ERROR');
      }

      // Snapshot the plan config
      const plan = await ChitPlan.findById(req.body.planId);
      if (!plan) {
        throw new ApiError(404, 'Plan not found', 'NOT_FOUND');
      }

      const group = await ChitGroup.create({
        ...req.body,
        planType: plan.planType,
        planSnapshot: plan.configuration,
        createdBy: req.user?.userId,
      });

      res.status(201).json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  static async getGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const groups = await ChitGroup.find()
        .populate('planId', 'planName planCode')
        .populate('branchId', 'branchName');
      res.status(200).json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  }
}
