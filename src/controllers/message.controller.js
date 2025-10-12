import * as messageService from '../services/message.service.js';
import * as notificationService from '../services/notification.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/user.model.js';
import Problem from '../models/problem.model.js';
import Support from '../models/support.model.js';

export const createMessage = catchAsync(async (req, res, next) => {
  const { chatType, problemId, supportId, message, imageUrl } = req.body;
  const senderId = req.user._id;

  if (!chatType || (!message && !imageUrl)) {
    return next(new ApiError(400, 'Please provide chatType and either a message or an imageUrl'));
  }

  if (chatType === 'problem' && !problemId) {
    return next(new ApiError(400, 'problemId is required for problem chatType'));
  }

  if (chatType === 'support' && !supportId) {
    return next(new ApiError(400, 'supportId is required for support chatType'));
  }

  const newMessage = await messageService.createMessage({
    chatType,
    problemId,
    supportId,
    senderId,
    message,
    imageUrl,
    senderRole: req.user.role,
  });

  // --- Notification Logic ---
  let recipientIdForNotification = null;

  if (chatType === 'problem') {
    const problem = await Problem.findById(problemId).populate('customerId');
    if (problem) {
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        recipientIdForNotification = problem.customerId;
      } else {
        // Notify all admins
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        for (const admin of admins) {
          await notificationService.createNotification({
            recipientId: admin._id,
            senderId,
            type: 'new_message',
            problemId,
            message: `New message in problem #${problem.problemId}`,
          });
        }
      }
    }
  } else if (chatType === 'support') {
    const support = await Support.findById(supportId).populate('createdBy');
    if (support) {
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        recipientIdForNotification = support.createdBy;
      } else {
        // Notify all admins
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        for (const admin of admins) {
          await notificationService.createNotification({
            recipientId: admin._id,
            senderId,
            type: 'new_message',
            supportId,
            message: `New message in support ticket #${support.supportId}`,
          });
        }
      }
    }
  }

  if (recipientIdForNotification) {
    await notificationService.createNotification({
      recipientId: recipientIdForNotification,
      senderId,
      type: 'new_message',
      problemId,
      supportId,
      message: `You have a new message`,
    });
  }
  // --- End of Notification Logic ---

  res.status(201).json({
    success: true,
    data: newMessage,
  });
});

export const getMessages = catchAsync(async (req, res, next) => {
  const { chatType } = req.query;
  const { id } = req.params; // This 'id' can be problemId or conversationId

  if (!chatType) {
    return next(new ApiError(400, 'Please provide chatType query'));
  }

  let messages;
  if (chatType === 'problem') {
    messages = await messageService.getMessagesByProblemId(id);
  } else if (chatType === 'support') {
    messages = await messageService.getMessagesBySupportId(id);
  } else {
    return next(new ApiError(400, 'Invalid chatType'));
  }

  res.status(200).json({
    success: true,
    data: messages,
  });
});

export const markMessageAsRead = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const result = await messageService.markMessageAsRead(messageId, userId);

  res.status(200).json({
    success: true,
    message: `Message marked as read`,
    data: result,
  });
});

export const getChatList = catchAsync(async (req, res, next) => {
  const { type } = req.query; // type can be 'problem', 'support', or undefined
  const  userId  = req.user._id; // Assuming userId is available in req.user
  const user = await User.findById(userId);
  if (!type || (type !== 'problem' && type !== 'support')) {
    return next(new ApiError(400, 'Please provide a valid chat type: problem or support'));
  }
  const chatList = await messageService.getChatList({ type, user});
  res.status(200).json({
    success: true,
    data: chatList,
  });
});

export const getConversationsByUserId = catchAsync(async (req, res, next) => {
  const { type } = req.query;
  const { userId } = req.params;

  if (!type || (type !== 'problem' && type !== 'support')) {
    return next(new ApiError(400, 'Please provide a valid chat type: problem or support'));
  }

  const chatList = await messageService.getConversationsByUserId({ type, userId });

  res.status(200).json({
    success: true,
    data: chatList,
  });
});
