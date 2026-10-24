import mongoose from 'mongoose';
import { Installment } from '../installments/installment.model';
import { Auction } from '../auctions/auction.model';
import { Payment } from '../payments/payment.model';
import { ChitMember } from '../chit-members/chit-member.model';

export class ReportsService {
  static async getDefaultersList(params: { branchId?: string; minOverdueAmount: number; limit: number; page: number }) {
    const { minOverdueAmount, limit, page } = params;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: { status: 'OVERDUE', pendingAmount: { $gte: minOverdueAmount } } },
      {
        $group: {
          _id: '$customerId',
          totalOverdue: { $sum: '$pendingAmount' },
          installments: { $push: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      { $unwind: '$customerDetails' },
      { $sort: { totalOverdue: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    // Note: Branch filtering would require joining with branches or storing branchId on installments
    const results = await Installment.aggregate(pipeline);
    return results;
  }

  static async getUpcomingAuctions(params: { branchId?: string; days: number; limit: number; page: number }) {
    const { days, limit, page } = params;
    const skip = (page - 1) * limit;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const matchQuery: any = {
      status: 'SCHEDULED',
      scheduledDate: { $gte: new Date(), $lte: futureDate }
    };

    const results = await Auction.find(matchQuery)
      .populate('chitGroupId', 'groupName groupCode')
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Auction.countDocuments(matchQuery);

    return { results, total, page, limit };
  }

  static async getAgentCollectionReports(params: { agentId?: string; startDate?: string; endDate?: string; limit: number; page: number }) {
    const { agentId, startDate, endDate, limit, page } = params;
    const skip = (page - 1) * limit;

    const matchQuery: any = { status: 'SUCCESS' };
    if (agentId) {
      // Find members assigned to this agent
      const members = await ChitMember.find({ agentId: new mongoose.Types.ObjectId(agentId) });
      const memberIds = members.map(m => m._id);
      matchQuery.chitMemberId = { $in: memberIds };
    }

    if (startDate || endDate) {
      matchQuery.paymentDate = {};
      if (startDate) matchQuery.paymentDate.$gte = new Date(startDate);
      if (endDate) matchQuery.paymentDate.$lte = new Date(endDate);
    }

    const results = await Payment.find(matchQuery)
      .populate('customerId', 'fullName')
      .populate('chitGroupId', 'groupName')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(matchQuery);

    return { results, total, page, limit };
  }
}
