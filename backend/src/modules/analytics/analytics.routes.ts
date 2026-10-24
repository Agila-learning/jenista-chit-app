import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

// We'll require a specific role/permission to view top-level company analytics
router.get('/dashboard', authorize(['analytics.read']), AnalyticsController.getDashboardMetrics);
router.get('/branch-performance', authorize(['analytics.read']), AnalyticsController.getBranchPerformance);

export default router;
