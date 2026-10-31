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
      const { id } = req.params;
      const isObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
      const deleted = await ChitGroup.findOneAndDelete(
        isObjectId ? { $or: [{ _id: id }, { groupCode: id }, { groupName: id }] } : { $or: [{ groupCode: id }, { groupName: id }] }
      );
      if (!deleted) {
        throw new ApiError(404, 'Chit Group not found', 'NOT_FOUND');
      }
      res.status(200).json({ success: true, message: 'Group deleted successfully', data: deleted });
    } catch (error) {
      next(error);
    }
  }
}
