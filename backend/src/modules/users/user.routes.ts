import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.post('/', authorize(['users.manage']), UserController.createUser);
router.get('/', authorize(['users.manage']), UserController.getUsers);

export default router;
