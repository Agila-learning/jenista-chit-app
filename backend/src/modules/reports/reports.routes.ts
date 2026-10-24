import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/defaulters', authorize(['reports.read']), ReportsController.getDefaultersList);
router.get('/upcoming-auctions', authorize(['reports.read']), ReportsController.getUpcomingAuctions);
router.get('/agent-collections', authorize(['reports.read']), ReportsController.getAgentCollectionReports);

export default router;
