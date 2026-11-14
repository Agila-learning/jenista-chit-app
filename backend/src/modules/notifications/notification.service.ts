import { Notification } from './notification.model';
import { ApiError } from '../../common/ApiError';
import { Customer } from '../customers/customer.model';
import { sendPushNotification } from '../../config/firebase';

export class NotificationService {
  /**
   * Pushes a notification to the database.
   * If customer has an FCM token, dispatches push notification directly via Firebase.
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

      // Dispatch FCM Push Notification asynchronously if customer has registered token
      (async () => {
        try {
          const customer = await Customer.findById(data.customerId) || await Customer.findOne({ customerCode: data.customerId });
          if (customer && (customer as any).fcmToken) {
            const titleMap: Record<string, string> = {
              PAYMENT_REMINDER: 'Installment Reminder - Jenista Chits',
              PAYMENT_RECEIPT: 'Payment Received - Jenista Chits',
              AUCTION_INVITE: 'Auction Cycle Open - Jenista Chits',
              AUCTION_WINNER: 'Auction Award Notification - Jenista Chits',
              DIVIDEND_UPDATE: 'Dividend Credit - Jenista Chits',
              KYC_STATUS: 'KYC Verification Update - Jenista Chits',
            };
            const title = titleMap[data.type] || 'Jenista Chits Notification';
            await sendPushNotification((customer as any).fcmToken, title, data.content, {
              type: data.type,
              notificationId: String(notification._id),
            });
            await Notification.findByIdAndUpdate(notification._id, {
              status: 'SENT',
              sentAt: new Date(),
            });
          }
        } catch (fcmErr) {
          console.warn('FCM dispatch warning:', fcmErr);
        }
      })();

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
