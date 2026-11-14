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

      const planName = data.planName || data.scheme || 'Regular';
      const monthNumber = String(data.monthNumber || '1');
      const groupId = String(data.groupId || data.groupName || '');

      // Duplicate check: Do not allow duplicate payment request for same customer, same group, same plan, same month
      if (data.customerId) {
        const existing = await PaymentRequestModel.findOne({
          customerId: data.customerId,
          $or: [{ groupId }, { groupName: data.groupName || groupId }],
          planName: { $regex: new RegExp(`^${planName}$`, 'i') },
          monthNumber,
          status: { $in: ['PENDING_VERIFICATION', 'APPROVED'] },
          id: { $ne: data.id },
        });

        if (existing) {
          res.status(409).json({
            success: false,
            message: `Duplicate Payment Alert: A payment request for ${data.groupName || groupId} (${planName} Plan - Month ${monthNumber}) is already submitted and pending verification or approved. Duplicate requests are not permitted.`,
          });
          return;
        }
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

      // If approved, trigger FCM background push notification to customer
      if (req.body.status === 'APPROVED' && updated) {
        try {
          const { Customer } = await import('../customers/customer.model');
          const targetCust = await Customer.findOne({
            $or: [
              { customerCode: updated.customerId },
              { phone: updated.customerId },
              { phone: updated.mobile },
            ],
          }).lean();

          if (targetCust?.fcmToken) {
            const { sendPushNotification } = await import('../../config/firebase');
            await sendPushNotification(
              targetCust.fcmToken,
              '🎉 Payment Verified & Credited!',
              `Your installment payment of ₹${Number(updated.amount || 0).toLocaleString('en-IN')} for ${updated.groupName || updated.groupId} has been verified and added to your digital passbook.`,
              { type: 'PAYMENT_APPROVED', requestId: updated.id }
            );
          }
        } catch (pushErr) {
          console.warn('Payment approval push notification failed:', pushErr);
        }
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // Prize Money Withdrawal / Disbursal Claims
  static async createWithdrawalRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { WithdrawalRequestModel } = await import('./withdrawal-request.model');
      const data = req.body;
      if (!data.id) {
        data.id = `WDR-${Date.now().toString().slice(-6)}`;
      }
      const created = await WithdrawalRequestModel.findOneAndUpdate(
        { id: data.id },
        { $set: data },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  static async getWithdrawalRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { WithdrawalRequestModel } = await import('./withdrawal-request.model');
      const { customerId, status } = req.query;
      const query: any = {};
      if (customerId) query.customerId = customerId;
      if (status) query.status = status;
      const list = await WithdrawalRequestModel.find(query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: list });
    } catch (error) {
      next(error);
    }
  }

  static async updateWithdrawalRequestStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { WithdrawalRequestModel } = await import('./withdrawal-request.model');
      const { id } = req.params;
      const updated = await WithdrawalRequestModel.findOneAndUpdate(
        { id },
        { $set: req.body },
        { new: true }
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deletePaymentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { PaymentRequestModel } = await import('./payment-request.model');
      const { id } = req.params;
      const targetId = Array.isArray(id) ? id[0] : id;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(targetId);

      const query: any = {
        $or: [
          { id: targetId },
          ...(isObjectId ? [{ _id: targetId }] : [])
        ]
      };
      const deleted = await PaymentRequestModel.findOneAndDelete(query);
      res.status(200).json({ success: true, message: 'Payment request deleted', data: deleted });
    } catch (error) {
      next(error);
    }
  }

  static async deleteWithdrawalRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { WithdrawalRequestModel } = await import('./withdrawal-request.model');
      const { id } = req.params;
      const targetId = Array.isArray(id) ? id[0] : id;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(targetId);

      const query: any = {
        $or: [
          { id: targetId },
          ...(isObjectId ? [{ _id: targetId }] : [])
        ]
      };
      const deleted = await WithdrawalRequestModel.findOneAndDelete(query);
      res.status(200).json({ success: true, message: 'Withdrawal request deleted', data: deleted });
    } catch (error) {
      next(error);
    }
  }
}
