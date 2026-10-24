import { Router } from 'express';
import { RoleController } from './role.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['roles.manage']), RoleController.createRole);
router.get('/', authorize(['roles.read']), RoleController.getRoles);

export default router;
