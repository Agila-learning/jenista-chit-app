import { Request, Response, NextFunction } from 'express';
import { Ledger } from './ledger.model';

export class LedgerController {
  static async getLedgerEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountType, entityId, branchId } = req.query;
      const filter: any = {};
      
      if (accountType) filter.accountType = accountType;
      if (entityId) filter.entityId = entityId;
      if (branchId) filter.branchId = branchId;

      const entries = await Ledger.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .limit(100);

      res.status(200).json({ success: true, data: entries });
    } catch (error) {
      next(error);
    }
  }
}
