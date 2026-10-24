import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';

export class ReportsController {
  static async getDefaultersList(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId, minOverdueAmount, limit, page } = req.query;
      const result = await ReportsService.getDefaultersList({
        branchId: branchId as string,
        minOverdueAmount: minOverdueAmount ? Number(minOverdueAmount) : 0,
        limit: limit ? Number(limit) : 20,
        page: page ? Number(page) : 1
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getUpcomingAuctions(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId, days, limit, page } = req.query;
      const result = await ReportsService.getUpcomingAuctions({
        branchId: branchId as string,
        days: days ? Number(days) : 30,
        limit: limit ? Number(limit) : 20,
        page: page ? Number(page) : 1
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getAgentCollectionReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId, startDate, endDate, limit, page } = req.query;
      const result = await ReportsService.getAgentCollectionReports({
        agentId: agentId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? Number(limit) : 20,
        page: page ? Number(page) : 1
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
