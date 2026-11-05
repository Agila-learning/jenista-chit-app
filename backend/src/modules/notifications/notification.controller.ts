import { Request, Response, NextFunction } from 'express';
import { Notification } from './notification.model';
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
}
