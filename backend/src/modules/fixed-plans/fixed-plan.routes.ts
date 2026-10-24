import { Router } from 'express';
import { FixedPlanController } from './fixed-plan.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.post('/process-cycle/:cycleId', authorize(['payouts.process']), FixedPlanController.processCycle);

export default router;
