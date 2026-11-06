import { Router } from 'express';
import { StaffController } from './staff.controller';

const router = Router();

// Staff management endpoints accessible to authenticated admins & managers
router.get('/', StaffController.getStaff);
router.post('/', StaffController.createStaff);
router.put('/:id', StaffController.updateStaff);
router.delete('/:id', StaffController.deleteStaff);

export default router;
