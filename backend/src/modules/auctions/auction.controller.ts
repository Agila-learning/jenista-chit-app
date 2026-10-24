import { Request, Response, NextFunction } from 'express';
import { AuctionService } from './auction.service';
import { Auction } from './auction.model';
import { AuthRequest } from '../../middleware/authenticate';

export class AuctionController {
  static async submitBid(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { memberId, bidAmount } = req.body;
      const bid = await AuctionService.submitBid(id as string, memberId, bidAmount, req.user!.userId);
      res.status(201).json({ success: true, data: bid });
    } catch (error) {
      next(error);
    }
  }

  static async finalizeAuction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const auction = await AuctionService.finalizeAuction(id as string, req.user!.userId);
      res.status(200).json({ success: true, data: auction });
    } catch (error) {
      next(error);
    }
  }

  static async getAuctions(req: Request, res: Response, next: NextFunction) {
    try {
      const auctions = await Auction.find().populate('chitGroupId', 'groupName groupCode');
      res.status(200).json({ success: true, data: auctions });
    } catch (error) {
      next(error);
    }
  }
}
