import Message from '../models/message.model.js';
import Problem from '../models/problem.model.js';
import Support from '../models/support.model.js';
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

}

/**
 * Get messages for a support ticket
 * @param {String} supportId
 * @returns {Promise<Message[]>}
 */
export const getMessagesBySupportId = async (supportId) => {
  const support = await Support.findById(supportId);
  if (!support) {
    return null; // Or throw an error
  }

  const supportCreatedBy = await User.findOne({ _id: support.createdBy });
  if (!supportCreatedBy) {
    return null; // Or throw an error
  }

  const messages = await Message.find({ supportId: supportId, chatType: 'support' })
    .populate('senderId', 'name email')
    .sort({ createdAt: 'asc' });



  return {
    supportInfo: {
      id: support.supportId,
      title: support.title,
    },
    createdByInfo: {
      createdById: supportCreatedBy.userId,
      name: supportCreatedBy.name,
      email: supportCreatedBy.email,
    },
    messages: messages,
  };
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

/**
 * Get a list of all chats (problems and support tickets) with customer info and incoming message count.
 * Can be filtered by supportId or problemId.
 * @param {Object} filters - Optional filters for supportId or problemId
 * @param {String} [filters.supportId] - Filter by a specific support ticket ID (MongoDB ObjectId)
 * @param {String} [filters.problemId] - Filter by a specific problem ID (MongoDB ObjectId)
 * @returns {Promise<Array>}
 */
export const getChatList = async ({ type } = {}) => {
  const chatList = [];

  // If type is 'problem' or not specified, fetch problems
  if (!type || type === 'problem') {
    const problems = await Problem.find({});
    for (const problem of problems) {
      const customer = await User.findOne({ userId: problem.customerId });
      if (customer) {
        const incomingMessagesCount = await Message.countDocuments({
          problemId: problem._id,
          senderId: customer._id,
        });

        chatList.push({
          id: problem._id,
          problemId: problem.problemId,
          type: 'problem',
          customer: {
            id: customer._id,
            name: customer.name,
            role: customer.role,
          },
          incomingMessages: incomingMessagesCount,
          title: problem.title,
          status: problem.status,
          createdAt: problem.createdAt,
        });
      }
    }
  }

  // If type is 'support' or not specified, fetch supports
  if (!type || type === 'support') {
    const supports = await Support.find({});
    for (const support of supports) {
      const createdBy = await User.findOne({ _id: support.createdBy });
      if (createdBy) {
        const incomingMessagesCount = await Message.countDocuments({
          supportId: support._id,
          senderId: createdBy._id,
        });

        chatList.push({
          id: support._id,
          supportId: support.supportId,
          type: 'support',
          customer: {
            id: createdBy._id,
            name: createdBy.name,
            role: createdBy.role,
          },
          incomingMessages: incomingMessagesCount,
          title: support.title,
          createdAt: support.createdAt,
        });
      }
    }
  }

  chatList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return chatList;
};
