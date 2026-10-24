import { Notification } from './notification.model';
import { ApiError } from '../../common/ApiError';

export class NotificationService {
  /**
   * Pushes a notification to the database.
   * In a real system, a cron job or queue consumer would read PENDING notifications and send them via SMS/Email APIs.
   */
  static async queueNotification(data: {
    customerId: string;
    type: 'PAYMENT_REMINDER' | 'PAYMENT_RECEIPT' | 'AUCTION_INVITE' | 'AUCTION_WINNER' | 'DIVIDEND_UPDATE' | 'KYC_STATUS';
    channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP';
    content: string;
    scheduledFor?: Date;
  }) {
    try {
      const notification = await Notification.create({
        ...data,
        status: 'PENDING',
      });
      return notification;
    } catch (error) {
      throw new ApiError(500, 'Failed to queue notification', 'INTERNAL_SERVER_ERROR');
    }
  }

  static async markAsSent(notificationId: string) {
    return await Notification.findByIdAndUpdate(notificationId, {
      status: 'SENT',
      sentAt: new Date()
    }, { new: true });
  }
}
