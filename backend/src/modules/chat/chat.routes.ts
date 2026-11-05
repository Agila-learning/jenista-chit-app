import { Router } from 'express';
import { ChatController } from './chat.controller';

const router = Router();

// Endpoints accessible to staff, admin, and customers
router.get('/conversations', ChatController.getConversations);
router.get('/messages/:conversationId', ChatController.getMessages);
router.post('/messages', ChatController.sendMessage);
router.patch('/messages/:conversationId/read', ChatController.markAsRead);

export default router;

