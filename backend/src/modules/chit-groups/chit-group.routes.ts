import { Router } from 'express';
import { ChitGroupController } from './chit-group.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

// Import nested routers
import memberRoutes from '../chit-members/chit-member.routes';
import cycleRoutes from '../chit-cycles/chit-cycle.routes';

const router = Router();

// Group routes
router.get('/', ChitGroupController.getGroups);
router.get('/:id', ChitGroupController.getGroupById);
router.post('/', ChitGroupController.createGroup);
router.put('/:id', ChitGroupController.createGroup);
router.delete('/:id', ChitGroupController.deleteGroup);

// Nested routes (with auth)
router.use('/:groupId/members', authenticate, memberRoutes);
router.use('/:groupId/cycles', authenticate, cycleRoutes);

export default router;
