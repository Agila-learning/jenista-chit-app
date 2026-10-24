import { Router } from 'express';
import { StaffController } from './staff.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['users.read']), StaffController.getStaff);

export default router;
