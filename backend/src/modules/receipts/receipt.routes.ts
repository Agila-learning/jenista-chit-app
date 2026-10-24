import { Router } from 'express';
import { ReceiptController } from './receipt.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['payments.read']), ReceiptController.getReceipts);

export default router;
