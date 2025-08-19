import Message from '../models/message.model.js';
import Problem from '../models/problem.model.js';
import User from '../models/user.model.js';

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
 * @returns {Promise<Object>}
 */
export const getMessagesByProblemId = async (problemId) => {
  const problem = await Problem.findById(problemId);
  if (!problem) {
    return null; // Or throw an error
  }

  const customer = await User.findOne({ userId: problem.customerId });
  if (!customer) {
    return null; // Or throw an error
  }

  const messages = await Message.find({ problemId, chatType: 'problem' })
    .populate('senderId', 'name email')
    .sort({ createdAt: 'asc' });

  return {
    problemInfo: {
      id: problem.problemId,
      title: problem.title,
    },
    customerInfo: {
      customerId: customer.userId,
      name: customer.name,
      email: customer.email,
    },
    messages: messages,
  };
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
 * Mark message as read
 * @param {String} messageId
 * @param {String} userId
 * @returns {Promise<Object>}
 */
export const markMessageAsRead = async (messageId, userId) => {
  const result = await Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { readBy: userId } },
    { new: true }
  );
  return result;
};
