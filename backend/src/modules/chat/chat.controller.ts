import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ChatMessage, StoryModel } from './chat.model';
import { Customer } from '../customers/customer.model';

const DEFAULT_SEED_STORIES: Array<{
  customId: string;
  authorId: string;
  authorName: string;
  authorRole: 'ADMIN' | 'SUPER_ADMIN';
  category: 'AUCTION_RESULT' | 'NEW_SCHEME' | 'DIVIDEND' | 'NOTICE' | 'CELEBRATION';
  title: string;
  caption: string;
  gradient: string[];
  viewCount: number;
}> = [
  {
    customId: 'STORY-001',
    authorId: 'admin',
    authorName: 'Admin Foreman',
    authorRole: 'ADMIN',
    category: 'AUCTION_RESULT',
    title: 'JJ F 2 T Auction Results',
    caption: 'November Auction successfully conducted! Winning prized payout ₹1,82,500 disbursed to member ticket #14 with ₹425 dividend per subscriber.',
    gradient: ['#7952D6', '#2563EB'],
    viewCount: 42,
  },
  {
    customId: 'STORY-002',
    authorId: 'admin',
    authorName: 'Jenista Chit Funds',
    authorRole: 'ADMIN',
    category: 'NEW_SCHEME',
    title: 'New Fixed Plan Launch',
    caption: 'Registration is now open for ₹5 Lakh Fixed Scheme (25 Months). Guaranteed milestone payouts starting month 2!',
    gradient: ['#D7A928', '#102B63'],
    viewCount: 68,
  },
  {
    customId: 'STORY-003',
    authorId: 'admin',
    authorName: 'Accounts Desk',
    authorRole: 'ADMIN',
    category: 'DIVIDEND',
    title: 'Festival Dividend Credit',
    caption: 'Special 1% festive bonus dividend credited to all subscribers who cleared their monthly installments before the 10th.',
    gradient: ['#18A875', '#059669'],
    viewCount: 95,
  },
  {
    customId: 'STORY-004',
    authorId: 'admin',
    authorName: 'Jenista Official',
    authorRole: 'ADMIN',
    category: 'NOTICE',
    title: 'Important Due Date Reminder',
    caption: 'Installment due date is the 15th of every month. Pay via UPI, NetBanking or Field Executive to avoid late fee penalties.',
    gradient: ['#DC2626', '#EA580C'],
    viewCount: 114,
  },
];

async function findStorySafe(id: string) {
  if (!id) return null;
  try {
    // 1. If valid ObjectId, try finding by _id
    if (mongoose.Types.ObjectId.isValid(id)) {
      const byId = await StoryModel.findById(id);
      if (byId) return byId;
    }

    // 2. Try finding by customId
    const byCustom = await StoryModel.findOne({ customId: id });
    if (byCustom) return byCustom;

    // 3. If seed story, create it in MongoDB on demand
    const seed = DEFAULT_SEED_STORIES.find((s) => s.customId === id);
    if (seed) {
      return await StoryModel.create({
        ...seed,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        viewers: [],
        viewersList: [],
      });
    }
  } catch (err) {
    console.warn('findStorySafe error for id:', id, err);
  }
  return null;
}

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

          // Resolve real customer profile by phone number or customerCode
          let cust: any = null;
          try {
            cust = await Customer.findOne({
              $or: [
                { phone: convId },
                { alternatePhone: convId },
                { customerCode: convId },
                ...(mongoose.Types.ObjectId.isValid(convId) ? [{ _id: convId }] : [])
              ]
            }).lean();
          } catch { }

          const resolvedName = cust?.fullName || (lastMsg?.customerName && lastMsg.customerName !== 'Customer' ? lastMsg.customerName : 'Customer');
          const resolvedPhone = cust?.phone || lastMsg?.customerPhone || (String(convId).match(/^\d{10}$/) ? String(convId) : '');
          const resolvedId = cust?.customerCode || (cust?._id ? String(cust._id) : (lastMsg?.customerId || convId));

          return {
            conversationId: convId,
            customerId: resolvedId,
            customerName: resolvedName,
            customerPhone: resolvedPhone,
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
      // Auto-seed default official stories if database has no stories yet
      const count = await StoryModel.countDocuments();
      if (count === 0) {
        await Promise.all(
          DEFAULT_SEED_STORIES.map((s) =>
            StoryModel.create({
              ...s,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              viewers: [],
              viewersList: [],
            }).catch(() => null)
          )
        );
      }

      const now = new Date();
      const stories = await StoryModel.find({ expiresAt: { $gt: now } })
        .sort({ createdAt: -1 })
        .lean();

      const mapped = stories.map((s: any) => ({
        id: s.customId || s._id.toString(),
        mongoId: s._id.toString(),
        authorId: s.authorId,
        authorName: s.authorName,
        authorRole: s.authorRole,
        category: s.category,
        title: s.title,
        caption: s.caption,
        mediaUrl: s.mediaUrl,
        viewCount: s.viewCount || (s.viewersList ? s.viewersList.length : s.viewers ? s.viewers.length : 0),
        viewers: s.viewers || [],
        viewersList: s.viewersList || [],
        gradient: s.gradient && s.gradient.length > 0 ? s.gradient : ['#7952D6', '#2563EB'],
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
      const { title, caption, category, mediaUrl, durationHours, gradient } = req.body;
      const user = (req as any).user;

      if (!title || !title.trim()) {
        res.status(400).json({ success: false, message: 'Story title is required' });
        return;
      }

      const hours = Number(durationHours) || 24;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

      const defaultGradients = [
        ['#7952D6', '#2563EB'],
        ['#D7A928', '#102B63'],
        ['#18A875', '#059669'],
        ['#EA580C', '#E11D48'],
        ['#0284C7', '#0F172A'],
      ];
      const pickedGradient = gradient && Array.isArray(gradient) && gradient.length >= 2 
        ? gradient 
        : defaultGradients[Math.floor(Math.random() * defaultGradients.length)];

      const customId = `STORY-${Date.now()}`;
      const story = await StoryModel.create({
        customId,
        authorId: user?.id || 'admin',
        authorName: user?.name || 'Jenista Administrator',
        authorRole: user?.role || 'ADMIN',
        category: category || 'NOTICE',
        title: title.trim(),
        caption: (caption || '').trim(),
        mediaUrl: mediaUrl || '',
        viewers: [],
        viewersList: [],
        viewCount: 0,
        gradient: pickedGradient,
        expiresAt,
      });

      res.status(201).json({
        success: true,
        data: {
          id: story.customId || story._id.toString(),
          mongoId: story._id.toString(),
          authorId: story.authorId,
          authorName: story.authorName,
          authorRole: story.authorRole,
          category: story.category,
          title: story.title,
          caption: story.caption,
          mediaUrl: story.mediaUrl,
          viewCount: 0,
          viewers: [],
          viewersList: [],
          gradient: story.gradient,
          createdAt: story.createdAt,
          expiresAt: story.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record a view on a story with full member identity
   */
  static async recordStoryView(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id || '');
      const user = (req as any).user;
      const viewerId = (req.body?.viewerId || user?.id || `viewer-${Date.now()}`).toString();
      const viewerName = (req.body?.viewerName || user?.name || 'Subscribed Member').toString();
      const viewerRole = (req.body?.viewerRole || user?.role || 'CUSTOMER').toString();
      const viewerPhone = (req.body?.viewerPhone || user?.phone || user?.mobile || '').toString();

      const story = await findStorySafe(id);
      if (!story) {
        // Return 200 view acknowledged gracefully so client never encounters a 500 or 404
        res.status(200).json({ success: true, message: 'View acknowledged' });
        return;
      }

      const alreadyViewed = story.viewers && story.viewers.includes(viewerId);
      if (!alreadyViewed) {
        await StoryModel.findByIdAndUpdate(story._id, {
          $addToSet: { viewers: viewerId },
          $push: {
            viewersList: {
              viewerId,
              viewerName,
              viewerRole,
              viewerPhone,
              viewedAt: new Date(),
            },
          },
          $inc: { viewCount: 1 },
        });
      }

      res.status(200).json({ success: true, message: 'View recorded', alreadyViewed: !!alreadyViewed });
    } catch (error) {
      console.warn('recordStoryView error:', error);
      res.status(200).json({ success: true, message: 'View acknowledged' });
    }
  }

  /**
   * Get Real-time List of Members who viewed a Story
   */
  static async getStoryViewers(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id || '');
      const story = await findStorySafe(id);
      if (!story) {
        res.status(200).json({
          success: true,
          storyId: id,
          storyTitle: 'Jenista Story',
          totalViews: 0,
          viewers: [],
        });
        return;
      }

      const viewersList = (story as any).viewersList || [];
      // Sort most recent viewers first
      viewersList.sort((a: any, b: any) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());

      res.status(200).json({
        success: true,
        storyId: id,
        storyTitle: (story as any).title,
        totalViews: (story as any).viewCount || viewersList.length,
        viewers: viewersList,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a story
   */
  static async deleteStory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id || '');
      if (mongoose.Types.ObjectId.isValid(id)) {
        await StoryModel.findByIdAndDelete(id);
      } else {
        await StoryModel.deleteOne({ customId: id });
      }
      res.status(200).json({ success: true, message: 'Story deleted' });
    } catch (error) {
      next(error);
    }
  }
}


