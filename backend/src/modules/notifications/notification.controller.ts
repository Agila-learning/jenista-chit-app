import { Request, Response, NextFunction } from 'express';
import { Notification } from './notification.model';
import { NotificationService } from './notification.service';

export class NotificationController {
  static async getNotificationsByCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const notifications = await Notification.find({ customerId }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  static async manuallyQueueNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.queueNotification(req.body);
      res.status(201).json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  }
}
