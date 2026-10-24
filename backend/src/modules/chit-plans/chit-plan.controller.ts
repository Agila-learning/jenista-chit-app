import { Request, Response, NextFunction } from 'express';
import { ChitPlan } from './chit-plan.model';
import { AuthRequest } from '../../middleware/authenticate';
import { ApiError } from '../../common/ApiError';

export class ChitPlanController {
  static async createPlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const existing = await ChitPlan.findOne({ planCode: req.body.planCode });
      if (existing) {
        throw new ApiError(400, 'Plan code already exists', 'VALIDATION_ERROR');
      }

      // Basic configuration validation can be done in service/engine layer
      const plan = await ChitPlan.create({
        ...req.body,
        createdBy: req.user?.userId,
      });

      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await ChitPlan.find({ status: 'ACTIVE' })
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName');
      res.status(200).json({ success: true, data: plans });
    } catch (error) {
      next(error);
    }
  }

  static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await ChitPlan.find()
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName');
      res.status(200).json({ success: true, data: plans });
    } catch (error) {
      next(error);
    }
  }

  static async getPlanById(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await ChitPlan.findById(req.params.id)
        .populate('companyId', 'companyName')
        .populate('branchId', 'branchName');
      if (!plan) {
        throw new ApiError(404, 'Plan not found', 'NOT_FOUND');
      }
      res.status(200).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }
}
