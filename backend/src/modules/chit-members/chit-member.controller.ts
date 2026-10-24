import { Request, Response, NextFunction } from 'express';
import { ChitMember } from './chit-member.model';
import { ApiError } from '../../common/ApiError';

export class ChitMemberController {
  static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const { customerId, ticketNumber, installmentAmount, agentId } = req.body;

      const existing = await ChitMember.findOne({ chitGroupId: groupId, ticketNumber });
      if (existing) {
        throw new ApiError(400, 'Ticket number already taken in this group', 'VALIDATION_ERROR');
      }

      const member = await ChitMember.create({
        chitGroupId: groupId as string,
        customerId,
        ticketNumber,
        installmentAmount,
        agentId,
      });

      res.status(201).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  static async getMembersByGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      const members = await ChitMember.find({ chitGroupId: groupId })
        .populate('customerId', 'fullName customerCode phone')
        .populate('agentId', 'name phone');
        
      res.status(200).json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }
}
