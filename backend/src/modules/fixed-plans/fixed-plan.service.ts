import mongoose from 'mongoose';
import { ChitGroup } from '../chit-groups/chit-group.model';
import { ChitCycle } from '../chit-cycles/chit-cycle.model';
import { ChitMember } from '../chit-members/chit-member.model';
import { Payout } from '../payouts/payout.model';
import { FixedPlanEngine } from '../chit-plans/engines/fixed.engine';
import { ApiError } from '../../common/ApiError';

export class FixedPlanService {
  static async processCycle(cycleId: string, userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cycle = await ChitCycle.findById(cycleId).session(session);
      if (!cycle) throw new ApiError(404, 'Cycle not found', 'NOT_FOUND');
      if (cycle.planType !== 'FIXED') throw new ApiError(400, 'Not a fixed plan cycle', 'INVALID_OPERATION');
      if (cycle.status === 'CLOSED') throw new ApiError(400, 'Cycle already closed', 'INVALID_OPERATION');

      const group = await ChitGroup.findById(cycle.chitGroupId).session(session);
      if (!group) throw new ApiError(404, 'Group not found', 'NOT_FOUND');

      const engine = new FixedPlanEngine(group.planSnapshot);
      if (!engine.validateCycle(cycle)) {
        throw new ApiError(400, 'Cycle validation failed', 'VALIDATION_ERROR');
      }

      // Determine eligible members (for fixed plans, let's assume one payout per month or configurable)
      // For simplicity, we find the next member who hasn't taken a prize and is ACTIVE
      const eligibleMember = await ChitMember.findOne({
        chitGroupId: group._id,
        status: 'ACTIVE',
        prizeTaken: false
      }).sort({ ticketNumber: 1 }).session(session);

      let createdPayout = null;

      if (eligibleMember) {
        const engineResult = await engine.processCycle(cycle);
        const calc = engineResult.payoutCalculation;

        const payoutNumber = `PAYOUT-F-${Date.now()}`;
        const payout = await Payout.create([{
          payoutNumber,
          customerId: eligibleMember.customerId,
          chitGroupId: group._id,
          chitMemberId: eligibleMember._id,
          cycleId: cycle._id,
          planType: 'FIXED',
          grossAmount: calc.grossAmount,
          deductions: calc.deductions,
          netAmount: calc.netAmount,
          status: 'PENDING',
          approvedBy: userId
        }], { session });

        eligibleMember.prizeTaken = true;
        eligibleMember.prizeCycleId = cycle._id;
        await eligibleMember.save({ session });

        createdPayout = payout[0];
      }

      // Close cycle
      cycle.status = 'CLOSED';
      await cycle.save({ session });

      group.currentCycle = cycle.cycleNumber;
      await group.save({ session });

      // TODO: Create Ledger entries

      await session.commitTransaction();
      session.endSession();

      return {
        message: 'Fixed cycle processed successfully',
        payout: createdPayout
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
