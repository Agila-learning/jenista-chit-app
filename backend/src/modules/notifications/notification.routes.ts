import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Announcements can be read without authentication or with
router.get('/announcements', NotificationController.getAnnouncements);
router.post('/announcements', NotificationController.createAnnouncement);
router.delete('/announcements/:id', NotificationController.deleteAnnouncement);

// Authenticated routes
router.get('/customer/:customerId', authenticate, NotificationController.getNotificationsByCustomer);
router.post('/queue', authenticate, NotificationController.manuallyQueueNotification);

export default router;
