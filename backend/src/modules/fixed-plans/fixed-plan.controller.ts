import { Request, Response, NextFunction } from 'express';
import { FixedPlanService } from './fixed-plan.service';
import { AuthRequest } from '../../middleware/authenticate';

export class FixedPlanController {
  static async processCycle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { cycleId } = req.params;
      const result = await FixedPlanService.processCycle(cycleId as string, req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
