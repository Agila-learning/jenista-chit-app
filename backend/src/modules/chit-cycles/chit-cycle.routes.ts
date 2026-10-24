import { Router } from 'express';
import { ChitCycleController } from './chit-cycle.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', authorize(['chits.create']), ChitCycleController.createCycle);
router.get('/', authorize(['chits.read']), ChitCycleController.getCyclesByGroup);

export default router;
