import * as notificationService from '../services/notification.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getNotifications = catchAsync(async (req, res, next) => {
  const notifications = await notificationService.getNotificationsByUserId(req.user._id);
  res.status(200).json({
    success: true,
    data: notifications,
  });
});

export const markAsRead = catchAsync(async (req, res, next) => {
  const notification = await notificationService.markNotificationAsRead(req.params.id);
  res.status(200).json({
    success: true,
    data: notification,
  });
});
