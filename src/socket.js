import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from './models/message.model.js';
import User from './models/user.model.js';

const initializeSocketIO = (server) => {
  const io = new Server(server);

  io.use(async (socket, next) => {
  
    try {
      const token = socket.handshake.auth.token; // Or socket.handshake.query.token
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      socket.user = user; // Attach user to socket
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('joinRoom', (data) => {
      const { chatType, problemId, supportId } = data;
      let roomName;
      if (chatType === 'problem' && problemId) {
        roomName = `problem_${problemId}`;
      } else if (chatType === 'support' && supportId) {
        roomName = `support_${supportId}`;
      } else {
        console.error('Invalid joinRoom data', data);
        return;
      }
      socket.join(roomName);
      console.log(`User ${socket.user.email} joined room: ${roomName}`);
    });

    socket.on('sendMessage', async (data) => {
      const { chatType, problemId, supportId, senderId, recipientId, message, imageUrl } = data;
  
      // Authorization check: Ensure senderId matches authenticated user
      if (senderId !== socket.user._id.toString()) {
        console.error('Unauthorized message sender');
        return;
      }

      // Ensure either message text or image URL is provided
      if (!message && !imageUrl) {
        console.error('Message or imageUrl must be provided');
        return;
      }

      let roomName;
      if (chatType === 'problem' && problemId) {
        roomName = `problem_${problemId}`;
      } else if (chatType === 'support' && supportId) {
        roomName = `support_${supportId}`;
      } else {
        console.error('Invalid sendMessage data', data);
        return;
      }

      const newMessage = await Message.create({ chatType, problemId, supportId, senderId, recipientId, message, imageUrl });
      io.to(roomName).emit('newMessage', newMessage);
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });

  return io;
};

export default initializeSocketIO;