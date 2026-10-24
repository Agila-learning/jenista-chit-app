import mongoose from 'mongoose';
import { Payment } from './payment.model';
import { Installment } from '../installments/installment.model';
import { ChitMember } from '../chit-members/chit-member.model';
import { Receipt } from '../receipts/receipt.model';
import { ApiError } from '../../common/ApiError';

export class PaymentService {
  static async processPayment(data: any, userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { customerId, chitGroupId, chitMemberId, installmentId, amount, paymentMethod, transactionReference, branchId, idempotencyKey } = data;

      if (idempotencyKey) {
        const existingPayment = await Payment.findOne({ idempotencyKey }).session(session);
        if (existingPayment) {
          await session.abortTransaction();
          return existingPayment;
        }
      }

      const installment = await Installment.findById(installmentId).session(session);
      if (!installment) {
        throw new ApiError(404, 'Installment not found', 'NOT_FOUND');
      }

      if (installment.status === 'PAID') {
        throw new ApiError(400, 'Installment already paid', 'INVALID_OPERATION');
      }

      // Check amount
      if (amount > installment.pendingAmount) {
        throw new ApiError(400, 'Payment amount exceeds pending amount', 'INVALID_OPERATION');
      }

      // 1. Create Payment
      const paymentNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const payment = await Payment.create([{
        paymentNumber,
        customerId,
        chitGroupId,
        chitMemberId,
        installmentId,
        amount,
        paymentMethod,
        transactionReference,
        status: 'SUCCESS',
        branchId,
        collectedBy: userId,
        idempotencyKey
      }], { session });

      // 2. Update Installment
      installment.paidAmount += amount;
      installment.pendingAmount -= amount;
      if (installment.pendingAmount <= 0) {
        installment.status = 'PAID';
        installment.paidAt = new Date();
      } else {
        installment.status = 'PARTIAL';
      }
      await installment.save({ session });

      // 3. Update Member Summary
      await ChitMember.findByIdAndUpdate(chitMemberId, {
        $inc: {
          totalPaid: amount,
          totalDue: -amount,
          totalPending: -amount,
        }
      }, { session });

      // 4. Create Receipt
      const receiptNumber = `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const receipt = await Receipt.create([{
        receiptNumber,
        paymentId: payment[0]._id,
        customerId,
        chitGroupId,
        amount,
        paymentMethod,
        generatedBy: userId
      }], { session });

      // TODO: Create Ledger Entry
      // TODO: Create Audit Log
      // TODO: Create Notification

      await session.commitTransaction();
      session.endSession();

      return { payment: payment[0], receipt: receipt[0] };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
