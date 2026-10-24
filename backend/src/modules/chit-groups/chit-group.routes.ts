import { Router } from 'express';
import { ChitGroupController } from './chit-group.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

// Import nested routers
import memberRoutes from '../chit-members/chit-member.routes';
import cycleRoutes from '../chit-cycles/chit-cycle.routes';

const router = Router();

router.use(authenticate);

// Nested routes
router.use('/:groupId/members', memberRoutes);
router.use('/:groupId/cycles', cycleRoutes);

// Group routes
router.post('/', authorize(['chits.create']), ChitGroupController.createGroup);
router.get('/', authorize(['chits.read']), ChitGroupController.getGroups);

export default router;
