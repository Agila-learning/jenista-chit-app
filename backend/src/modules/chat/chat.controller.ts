import { Request, Response, NextFunction } from 'express';
import { ChatMessage, StoryModel } from './chat.model';

export class ChatController {
  /**
   * List all conversations with the latest message and unread count
   * Used by Admin and Staff
   */
  static async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      // Find all distinct conversationIds
      const conversationIds = await ChatMessage.distinct('conversationId');

      const conversations = await Promise.all(
        conversationIds.map(async (convId) => {
          const lastMsg = await ChatMessage.findOne({ conversationId: convId })
            .sort({ createdAt: -1 })
            .lean();

          const unreadCount = await ChatMessage.countDocuments({
            conversationId: convId,
            senderRole: 'CUSTOMER',
            status: { $ne: 'READ' },
          });

          return {
            conversationId: convId,
            customerId: lastMsg?.customerId || convId,
            customerName: lastMsg?.customerName || 'Customer',
            customerPhone: lastMsg?.customerPhone || '',
            lastMessage: lastMsg?.text || (lastMsg?.attachment ? `[${lastMsg.attachment.type || 'Attachment'}]` : ''),
            lastMessageAt: lastMsg?.createdAt || new Date(),
            lastSenderRole: lastMsg?.senderRole || 'CUSTOMER',
            unreadCount,
          };
        })
      );

      // Sort by newest message
      conversations.sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      res.status(200).json({ success: true, data: conversations });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages for a given conversationId
   */
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      const cleanId = String(conversationId || '').trim();

      const messages = await ChatMessage.find({
        $or: [{ conversationId: cleanId }, { customerId: cleanId }],
      })
        .sort({ createdAt: 1 })
        .lean();

      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a new message (supports text and/or attachments)
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        conversationId,
        customerId,
        customerName,
        customerPhone,
        senderId,
        senderName,
        senderRole,
        text,
        attachment,
      } = req.body;

      if ((!text || !text.trim()) && !attachment) {
        res.status(400).json({ success: false, message: 'Message text or attachment is required' });
        return;
      }

      const convId = conversationId || customerId || `chat-${Date.now()}`;
      const cId = customerId || convId;

      const newMsg = await ChatMessage.create({
        conversationId: convId,
        customerId: cId,
        customerName: customerName || 'Member',
        customerPhone: customerPhone || '',
        senderId: senderId || (req as any).user?.id || 'user',
        senderName: senderName || (req as any).user?.name || 'Support Staff',
        senderRole: senderRole || (req as any).user?.role || 'CUSTOMER',
        text: text ? text.trim() : (attachment?.name || 'Attachment'),
        attachment: attachment || undefined,
        status: 'SENT',
      });

      res.status(201).json({ success: true, data: newMsg });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all messages in a conversation as read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      const cleanId = String(conversationId || '').trim();

      await ChatMessage.updateMany(
        {
          $or: [{ conversationId: cleanId }, { customerId: cleanId }],
          status: { $ne: 'READ' },
        },
        { $set: { status: 'READ' } }
      );

      res.status(200).json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // INSTAGRAM-STYLE STORIES ENDPOINTS
  // ==========================================

  /**
   * Get all active (unexpired) stories
   * All chit members and staff can view these stories!
   */
  static async getStories(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const stories = await StoryModel.find({ expiresAt: { $gt: now } })
        .sort({ createdAt: -1 })
        .lean();

      const mapped = stories.map((s) => ({
        id: s._id.toString(),
        authorId: s.authorId,
        authorName: s.authorName,
        authorRole: s.authorRole,
        category: s.category,
        title: s.title,
        caption: s.caption,
        mediaUrl: s.mediaUrl,
        viewCount: s.viewCount || (s.viewers ? s.viewers.length : 0),
        viewers: s.viewers || [],
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }));

      res.status(200).json({ success: true, data: mapped });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Post a new story (Admin)
   */
  static async createStory(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, caption, category, mediaUrl, durationHours } = req.body;
      const user = (req as any).user;

      if (!title || !title.trim()) {
        res.status(400).json({ success: false, message: 'Story title is required' });
        return;
      }

      const hours = Number(durationHours) || 24;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

      const story = await StoryModel.create({
        authorId: user?.id || 'admin',
        authorName: user?.name || 'Administrator',
        authorRole: user?.role || 'ADMIN',
        category: category || 'NOTICE',
        title: title.trim(),
        caption: (caption || '').trim(),
        mediaUrl: mediaUrl || '',
        viewers: [],
        viewCount: 0,
        expiresAt,
      });

      res.status(201).json({
        success: true,
        data: {
          id: story._id.toString(),
          authorId: story.authorId,
          authorName: story.authorName,
          authorRole: story.authorRole,
          category: story.category,
          title: story.title,
          caption: story.caption,
          mediaUrl: story.mediaUrl,
          viewCount: 0,
          viewers: [],
          createdAt: story.createdAt,
          expiresAt: story.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record a view on a story
   */
  static async recordStoryView(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const viewerId = (req.body?.viewerId || (req as any).user?.id || `viewer-${Date.now()}`).toString();

      await StoryModel.findByIdAndUpdate(id, {
        $addToSet: { viewers: viewerId },
        $inc: { viewCount: 1 },
      });

      res.status(200).json({ success: true, message: 'View recorded' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a story
   */
  static async deleteStory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await StoryModel.findByIdAndDelete(id);
      res.status(200).json({ success: true, message: 'Story deleted' });
    } catch (error) {
      next(error);
    }
  }
}


