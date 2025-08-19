import * as messageService from '../services/message.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

export const createMessage = catchAsync(async (req, res, next) => {
  const { chatType, problemId, supportId, message } = req.body;
  const senderId = req.user._id;

  if (!chatType || !message) {
    return next(new ApiError(400, 'Please provide chatType and message'));
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