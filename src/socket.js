import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import * as messageService from './services/message.service.js';
import User from './models/user.model.js';
import Problem from './models/problem.model.js';
import Support from './models/support.model.js';
import mongoose from 'mongoose';

const initializeSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins
      methods: ["GET", "POST"]
    }
  });

  io.use(async (socket, next) => {
  
    try {
      const token = socket.handshake.headers.token || socket.handshake.auth.token // Or socket.handshake.query.token
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
      socket.emit('authentication_error', { message: 'Authentication failed' });
next(new Error('Authentication error'));

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
    socket.join(socket.user._id.toString());

    if (['admin', 'superadmin'].includes(socket.user.role)) {
      socket.join('admins');
    }

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

socket.on('typing', (data) => {
  const { chatType, problemId, supportId, userId } = data;
  let roomName;
  if (chatType === 'problem' && problemId) {
    roomName = `problem_${problemId}`;
  } else if (chatType === 'support' && supportId) {
    roomName = `support_${supportId}`;
  } else {
    return;
  }
  // Broadcast to everyone else in the room except sender
  socket.to(roomName).emit('typing', { userId });
});

socket.on('stop_typing', (data) => {
  const { chatType, problemId, supportId, userId } = data;
  let roomName;
  if (chatType === 'problem' && problemId) {
    roomName = `problem_${problemId}`;
  } else if (chatType === 'support' && supportId) {
    roomName = `support_${supportId}`;
  } else {
    return;
  }
  socket.to(roomName).emit('stop_typing', { userId });
});

//     socket.on('sendMessage', async (data) => {
//       const { chatType, problemId, supportId, recipientId, message, imageUrl } = data;
//       const senderId = socket.user._id;
//       const senderRole = socket.user.role;
  
//       // Authorization check: Ensure senderId matches authenticated user or user is an admin
//       if (senderId.toString() !== socket.user._id.toString() && senderRole !== 'admin' && senderRole !== 'superadmin') {
//         console.error('Unauthorized message sender');
//         return;
//       }

//       // Ensure either message text or image URL is provided
//       if (!message && !imageUrl) {
//         console.error('Message or imageUrl must be provided');
//         return;
//       }

//       let roomName;
//       if (chatType === 'problem' && problemId) {
//         roomName = `problem_${problemId}`;
//       } else if (chatType === 'support' && supportId) {
//         roomName = `support_${supportId}`;
//       } else {
//         console.error('Invalid sendMessage data', data);
//         return;
//       }

//       const newMessage = await messageService.createMessage({ chatType, problemId, supportId, senderId, message, imageUrl, senderRole });
//       console.log(newMessage);
//       io.to(roomName).emit('newMessage', newMessage);
//       const sender = socket.user;
//       console.log(sender.role);
      
//       let recipientIdForChatListUpdate = newMessage.recipientId; // Use client-provided recipientId if available
//       console.log(recipientIdForChatListUpdate);

//       if (['admin', 'superadmin'].includes(sender.role)) {
//         if (!recipientIdForChatListUpdate) { // If client didn't provide, determine it
//           if (chatType === 'problem' && problemId) {
//             const problem = await Problem.findById(problemId);
//             if (problem) {
//               const customer = await User.findOne({ userId: problem.customerId });
//               if (customer) {
//                 recipientIdForChatListUpdate = customer._id;
//               }
//             }
//           } else if (chatType === 'support' && supportId) {
//             const support = await Support.findById(supportId);
//             console.log(support);
//             if (support) {
//               recipientIdForChatListUpdate = support.createdBy;
//             }
//           }
//         }
//         if (recipientIdForChatListUpdate) {
//           io.to(recipientIdForChatListUpdate.toString()).emit('updateChatList', { type: chatType });
//           console.log('UpdateChatList emitted to recipientId:', recipientIdForChatListUpdate.toString());
//         } else {
//           console.warn(`[BACKEND] Admin (${sender.email}) sent message. Could not determine recipientId for chat list update. No specific 'updateChatList' emitted.`);
//         }
//       } else { // Customer sends message
//         console.log('UpdateChatList emitted to recipientId:Admin');
//         io.to('admins').emit('updateChatList', { type: chatType });
//       }
//     });

    

//   socket.on("updateChatList", (data) => {
//   console.log("Received updateChatList:", data);
// });

    socket.on('sendMessage', async (data) => {
      const { chatType, problemId, supportId, message, imageUrl } = data;
      const sender = socket.user;

      // 1. Validate input
      if (!message && !imageUrl) {
        console.error('Message or imageUrl must be provided');
        return;
      }
      const chatId = chatType === 'problem' ? problemId : supportId;
      if (!chatId) {
        console.error('Invalid sendMessage data', data);
        return;
      }

      // 2. Create the message
      const newMessage = await messageService.createMessage({
        chatType,
        problemId,
        supportId,
        senderId: sender._id,
        message,
        imageUrl,
        senderRole: sender.role,
      });

      console.log("New message: ", newMessage);

   // 3. Emit new message to the room for live chatting
const roomName = `${chatType}_${chatId}`;
io.to(roomName).emit("newMessage", newMessage);

// 4. Notify recipient(s) to update their chat list
const isAdminSender = ["admin", "superadmin"].includes(sender.role);

if (isAdminSender) {
  // Admin is sender → notify the customer
  let recipientUser;
  if (chatType === "problem") {
    const problem = await Problem.findById(chatId).lean();
    if (problem) {
      recipientUser = await User.findOne({ userId: problem.customerId }).lean();
    }
  } else {
    const support = await Support.findById(chatId).lean();
    if (support) {
      recipientUser = await User.findById(support.createdBy).lean();
    }
  }

  if (recipientUser) {
    const chatDetails = await messageService.getChatDetailsForUser(
      chatType,
      chatId,
      recipientUser._id
    );

    io.to(recipientUser._id.toString()).emit("chatUpdated", chatDetails);
    console.log("Emitting chatUpdated for customer", recipientUser._id, chatType);
  }
} else {
  // Customer is sender → notify ALL admins with direct chat details
  const chatDetails = await messageService.getChatDetailsForAdmins(chatType, chatId);

  io.to("admins").emit("chatUpdated", chatDetails);
  console.log("Emitting chatUpdated for admins", chatType, chatId);

    // Also, calculate and emit the updated user summary for the sender
    const userSummary = await messageService.getUserChatSummary({ userId: sender._id, chatType });
    if (userSummary) {
      io.to("admins").emit("userSummaryUpdated", userSummary);
      console.log("Emitting userSummaryUpdated for admins", userSummary);

      // NEW: Update the full conversation list for all admins
      try {
        const adminSockets = await io.in('admins').fetchSockets();
        for (const adminSocket of adminSockets) {
          const adminUser = adminSocket.user;
          const updatedConversations = await messageService.getChatList({ type: chatType, user: adminUser });
          adminSocket.emit('conversationsUpdated', { type: chatType, conversations: updatedConversations });
          console.log(`Emitted conversationsUpdated to admin ${adminUser.email}`);
        }
      } catch (error) {
        console.error('Error emitting conversationsUpdated to admins:', error);
      }
    }

}});

    socket.on('markChatAsRead', async (data) => {
      const { chatType, chatId } = data;
      const userId = socket.user._id;

      if (!chatType || !chatId) {
        console.error('Invalid markChatAsRead data', data);
        return;
      }

      // 1. Mark messages as read in the database
      await messageService.markAllMessagesAsRead(chatType, chatId, userId);

      // 2. Get the updated chat details (unread count will be 0)
      const updatedChatDetails = await messageService.getChatDetailsForUser(chatType, chatId, userId);
              console.log('Received updateChatList event in frontend', data);

      // 3. Send the updated details back to the user who requested it
      if (updatedChatDetails) {
        socket.emit('chatUpdated', updatedChatDetails);
      }

      // 4. NEW: Update the full conversation list for admins after marking as read
      try {
        const adminSockets = await io.in('admins').fetchSockets();
        for (const adminSocket of adminSockets) {
          const adminUser = adminSocket.user;
          // Update both problem and support lists, as we don't know which one the user was looking at
          const updatedProblemConversations = await messageService.getChatList({ type: 'problem', user: adminUser });
          adminSocket.emit('conversationsUpdated', { type: 'problem', conversations: updatedProblemConversations });

          const updatedSupportConversations = await messageService.getChatList({ type: 'support', user: adminUser });
          adminSocket.emit('conversationsUpdated', { type: 'support', conversations: updatedSupportConversations });

          console.log(`Emitted conversationsUpdated to admin ${adminUser.email} after markAsRead`);
        }
      } catch (error) {
        console.error('Error emitting conversationsUpdated to admins after markAsRead:', error);
      }
    });
      console.log('user disconnected');
    });


  return io;
};

export default initializeSocketIO;