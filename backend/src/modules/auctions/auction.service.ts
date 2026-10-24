import mongoose from 'mongoose';
import { Auction } from './auction.model';
import { AuctionBid } from '../auction-bids/auction-bid.model';
import { ChitGroup } from '../chit-groups/chit-group.model';
import { ChitMember } from '../chit-members/chit-member.model';
import { ChitCycle } from '../chit-cycles/chit-cycle.model';
import { Payout } from '../payouts/payout.model';
import { AuctionPlanEngine } from '../chit-plans/engines/auction.engine';
import { ApiError } from '../../common/ApiError';

export class AuctionService {
  static async submitBid(auctionId: string, memberId: string, bidAmount: number, userId: string) {
    const auction = await Auction.findById(auctionId);
    if (!auction) throw new ApiError(404, 'Auction not found', 'NOT_FOUND');
    if (auction.status !== 'OPEN' && auction.status !== 'IN_PROGRESS') {
      throw new ApiError(400, 'Auction is not open for bidding', 'INVALID_OPERATION');
    }

    if (bidAmount < auction.minimumBid || bidAmount > auction.maximumBid) {
      throw new ApiError(400, `Bid must be between ${auction.minimumBid} and ${auction.maximumBid}`, 'VALIDATION_ERROR');
    }

    const member = await ChitMember.findById(memberId);
    if (!member) throw new ApiError(404, 'Member not found', 'NOT_FOUND');
    if (member.status !== 'ACTIVE') throw new ApiError(400, 'Member is not active', 'INVALID_OPERATION');
    if (member.prizeTaken) throw new ApiError(400, 'Member has already taken a prize', 'INVALID_OPERATION');

    const bid = await AuctionBid.create({
      auctionId,
      chitGroupId: auction.chitGroupId,
      memberId,
      customerId: member.customerId,
      bidAmount,
      submittedBy: userId,
      status: 'VALID',
    });

    return bid;
  }

  static async finalizeAuction(auctionId: string, userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const auction = await Auction.findById(auctionId).session(session);
      if (!auction) throw new ApiError(404, 'Auction not found', 'NOT_FOUND');
      if (auction.status === 'FINALIZED') throw new ApiError(400, 'Auction already finalized', 'INVALID_OPERATION');

      const bids = await AuctionBid.find({ auctionId, status: 'VALID' }).sort({ bidAmount: -1 }).session(session);
      if (bids.length === 0) {
        throw new ApiError(400, 'No valid bids to finalize', 'INVALID_OPERATION');
      }

      // Simple winner logic based on HIGHEST_DISCOUNT (highest bidAmount)
      // Since it's sorted descending, [0] is the highest bid
      const winningBid = bids[0];

      const group = await ChitGroup.findById(auction.chitGroupId).session(session);
      const cycle = await ChitCycle.findById(auction.cycleId).session(session);
      
      const engine = new AuctionPlanEngine(group!.planSnapshot);
      const calc = engine.calculatePayout({
        chitValue: auction.totalChitValue,
        winningBid: winningBid.bidAmount
      });

      // Update Auction
      auction.winningBid = winningBid.bidAmount;
      auction.winnerMemberId = winningBid.memberId;
      auction.prizeAmount = calc.netAmount;
      auction.commissionAmount = calc.commission;
      auction.dividendAmount = calc.dividend;
      auction.status = 'FINALIZED';
      auction.finalizedBy = new mongoose.Types.ObjectId(userId);
      auction.finalizedAt = new Date();
      await auction.save({ session });

      // Update Bid
      winningBid.status = 'WINNING';
      await winningBid.save({ session });

      // Update Member
      const member = await ChitMember.findById(winningBid.memberId).session(session);
      member!.prizeTaken = true;
      member!.prizeCycleId = cycle!._id;
      await member!.save({ session });

      // Create Payout
      const payoutNumber = `PAYOUT-A-${Date.now()}`;
      await Payout.create([{
        payoutNumber,
        customerId: winningBid.customerId,
        chitGroupId: auction.chitGroupId,
        chitMemberId: winningBid.memberId,
        cycleId: auction.cycleId,
        auctionId: auction._id,
        planType: 'AUCTION',
        grossAmount: calc.grossAmount,
        deductions: calc.discount,
        netAmount: calc.netAmount,
        status: 'PENDING',
        approvedBy: new mongoose.Types.ObjectId(userId)
      }], { session });

      // Close cycle
      cycle!.status = 'AUCTION_COMPLETED';
      await cycle!.save({ session });

      // TODO: Create Dividend records
      // TODO: Create Ledger entries
      // TODO: Audit Logs

      await session.commitTransaction();
      session.endSession();

      return auction;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
