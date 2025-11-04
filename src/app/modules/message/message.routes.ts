import express from 'express';
import { MessageController } from './message.controller';
import { fileUploader } from '../../helper/fileUploder';
import auth from '../../middlewares/auth';

const router = express.Router();

// Send message (with optional file upload)
router.post(
  '/send',
  auth('user', 'admin'),
  fileUploader.upload.single('file'),
  MessageController.sendMessage,
);

// Get conversation with specific user (with pagination)
router.get(
  '/conversation/:userId',
  auth('user', 'admin'),
  MessageController.getConversation,
);

// Get all conversations for current user
router.get(
  '/conversations',
  auth('user', 'admin'),
  MessageController.getUserConversations,
);

// Delete a message
router.delete(
  '/:messageId',
  auth('user', 'admin'),
  MessageController.deleteMessage,
);

export const MessageRoutes = router;
