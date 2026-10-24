import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
  static async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId, startDate, endDate } = req.query;
      const metrics = await AnalyticsService.getDashboardMetrics({
        branchId: branchId as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      res.status(200).json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }

  static async getBranchPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const performance = await AnalyticsService.getBranchPerformance();
      res.status(200).json({ success: true, data: performance });
    } catch (error) {
      next(error);
    }
  }
}
