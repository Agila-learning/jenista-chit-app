import { Router } from 'express';
import { ChitPlanController } from './chit-plan.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Public routes
router.get('/public', ChitPlanController.getPublicPlans);

// Protected routes
router.use(authenticate);

router.post('/', authorize(['plans.create']), ChitPlanController.createPlan);
router.get('/', authorize(['plans.read']), ChitPlanController.getPlans);
router.get('/:id', authorize(['plans.read']), ChitPlanController.getPlanById);

export default router;
