import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/customer/:customerId', NotificationController.getNotificationsByCustomer);
router.post('/queue', NotificationController.manuallyQueueNotification);

export default router;
