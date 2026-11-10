import { Router } from 'express';
import { ChatController } from './chat.controller';

const router = Router();

// Conversation and Messaging Endpoints
router.get('/conversations', ChatController.getConversations);
router.get('/messages/:conversationId', ChatController.getMessages);
router.post('/messages', ChatController.sendMessage);
router.patch('/messages/:conversationId/read', ChatController.markAsRead);

// Instagram-Style Stories Endpoints
router.get('/stories', ChatController.getStories);
router.post('/stories', ChatController.createStory);
router.post('/stories/:id/view', ChatController.recordStoryView);
router.delete('/stories/:id', ChatController.deleteStory);

export default router;


