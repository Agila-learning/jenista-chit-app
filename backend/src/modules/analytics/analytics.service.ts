import mongoose from 'mongoose';
import { Payment } from '../payments/payment.model';
import { Installment } from '../installments/installment.model';
import { ChitMember } from '../chit-members/chit-member.model';
import { Ledger } from '../ledgers/ledger.model';

export class AnalyticsService {
  static async getDashboardMetrics(filters: { branchId?: string; startDate?: string; endDate?: string }) {
    const { branchId, startDate, endDate } = filters;
    const matchQuery: any = {};
    if (branchId) matchQuery.branchId = new mongoose.Types.ObjectId(branchId);
    if (startDate || endDate) {
      matchQuery.paymentDate = {};
      if (startDate) matchQuery.paymentDate.$gte = new Date(startDate);
      if (endDate) matchQuery.paymentDate.$lte = new Date(endDate);
    }

    // 1. Total Collections
    const collections = await Payment.aggregate([
      { $match: { ...matchQuery, status: 'SUCCESS' } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
    ]);

    // 2. Overdue Rates
    const overdueInstallments = await Installment.aggregate([
      { $match: { status: 'OVERDUE' } },
      { $group: { _id: null, totalOverdue: { $sum: '$pendingAmount' } } }
    ]);

    // 3. Active Members Count
    const activeMembers = await ChitMember.countDocuments({ status: 'ACTIVE' });

    // 4. Company Revenue (Commission)
    const revenue = await Ledger.aggregate([
      { $match: { accountType: 'COMMISSION' } },
      { $group: { _id: null, totalRevenue: { $sum: '$credit' } } }
    ]);

    return {
      totalCollected: collections[0]?.totalCollected || 0,
      totalOverdue: overdueInstallments[0]?.totalOverdue || 0,
      activeMembers,
      totalRevenue: revenue[0]?.totalRevenue || 0,
    };
  }

  static async getBranchPerformance() {
    return await Payment.aggregate([
      { $match: { status: 'SUCCESS' } },
      {
        $group: {
          _id: '$branchId',
          totalCollections: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branchDetails'
        }
      },
      { $unwind: '$branchDetails' },
      {
        $project: {
          branchName: '$branchDetails.branchName',
          totalCollections: 1,
          transactionCount: 1
        }
      },
      { $sort: { totalCollections: -1 } }
    ]);
  }
}
