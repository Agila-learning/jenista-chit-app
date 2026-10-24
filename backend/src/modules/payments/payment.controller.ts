import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { Payment } from './payment.model';
import { AuthRequest } from '../../middleware/authenticate';

export class PaymentController {
  static async processPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.processPayment(req.body, req.user!.userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await Payment.find()
        .populate('customerId', 'fullName customerCode')
        .populate('chitGroupId', 'groupName');
      res.status(200).json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  }

  // Payment Requests (Customer submissions for verification)
  static async createPaymentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { PaymentRequestModel } = await import('./payment-request.model');
      const data = req.body;
      if (!data.id) {
        data.id = `PAY-${Date.now().toString().slice(-6)}`;
      }
      const created = await PaymentRequestModel.findOneAndUpdate(
        { id: data.id },
        { $set: data },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { PaymentRequestModel } = await import('./payment-request.model');
      const { customerId, status } = req.query;
      const query: any = {};
      if (customerId) query.customerId = customerId;
      if (status) query.status = status;
      const list = await PaymentRequestModel.find(query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentRequestStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { PaymentRequestModel } = await import('./payment-request.model');
      const { id } = req.params;
      const updated = await PaymentRequestModel.findOneAndUpdate(
        { id },
        { $set: req.body },
        { new: true }
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
