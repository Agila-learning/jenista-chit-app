import { Request, Response, NextFunction } from 'express';
import { Receipt } from './receipt.model';
import { Customer } from '../customers/customer.model';

export class ReceiptController {
  static async createReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        receiptNo,
        receiptNumber,
        customerId,
        customerName,
        chitGroup,
        groupName,
        amount,
        paymentMode,
        paymentMethod,
        referenceNo,
        executive,
        receiptDate,
      } = req.body;

      const rNum = (receiptNo || receiptNumber || `REC-${Date.now().toString().slice(-6)}`).trim();
      const rAmount = Number(amount || 0);

      const receipt = await Receipt.create({
        receiptNumber: rNum,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        chitGroupId: chitGroup || undefined,
        groupName: groupName || chitGroup || undefined,
        amount: rAmount,
        paymentMethod: paymentMode || paymentMethod || 'CASH',
        referenceNo: referenceNo || '',
        executive: executive || '',
        receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
        status: 'ACTIVE',
      });

      // Update customer totalPaid and pending balance in MongoDB
      if (customerId || customerName) {
        const query: any[] = [];
        if (customerId) {
          query.push({ customerCode: customerId });
          query.push({ phone: customerId });
          if (/^[0-9a-fA-F]{24}$/.test(customerId)) {
            query.push({ _id: customerId });
          }
        }
        if (customerName) {
          query.push({ fullName: customerName });
        }

        const customer = await Customer.findOne({ $or: query });
        if (customer) {
          customer.totalPaid = (Number(customer.totalPaid) || 0) + rAmount;
          customer.pending = Math.max(0, (Number(customer.pending) || 0) - rAmount);
          if (Array.isArray(customer.chits) && (chitGroup || groupName)) {
            customer.chits.forEach((ch: any) => {
              if (ch.groupId === chitGroup || ch.groupName === chitGroup || ch.groupName === groupName) {
                ch.paymentStatus = 'PAID';
                ch.totalPaid = (Number(ch.totalPaid) || 0) + rAmount;
              }
            });
            customer.markModified('chits');
          }
          await customer.save();
        }
      }

      res.status(201).json({ success: true, message: 'Receipt recorded successfully', data: receipt });
    } catch (error) {
      next(error);
    }
  }

  static async getReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerId, chitGroupId } = req.query;
      const filter: any = {};
      if (customerId) filter.customerId = customerId;
      if (chitGroupId) filter.chitGroupId = chitGroupId;

      const receipts = await Receipt.find(filter)
        .sort({ receiptDate: -1, createdAt: -1 })
        .limit(200);

      res.status(200).json({ success: true, data: receipts });
    } catch (error) {
      next(error);
    }
  }
}
