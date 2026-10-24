import { Router } from 'express';
import { InstallmentController } from './installment.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['chits.read']), InstallmentController.getInstallments);

export default router;
