import { Request, Response, NextFunction } from 'express';
import { ChitCycle } from './chit-cycle.model';
import { ApiError } from '../../common/ApiError';

export class ChitCycleController {
  static async createCycle(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const { cycleNumber, dueDate, planType, auctionDate, expectedCollection } = req.body;

      const existing = await ChitCycle.findOne({ chitGroupId: groupId, cycleNumber });
      if (existing) {
        throw new ApiError(400, 'Cycle number already exists for this group', 'VALIDATION_ERROR');
      }

      const cycle = await ChitCycle.create({
        chitGroupId: groupId as string,
        cycleNumber,
        dueDate,
        planType,
        auctionDate,
        expectedCollection,
      });

      res.status(201).json({ success: true, data: cycle });
    } catch (error) {
      next(error);
    }
  }

  static async getCyclesByGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const cycles = await ChitCycle.find({ chitGroupId: groupId }).sort({ cycleNumber: 1 });
      res.status(200).json({ success: true, data: cycles });
    } catch (error) {
      next(error);
    }
  }
}
