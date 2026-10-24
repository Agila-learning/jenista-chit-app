import { Router } from 'express';
import { AgentController } from './agent.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['users.read']), AgentController.getAgents);

export default router;
