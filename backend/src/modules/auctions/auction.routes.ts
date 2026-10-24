import { Router } from 'express';
import { AuctionController } from './auction.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.post('/:id/bids', authorize(['auctions.conduct']), AuctionController.submitBid);
router.post('/:id/finalize', authorize(['auctions.finalize']), AuctionController.finalizeAuction);
router.get('/', authorize(['auctions.read']), AuctionController.getAuctions);

export default router;
