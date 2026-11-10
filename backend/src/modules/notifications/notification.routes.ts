import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Universal System Notifications (for real-time sync with mobile & web)
router.get('/', NotificationController.getAllNotifications);
router.post('/', NotificationController.createNotification);
router.patch('/read-all', NotificationController.markAllNotificationsRead);
router.patch('/:id/read', NotificationController.markNotificationRead);
router.delete('/:id', NotificationController.deleteNotification);

// Announcements
router.get('/announcements', NotificationController.getAnnouncements);
router.post('/announcements', NotificationController.createAnnouncement);
router.delete('/announcements/:id', NotificationController.deleteAnnouncement);

// Authenticated customer-specific alerts
router.get('/customer/:customerId', authenticate, NotificationController.getNotificationsByCustomer);
router.post('/queue', authenticate, NotificationController.manuallyQueueNotification);

export default router;

