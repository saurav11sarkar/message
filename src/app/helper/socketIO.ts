import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import AppError from '../error/appError';
import { jwtHelpers } from './jwtHelpers';
import config from '../config';
import { Secret } from 'jsonwebtoken';
import User from '../modules/user/user.model';

interface OnlineUser {
  userId: string;
  socketId: string;
}

const onlineUsers: OnlineUser[] = [];

const initializeSocketIO = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  });

  //   middleware for authentiction

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new AppError(401, 'Authentication error: Invalid token');
      }

      const decoded = jwtHelpers.verifyToken(
        token,
        config.jwt.accessTokenSecret as Secret,
      );

      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.user._id || socket.data.user.id;
    console.log(`✅ User connected: ${userId} (Socket: ${socket.id})`);

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      throw new AppError(404, 'User not found');
    } else {
      existingUser.socketId = socket.id;
      await existingUser.save();
    }

    socket.join(userId);

    io.emit(
      'onlineUser',
      onlineUsers.map((user) => user.userId),
    );

    socket.on('typing', (data: { receiverId: string; isTyping: boolean }) => {
      socket
        .to(data.receiverId)
        .emit('userTyping', { userId, isTyping: data.isTyping });
    });

    socket.on(
      'messageRead',
      (data: { messageId: string; receiverId: string }) => {
        socket.to(data.receiverId).emit('messageReadConfirmation', {
          messageId: data.messageId,
          readBy: userId,
        });
      },
    );

    socket.on(
      'callUser',
      (data: { to: string; singleData: any; from: string }) => {
        socket.to(data.to).emit('incommingCall', {
          single: data.singleData,
          from: data.from,
        });
      },
    );

    socket.on('acceptCall', (data: { to: string; signal: any }) => {
      socket.to(data.to).emit('callAccepted', data.signal);
    });

    socket.on('rejectCall', (data: { to: string }) => {
      socket.to(data.to).emit('callRejected');
    });

    socket.on('endCall', (data: { to: string }) => {
      socket.to(data.to).emit('callEnded');
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} (Socket: ${socket.id})`);
      const index = onlineUsers.findIndex((user) => user.userId === userId);

      if (index !== -1) {
        onlineUsers.splice(index, 1);
      }

      io.emit(
        'onlineUser',
        onlineUsers.map((user) => user.userId),
      );
    });
  });

  return io;
};

export default initializeSocketIO;
