import { Router } from 'express';
import { ReceiptController } from './receipt.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.get('/', ReceiptController.getReceipts);
router.post('/', ReceiptController.createReceipt);

export default router;
