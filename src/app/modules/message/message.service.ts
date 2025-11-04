import { Types } from 'mongoose';
import AppError from '../../error/appError';
import { fileUploader } from '../../helper/fileUploder';
import { IMessage } from './message.interface';
import Message from './message.model';

const sendMessage = async (payload: IMessage, file?: Express.Multer.File) => {
  let fileUrl: string | undefined;
  if (file) {
    const uploadResult = await fileUploader.uploadToCloudinary(file);
    fileUrl = uploadResult.secure_url;
  }

  // Create message with file URL
  const messageData = {
    sender: payload.sender,
    receiver: payload.receiver,
    message: payload.message,
    ...(fileUrl && { file: fileUrl }), 
  };

  const newMessage = await Message.create(messageData);

  const populatedMessage = await Message.findById(newMessage._id)
    .populate('sender', 'name email avatar')
    .populate('receiver', 'name email avatar');

  if (!populatedMessage) {
    throw new AppError(404, 'Message not found after creation');
  }

  return populatedMessage;
};

const getConversation = async (
  userId: Types.ObjectId,
  otherUserId: Types.ObjectId,
  page: number = 1,
  limit: number = 50,
): Promise<{
  messages: IMessage[];
  totalPages: number;
  currentPage: number;
}> => {
  const skip = (page - 1) * limit;

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  })
    .populate('sender', 'name email avatar')
    .populate('receiver', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalMessages = await Message.countDocuments({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  });

  return {
    messages: messages.reverse(), // Return in chronological order
    totalPages: Math.ceil(totalMessages / limit),
    currentPage: page,
  };
};

const getUserConversations = async (userId: Types.ObjectId): Promise<any[]> => {
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: userId }, { receiver: userId }],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender'],
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', userId] },
                  { $eq: ['$read', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        _id: 1,
        user: {
          _id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          avatar: '$user.avatar',
        },
        lastMessage: 1,
        unreadCount: 1,
      },
    },
    {
      $sort: { 'lastMessage.createdAt': -1 },
    },
  ]);

  return conversations;
};

const deleteMessage = async (
  messageId: Types.ObjectId,
  userId: Types.ObjectId,
): Promise<void> => {
  const message = await Message.findOne({ _id: messageId, sender: userId });

  if (!message) {
    throw new AppError(404, 'Message not found or unauthorized');
  }

  await Message.findByIdAndDelete(messageId);
};

export const MessageService = {
  sendMessage,
  getConversation,
  getUserConversations,
  deleteMessage,
};
