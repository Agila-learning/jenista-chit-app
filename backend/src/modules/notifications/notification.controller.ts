import { Request, Response, NextFunction } from 'express';
import { Notification, SystemNotificationModel } from './notification.model';
import { NotificationService } from './notification.service';
import { AnnouncementModel } from './announcement.model';

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

  /**
   * Get all published announcements
   */
  static async getAnnouncements(req: Request, res: Response, next: NextFunction) {
    try {
      const announcements = await AnnouncementModel.find().sort({ publishedAt: -1, createdAt: -1 }).lean();
      const mapped = announcements.map((a: any) => ({
        id: a._id.toString(),
        title: a.title,
        content: a.content,
        category: a.category,
        author: a.author,
        publishedAt: a.publishedAt || a.createdAt,
        targetRole: a.targetRole || 'ALL',
        pinned: a.pinned || false,
        priority: a.priority || 'NORMAL',
        metadata: a.metadata || {},
      }));
      res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Broadcast a new announcement
   */
  static async createAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, content, category, author, targetRole, pinned, priority, metadata } = req.body;
      if (!title || !content) {
        res.status(400).json({ success: false, message: 'Title and content are required' });
        return;
      }

      const announcement = await AnnouncementModel.create({
        title: title.trim(),
        content: content.trim(),
        category: category || 'GENERAL',
        author: author || 'Administrator',
        targetRole: targetRole || 'ALL',
        pinned: Boolean(pinned),
        priority: priority || 'NORMAL',
        metadata: metadata || {},
        publishedAt: new Date(),
      });

      res.status(201).json({
        success: true,
        data: {
          id: announcement._id.toString(),
          title: announcement.title,
          content: announcement.content,
          category: announcement.category,
          author: announcement.author,
          publishedAt: announcement.publishedAt,
          targetRole: announcement.targetRole,
          pinned: announcement.pinned,
          priority: announcement.priority,
          metadata: announcement.metadata,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an announcement by ID
   */
  static async deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const cleanId = String(id || '').trim();

      await AnnouncementModel.deleteMany({
        $or: [
          ...(cleanId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: cleanId }] : []),
          { title: cleanId },
        ],
      });

      res.status(200).json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all system notifications (for real-time sync with mobile & web)
   */
  static async getAllNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, userId } = req.query;

      let filter: any = {};
      if (role || userId) {
        const clauses: any[] = [{ targetRole: 'ALL' }];
        if (role) clauses.push({ targetRole: String(role).toUpperCase() });
        if (userId) clauses.push({ targetUserId: String(userId) }, { 'metadata.customerId': String(userId) });
        filter = { $or: clauses };
      }

      const notifs = await SystemNotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      const mapped = notifs.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp || (n as any).createdAt,
        isRead: Boolean(n.isRead),
        targetRole: n.targetRole,
        targetUserId: n.targetUserId,
        metadata: n.metadata || {},
      }));

      res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create / Broadcast a system notification
   */
  static async createNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, type, title, message, targetRole, targetUserId, metadata } = req.body;
      if (!title || !message) {
        res.status(400).json({ success: false, message: 'Title and message are required' });
        return;
      }

      const notifId = id || `NOTIF-${Date.now().toString().slice(-6)}`;

      const created = await SystemNotificationModel.findOneAndUpdate(
        { id: notifId },
        {
          id: notifId,
          type: type || 'SYSTEM',
          title: title.trim(),
          message: message.trim(),
          timestamp: new Date().toISOString(),
          isRead: false,
          targetRole: targetRole || 'ALL',
          targetUserId: targetUserId || undefined,
          metadata: metadata || {},
        },
        { upsert: true, new: true }
      );

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark a notification as read
   */
  static async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await SystemNotificationModel.updateOne({ id }, { $set: { isRead: true } });
      res.status(200).json({ success: true, message: 'Marked as read' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, userId } = req.body;
      let filter: any = {};
      if (role || userId) {
        const clauses: any[] = [{ targetRole: 'ALL' }];
        if (role) clauses.push({ targetRole: String(role).toUpperCase() });
        if (userId) clauses.push({ targetUserId: String(userId) });
        filter = { $or: clauses };
      }

      await SystemNotificationModel.updateMany(filter, { $set: { isRead: true } });
      res.status(200).json({ success: true, message: 'All marked as read' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await SystemNotificationModel.deleteOne({ id });
      res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      next(error);
    }
  }
}

