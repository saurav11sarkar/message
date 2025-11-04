import { Types } from 'mongoose';
import catchAsync from '../../utils/catchAsycn';
import AppError from '../../error/appError';
import sendResponse from '../../utils/sendResponse';
import { MessageService } from './message.service';

const sendMessage = catchAsync(async (req, res) => {
  const { receiver, message } = req.body;

  const file = req.file as Express.Multer.File;

  if (!message && !file) {
    throw new AppError(400, 'Message or file is required');
  }

  const newMessage = await MessageService.sendMessage(
    {
      sender: new Types.ObjectId(req.user.id),
      receiver: new Types.ObjectId(receiver),
      message: message || '',
    },
    file,
  );

  // Emit socket event (handled in socket.io setup)
  const io = req.app.get('io');
  io.to(receiver).emit('newMessage', newMessage);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Message sent successfully',
    data: newMessage,
  });
});

const getConversation = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const result = await MessageService.getConversation(
    new Types.ObjectId(currentUserId),
    new Types.ObjectId(userId),
    page,
    limit,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Conversation retrieved successfully',
    data: result,
  });
});

const getUserConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const conversations = await MessageService.getUserConversations(
    new Types.ObjectId(userId),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Conversations retrieved successfully',
    data: conversations,
  });
});

const deleteMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  await MessageService.deleteMessage(
    new Types.ObjectId(messageId),
    new Types.ObjectId(userId),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Message deleted successfully',
    data: null,
  });
});

export const MessageController = {
  sendMessage,
  getConversation,
  getUserConversations,
  deleteMessage,
};
