import { Request, Response, NextFunction } from 'express';
import { ChatMessage } from './chat.model';

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
            lastMessage: lastMsg?.text || '',
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
   * Send a new message
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
      } = req.body;

      if (!text || !text.trim()) {
        res.status(400).json({ success: false, message: 'Message text is required' });
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
        text: text.trim(),
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
}

