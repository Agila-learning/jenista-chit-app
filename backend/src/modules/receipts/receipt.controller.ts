import { Request, Response, NextFunction } from 'express';
import { Receipt } from './receipt.model';

export class ReceiptController {
  static async getReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerId, chitGroupId } = req.query;
      const filter: any = {};
      if (customerId) filter.customerId = customerId;
      if (chitGroupId) filter.chitGroupId = chitGroupId;

      const receipts = await Receipt.find(filter)
        .populate('paymentId')
        .populate('customerId', 'fullName customerCode');
        
      res.status(200).json({ success: true, data: receipts });
    } catch (error) {
      next(error);
    }
  }
}
