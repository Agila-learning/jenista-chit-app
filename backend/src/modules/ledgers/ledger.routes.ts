import { Router } from 'express';
import { LedgerController } from './ledger.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['ledger.read']), LedgerController.getLedgerEntries);

export default router;
