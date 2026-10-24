import { Request, Response, NextFunction } from 'express';
import { Installment } from './installment.model';
import { ApiError } from '../../common/ApiError';

export class InstallmentController {
  static async getInstallments(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerId, chitGroupId, status } = req.query;
      
      const filter: any = {};
      if (customerId) filter.customerId = customerId;
      if (chitGroupId) filter.chitGroupId = chitGroupId;
      if (status) filter.status = status;

      const installments = await Installment.find(filter)
        .populate('chitGroupId', 'groupName groupCode')
        .populate('cycleId', 'cycleNumber dueDate')
        .sort({ dueDate: 1 });

      res.status(200).json({ success: true, data: installments });
    } catch (error) {
      next(error);
    }
  }
}
