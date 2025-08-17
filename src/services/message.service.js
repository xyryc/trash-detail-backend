import Message from '../models/message.model.js';

/**
 * Create a message
 * @param {Object} messageBody
 * @returns {Promise<Message>}
 */
export const createMessage = async (messageBody) => {
  return Message.create(messageBody);
};

/**
 * Get messages for a problem
 * @param {String} problemId
 * @returns {Promise<Message[]>}
 */
export const getMessagesByProblemId = async (problemId) => {
  return Message.find({ problemId, chatType: 'problem' }).sort({ createdAt: 'asc' });
};

/**
 * Get messages for a support ticket
 * @param {String} supportId
 * @returns {Promise<Message[]>}
 */
export const getMessagesBySupportId = async (supportId) => {
  return Message.find({ supportId, chatType: 'support' }).sort({ createdAt: 'asc' });
};

/**
 * Mark messages as read
 * @param {Array<String>} messageIds
 * @param {String} recipientId
 * @returns {Promise<Object>}
 */
export const markMessagesAsRead = async (messageIds, recipientId) => {
  const result = await Message.updateMany(
    { _id: { $in: messageIds }, recipientId: recipientId, read: false },
    { $set: { read: true } }
  );
  return result;
};
