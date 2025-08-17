import Notification from '../models/notification.model.js';

/**
 * Create a notification
 * @param {Object} notificationBody
 * @returns {Promise<Notification>}
 */
export const createNotification = async (notificationBody) => {
  return Notification.create(notificationBody);
};

/**
 * Get notifications for a user
 * @param {String} userId
 * @returns {Promise<Notification[]>}
 */
export const getNotificationsByUserId = async (userId) => {
  return Notification.find({ recipientId: userId }).sort({ createdAt: -1 });
};

/**
 * Mark a notification as read
 * @param {String} notificationId
 * @returns {Promise<Notification>}
 */
export const markNotificationAsRead = async (notificationId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  notification.read = true;
  await notification.save();
  return notification;
};
