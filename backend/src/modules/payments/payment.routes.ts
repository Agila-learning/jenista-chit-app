import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// Customer payment verification requests (Public/Customer accessible routes)
router.post('/requests', PaymentController.createPaymentRequest);
router.get('/requests', PaymentController.getPaymentRequests);
router.patch('/requests/:id', PaymentController.updatePaymentRequestStatus);

// Prize Money Withdrawal / Disbursal Claims
router.post('/withdrawals', PaymentController.createWithdrawalRequest);
router.get('/withdrawals', PaymentController.getWithdrawalRequests);
router.patch('/withdrawals/:id', PaymentController.updateWithdrawalRequestStatus);

// Internal Ledger Payments
router.use(authenticate);
router.post('/', authorize(['payments.create']), PaymentController.processPayment);
router.get('/', authorize(['payments.read']), PaymentController.getPayments);

export default router;
