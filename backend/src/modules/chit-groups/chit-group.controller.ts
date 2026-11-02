import { Request, Response, NextFunction } from 'express';
import { ChitGroup } from './chit-group.model';
import { ChitPlan } from '../chit-plans/chit-plan.model';
import { ApiError } from '../../common/ApiError';
import { AuthRequest } from '../../middleware/authenticate';

export class ChitGroupController {
  static async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const gCode = (req.body.groupCode || req.body.id || req.body.groupName || req.body.name || `CG-${Date.now().toString().slice(-4)}`).trim();
      const gName = (req.body.groupName || req.body.name || gCode).trim();
      const val = Number(req.body.chitValue || req.body.value || 100000);
      const dur = Number(req.body.durationMonths || req.body.duration || 20);
      const members = Number(req.body.memberCount || req.body.members || 20);
      const monthly = Number(req.body.monthlyInstallment || (dur > 0 ? Math.round(val / dur) : 5000));
      const pType = req.body.planType || req.body.type || 'AUCTION';

      let existing = await ChitGroup.findOne({
        $or: [{ groupCode: gCode }, { groupName: gName }]
      });

      if (existing) {
        existing.chitValue = val;
        existing.durationMonths = dur;
        existing.memberCount = members;
        existing.monthlyInstallment = monthly;
        existing.planType = pType;
        await existing.save();
        res.status(200).json({ success: true, message: 'Group updated successfully', data: existing });
        return;
      }

      let planSnapshot: any = {};
      if (req.body.planId) {
        const plan = await ChitPlan.findById(req.body.planId);
        if (plan) {
          planSnapshot = plan.configuration;
        }
      }

      const group = await ChitGroup.create({
        groupCode: gCode,
        groupName: gName,
        planType: pType,
        chitValue: val,
        durationMonths: dur,
        memberCount: members,
        monthlyInstallment: monthly,
        planSnapshot,
        status: req.body.status || 'ACTIVE',
        branchId: req.body.branchId || undefined,
        createdBy: (req as any).user?.userId || undefined,
      });

      res.status(201).json({ success: true, message: 'Group created successfully', data: group });
    } catch (error) {
      next(error);
    }
  }

  static async getGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const groups = await ChitGroup.find()
        .populate('planId', 'planName planCode')
        .populate('branchId', 'branchName')
        .sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  }

  static async getGroupById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const isObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
      const group = await ChitGroup.findOne(
        isObjectId ? { $or: [{ _id: id }, { groupCode: id }, { groupName: id }] } : { $or: [{ groupCode: id }, { groupName: id }] }
      );
      if (!group) {
        throw new ApiError(404, 'Chit Group not found', 'NOT_FOUND');
      }
      res.status(200).json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  static async deleteGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const cleanId = decodeURIComponent(rawId || '').trim();
      const isObjectId = typeof cleanId === 'string' && /^[0-9a-fA-F]{24}$/.test(cleanId);

      const orConditions: any[] = [
        { groupCode: cleanId },
        { groupName: cleanId },
        { groupName: new RegExp('^' + cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
        { groupCode: new RegExp('^' + cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
      ];
      if (isObjectId) {
        orConditions.unshift({ _id: cleanId });
      }

      const existingGroup = await ChitGroup.findOne({ $or: orConditions });

      const allGroupCodes = new Set<string>();
      const allGroupNames = new Set<string>();
      const mongoIds: any[] = [];

      allGroupCodes.add(cleanId);
      allGroupNames.add(cleanId);
      if (isObjectId) mongoIds.push(cleanId);

      if (existingGroup) {
        mongoIds.push(existingGroup._id);
        if (existingGroup.groupCode) allGroupCodes.add(existingGroup.groupCode);
        if (existingGroup.groupName) allGroupNames.add(existingGroup.groupName);
      }

      const codesArr = Array.from(allGroupCodes);
      const namesArr = Array.from(allGroupNames);

      // 1. Delete ChitGroup document(s)
      await ChitGroup.deleteMany({
        $or: [
          ...(mongoIds.length > 0 ? [{ _id: { $in: mongoIds } }] : []),
          { groupCode: { $in: codesArr } },
          { groupName: { $in: namesArr } }
        ]
      });

      // 2. Cascade Delete: ChitMember
      try {
        const { ChitMember } = await import('../chit-members/chit-member.model');
        if (mongoIds.length > 0) {
          await ChitMember.deleteMany({ chitGroupId: { $in: mongoIds } });
        }
      } catch (err) {
        console.warn('Error deleting chit members:', err);
      }

      // 3. Cascade Delete: ChitCycle
      try {
        const { ChitCycle } = await import('../chit-cycles/chit-cycle.model');
        if (mongoIds.length > 0) {
          await ChitCycle.deleteMany({ chitGroupId: { $in: mongoIds } });
        }
      } catch (err) {
        console.warn('Error deleting chit cycles:', err);
      }

      // 4. Cascade Delete: Payments & Payouts
      try {
        const { Payment } = await import('../payments/payment.model');
        if (mongoIds.length > 0) {
          await Payment.deleteMany({ chitGroupId: { $in: mongoIds } });
        }
      } catch (err) {
        console.warn('Error deleting payments:', err);
      }

      try {
        const { Payout } = await import('../payouts/payout.model');
        if (mongoIds.length > 0) {
          await Payout.deleteMany({ chitGroupId: { $in: mongoIds } });
        }
      } catch (err) {
        console.warn('Error deleting payouts:', err);
      }

      // 5. Cascade Delete: Installments
      try {
        const { Installment } = await import('../installments/installment.model');
        if (mongoIds.length > 0) {
          await Installment.deleteMany({ chitGroupId: { $in: mongoIds } });
        }
      } catch (err) {
        console.warn('Error deleting installments:', err);
      }

      // 6. Cascade Delete: Auctions & Auction Bids
      try {
        const { Auction } = await import('../auctions/auction.model');
        if (mongoIds.length > 0) {
          await Auction.deleteMany({ chitGroupId: { $in: mongoIds } });
        }
      } catch (err) {
        console.warn('Error deleting auctions:', err);
      }

      try {
        const { AuctionBid } = await import('../auction-bids/auction-bid.model');
        if (mongoIds.length > 0) {
          await AuctionBid.deleteMany({ chitGroupId: { $in: mongoIds } });
        }
      } catch (err) {
        // AuctionBid might not have chitGroupId field directly or module path
      }

      // 7. Cascade Delete: Payment Requests
      try {
        const { PaymentRequestModel } = await import('../payments/payment-request.model');
        await PaymentRequestModel.deleteMany({
          $or: [
            { groupId: { $in: codesArr } },
            { groupId: { $in: namesArr } },
            { groupName: { $in: namesArr } },
            { groupName: { $in: codesArr } },
            ...(mongoIds.length > 0 ? [{ chitGroupId: { $in: mongoIds.map(id => id.toString()) } }] : [])
          ]
        });
      } catch (err) {
        console.warn('Error deleting payment requests:', err);
      }

      // 8. Cascade Delete: Withdrawal Requests
      try {
        const { WithdrawalRequestModel } = await import('../payments/withdrawal-request.model');
        await WithdrawalRequestModel.deleteMany({
          $or: [
            { groupId: { $in: codesArr } },
            { groupId: { $in: namesArr } },
            { groupName: { $in: namesArr } },
            { groupName: { $in: codesArr } }
          ]
        });
      } catch (err) {
        console.warn('Error deleting withdrawal requests:', err);
      }

      // 9. Cascade Delete: Receipts
      try {
        const { Receipt } = await import('../receipts/receipt.model');
        await Receipt.deleteMany({
          $or: [
            { chitGroupId: { $in: codesArr } },
            { chitGroupId: { $in: namesArr } },
            { groupName: { $in: namesArr } },
            { groupName: { $in: codesArr } },
            ...(mongoIds.length > 0 ? [{ chitGroupId: { $in: mongoIds.map(id => id.toString()) } }] : [])
          ]
        });
      } catch (err) {
        console.warn('Error deleting receipts:', err);
      }

      // 10. Update Customer documents: remove this group from their chits array
      try {
        const { Customer } = await import('../customers/customer.model');
        await Customer.updateMany(
          {},
          {
            $pull: {
              chits: {
                $or: [
                  { groupId: { $in: codesArr } },
                  { groupId: { $in: namesArr } },
                  { groupName: { $in: namesArr } },
                  { groupName: { $in: codesArr } },
                  ...(mongoIds.length > 0 ? [{ groupId: { $in: mongoIds.map(id => id.toString()) } }] : [])
                ]
              }
            } as any
          }
        );
      } catch (err) {
        console.warn('Error cleaning customer chits:', err);
      }

      res.status(200).json({ success: true, message: 'Chit group and all associated records deleted permanently' });
    } catch (error) {
      next(error);
    }
  }
}
