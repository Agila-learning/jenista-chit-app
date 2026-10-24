import { Router } from 'express';
import { BranchController } from './branch.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['branches.manage']), BranchController.createBranch);
router.get('/', authorize(['branches.read']), BranchController.getBranches);

export default router;
