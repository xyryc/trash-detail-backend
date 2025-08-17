import * as messageService from '../services/message.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

export const createMessage = catchAsync(async (req, res, next) => {
  const { chatType, problemId, supportId, recipientId, message } = req.body;
  const senderId = req.user._id;

  if (!chatType || !recipientId || !message) {
    return next(new ApiError(400, 'Please provide chatType, recipientId, and message'));
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
    recipientId, 
    message 
  });

  res.status(201).json({
    success: true,
    data: newMessage,
  });
});

export const getMessages = catchAsync(async (req, res, next) => {
  const { chatType } = req.query;
  const { id } = req.params; // This 'id' can be problemId or conversationId

  if (!chatType) {
    return next(new ApiError(400, 'Please provide chatType query parameter'));
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

export const markMessagesAsRead = catchAsync(async (req, res, next) => {
  const { messageIds } = req.body;
  const recipientId = req.user._id; // The user who is marking messages as read

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return next(new ApiError(400, 'Please provide an array of messageIds'));
  }

  const result = await messageService.markMessagesAsRead(messageIds, recipientId);

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} messages marked as read`,
    data: result,
  });
});
