import Message from '../models/message.model.js';
import Problem from '../models/problem.model.js';
import Support from '../models/support.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

/**
 * Create a message
 * @param {Object} messageBody
 * @returns {Promise<Message>}
 */
export const createMessage = async ({ chatType, problemId, supportId, senderId, message, imageUrl, senderRole }) => {
  let recipientId = null;

  if (senderRole === 'admin' || senderRole === 'superadmin') {
    if (chatType === 'problem' && problemId) {
      const problem = await Problem.findById(problemId);
      if (problem) {
        const customer = await User.findOne({ userId: problem.customerId });
        if (customer) {
          recipientId = customer._id;
        }
      }
    } else if (chatType === 'support' && supportId) {
      const support = await Support.findById(supportId);
      if (support) {
        recipientId = support.createdBy;
      }
    }
  }

  const messageBody = {
    chatType,
    problemId,
    supportId,
    senderId,
    recipientId, // Now determined internally
    message,
    imageUrl,
  };

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
      status: problem.status,
    },
    createdByInfo: {
      createdById: customer.userId,
      name: customer.name,
      email: customer.email,
      number: customer.number,
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
      status: support.status,
    },
    createdByInfo: {
      createdById: supportCreatedBy.userId,
      name: supportCreatedBy.name,
      email: supportCreatedBy.email,
      number: supportCreatedBy.number,
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
// export const getChatList = async ({ type } = {}) => {
//   const chatList = [];

//   // If type is 'problem' or not specified, fetch problems
//   if (!type || type === 'problem') {
//     const problems = await Problem.find({});
//     for (const problem of problems) {
//       const customer = await User.findOne({ userId: problem.customerId });
//       if (customer) {
//         const incomingMessagesCount = await Message.countDocuments({
//           problemId: problem._id,
//           senderId: customer._id,
//         });

//         chatList.push({
//           id: problem._id,
//           problemId: problem.problemId,
//           type: 'problem',
//           customer: {
//             id: customer._id,
//             name: customer.name,
//             role: customer.role,
//           },
//           incomingMessages: incomingMessagesCount,
//           title: problem.title,
//           status: problem.status,
//           createdAt: problem.createdAt,
//         });
//       }
//     }
//   }

//   // If type is 'support' or not specified, fetch supports
//   if (!type || type === 'support') {
//     const supports = await Support.find({});
//     for (const support of supports) {
//       const createdBy = await User.findOne({ _id: support.createdBy });
//       if (createdBy) {
//         const incomingMessagesCount = await Message.countDocuments({
//           supportId: support._id,
//           senderId: createdBy._id,
//         });

//         chatList.push({
//           id: support._id,
//           supportId: support.supportId,
//           type: 'support',
//           customer: {
//             id: createdBy._id,
//             name: createdBy.name,
//             role: createdBy.role,
//           },
//           incomingMessages: incomingMessagesCount,
//           title: support.title,
//           createdAt: support.createdAt,
//         });
//       }
//     }
//   }

//   chatList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

//   return chatList;
// };


// export const getChatList = async ({ type, user } = {}) => {
//   let chatList = [];
//   const userObjectId = user._id;

//   if (type === 'problem') {
//     const problemChats = await Problem.aggregate([
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'customerId',
//           foreignField: 'userId',
//           as: 'customer'
//         }
//       },
//       { $unwind: '$customer' },
//       {
//         $match: (user.role === 'admin' || user.role === 'superadmin' || user.role === 'employee')
          // ? {}
//           : { 'customer._id': userObjectId }
//       },
//       {
//         $lookup: {
//           from: 'messages',
//           localField: '_id',
//           foreignField: 'problemId',
//           as: 'messages'
//         }
//       },
//       {
//         $addFields: {
//           lastMessageObj: {
//             $arrayElemAt: [
//               { $sortArray: { input: "$messages", sortBy: { createdAt: -1 } } },
//               0
//             ]
//           },
//           incomingMessages: {
//             $size: {
//               $filter: {
//                 input: "$messages",
//                 as: "message",
//                 cond: {
//                   $and: [
//                     { $not: { $in: [userObjectId, { $ifNull: ["$message.readBy", []] }] } },
//                     { $ne: ["$message.senderId", userObjectId] }
//                   ]
//                 }
//               }
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           id: '$_id',
//           problemId: '$problemId',
//           type: { $literal: 'problem' },
//           title: '$title',
//           status: '$status',
//           createdAt: '$createdAt',
//           customer: {
//             id: '$customer._id',
//             name: '$customer.name',
//             role: '$customer.role'
//           },
//           lastMessage: { $ifNull: ['$lastMessageObj.message', null] },
//           lastMessageTime: { $ifNull: ['$lastMessageObj.createdAt', null] },
//           incomingMessages: '$incomingMessages'
//         }
//       }
//     ]);
//     chatList = chatList.concat(problemChats);
//   }

//   if (type === 'support') {
//     const supportChats = await Support.aggregate([
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'createdBy',
//           foreignField: '_id',
//           as: 'customer'
//         }
//       },
//       { $unwind: '$customer' },
//       {
//         $match: (user.role === 'admin' || user.role === 'superadmin')
//           ? {}
//           : { 'customer._id': userObjectId }
//       },
//       {
//         $lookup: {
//           from: 'messages',
//           localField: '_id',
//           foreignField: 'supportId',
//           as: 'messages'
//         }
//       },
//       {
//         $addFields: {
//           lastMessageObj: {
//             $arrayElemAt: [
//               { $sortArray: { input: "$messages", sortBy: { createdAt: -1 } } },
//               0
//             ]
//           },
//           incomingMessages: {
//             $size: {
//               $filter: {
//                 input: "$messages",
//                 as: "message",
//                 cond: {
//                   $and: [
//                     { $not: { $in: [userObjectId, { $ifNull: ["$message.readBy", []] }] } },
//                     { $ne: ["$message.senderId", userObjectId] }
//                   ]
//                 }
//               }
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           id: '$_id',
//           supportId: '$supportId',
//           type: { $literal: 'support' },
//           title: '$title',
//           status: '$status',
//           createdAt: '$createdAt',
//           customer: {
//             id: '$customer._id',
//             name: '$customer.name',
//             role: '$customer.role'
//           },
//           lastMessage: { $ifNull: ['$lastMessageObj.message', null] },
//           lastMessageTime: { $ifNull: ['$lastMessageObj.createdAt', null] },
//           incomingMessages: '$incomingMessages'
//         }
//       }
//     ]);
//     chatList = chatList.concat(supportChats);
//   }

//   // Sort the combined list by the last message time (or creation time if no messages)
//   chatList.sort((a, b) => (b.lastMessageTime || b.createdAt) - (a.lastMessageTime || a.createdAt));

//   return chatList;
// };

export const getChatDetailsForUser = async (chatType, chatId, userId) => {
  const chatIdField = chatType === 'problem' ? 'problemId' : 'supportId';
  const chatModel = chatType === 'problem' ? Problem : Support;

  // 1. Get Chat Info
  const chat = await chatModel.findById(chatId).lean();
  if (!chat) return null;

  // 2. Get Last Message
  const lastMessage = await Message.findOne({ [chatIdField]: chatId })
    .sort({ createdAt: -1 })
    .lean();

  // 3. Get Unread Count
  const unreadCount = await Message.countDocuments({
    [chatIdField]: chatId,
    senderId: { $ne: userId }, // Message not sent by the current user
    readBy: { $nin: [userId] }, // Current user has not read it
  });

  return {
    id: chat._id,
    type: chatType,
    title: chat.title,
    status: chat.status,
    lastMessage: lastMessage?.message || null,
    lastMessageTime: lastMessage?.createdAt || chat.createdAt,
    incomingMessages: unreadCount,
  };
};

export const getChatDetailsForAdmins = async (chatType, chatId) => {
  const chatIdField = chatType === 'problem' ? 'problemId' : 'supportId';
  const chatModel = chatType === 'problem' ? Problem : Support;

  // 1. Get Chat Info
  const chat = await chatModel.findById(chatId).lean();
  if (!chat) return null;

  // 2. Get Last Message
  const lastMessage = await Message.findOne({ [chatIdField]: chatId })
    .sort({ createdAt: -1 })
    .lean();

  // 3. Get Unread Count for Admins (messages not sent by any admin and not read by any admin)
  const adminIds = await User.find({ role: { $in: ['admin', 'superadmin'] } }).distinct('_id');
  const unreadCount = await Message.countDocuments({
    [chatIdField]: chatId,
    senderId: { $nin: adminIds }, // Message not sent by any admin
    readBy: { $nin: adminIds }, // Not read by any admin
  });

  return {
    id: chat._id,
    type: chatType,
    title: chat.title,
    status: chat.status,
    lastMessage: lastMessage?.message || null,
    lastMessageTime: lastMessage?.createdAt || chat.createdAt,
    incomingMessages: unreadCount,
  };
};

export const markAllMessagesAsRead = async (chatType, chatId, userId) => {
  const chatIdField = chatType === 'problem' ? 'problemId' : 'supportId';

  await Message.updateMany(
    {
      [chatIdField]: chatId,
      senderId: { $ne: userId },
      readBy: { $nin: [userId] },
    },
    {
      $addToSet: { readBy: userId },
    }
  );
};

export const getChatList = async ({ type, user } = {}) => {
  const userObjectId = user._id;

  if ((user.role === 'admin' || user.role === 'superadmin')) {
    if (type === 'problem') {
      const problemChats = await Problem.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'customerId',
            foreignField: 'userId',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        {
          $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'problemId',
            as: 'messages'
          }
        },
        {
          $addFields: {
            incomingMessages: {
              $size: {
                $filter: {
                  input: "$messages",
                  as: "message",
                  cond: {
                    $and: [
                      { $not: { $in: [user._id, { $ifNull: ["$$message.readBy", []] }] } },
                      { $ne: ["$$message.senderId", user._id] }
                    ]
                  }
                }
              }
            },
              lastMessageTimeForChat: { $max: "$messages.createdAt" }  
          }
        },
        {
          $group: {
            _id: '$customer._id',
            name: { $first: '$customer.name' },
            role: { $first: '$customer.role' },
            userId: { $first: '$customer.userId' },
            incomingMessages: { $sum: '$incomingMessages' },
             lastMessageTime: { $max: '$lastMessageTimeForChat' } 
          }
        },
        {
          $project: {
            _id: 0,
            user: {
              id: '$_id',
              name: '$name',
              role: '$role',
              userId: '$userId'
            },
            incomingMessages: '$incomingMessages',
            lastMessageTime: '$lastMessageTime'
          }
        }
      ]);
      return problemChats;
    } else if (type === 'support') {
      const supportChats = await Support.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        {
          $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'supportId',
            as: 'messages'
          }
        },
        {
          $addFields: {
            incomingMessages: {
              $size: {
                $filter: {
                  input: "$messages",
                  as: "message",
                  cond: {
                    $and: [
                      { $not: { $in: [user._id, { $ifNull: ["$$message.readBy", []] }] } },
                      { $ne: ["$$message.senderId", user._id] }
                    ]
                  }
                }
              }
            },
              lastMessageTimeForChat: { $max: "$messages.createdAt" }  
          }
        },
        {
          $group: {
            _id: '$customer._id',
            name: { $first: '$customer.name' },
            role: { $first: '$customer.role' },
            userId: { $first: '$customer.userId' },
            incomingMessages: { $sum: '$incomingMessages' },
             lastMessageTime: { $max: '$lastMessageTimeForChat' } 
          }
        },
        {
          $project: {
            _id: 0,
            user: {
              id: '$_id',
              name: '$name',
              role: '$role',
              userId: '$userId'
            },
            incomingMessages: '$incomingMessages',
            lastMessageTime: '$lastMessageTime'
          }
        }
      ]);
      return supportChats;
    }
  }


  let chatList = [];

  // Logic for Problem Chats
  if (!type || type === 'problem') {
    const problemMatchQuery = {};
    if (user.role === 'employee') {
      problemMatchQuery.employeeId = userObjectId;
    } else if (user.role !== 'admin' && user.role !== 'superadmin') {
      problemMatchQuery['customer._id'] = userObjectId;
    }

    const problemChats = await Problem.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: 'userId',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      { $match: problemMatchQuery },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'problemId',
          as: 'messages'
        }
      },
      {
        $addFields: {
          lastMessageObj: { $arrayElemAt: [{ $sortArray: { input: "$messages", sortBy: { createdAt: -1 } } }, 0] },
          incomingMessages: {
            $size: {
              $filter: {
                input: "$messages",
                as: "message",
                cond: {
                  $and: [
                    { $not: { $in: [userObjectId, { $ifNull: ["$$message.readBy", []] }] } },
                    { $ne: ["$$message.senderId", userObjectId] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          id: '$_id',
          problemId: '$problemId',
          type: { $literal: 'problem' },
          title: '$title',
          status: '$status',
          createdAt: '$createdAt',
          customer: { id: '$customer._id', name: '$customer.name', role: '$customer.role', customerId: '$customer.userId',customerNumber: '$customer.number' },
          lastMessage: { $ifNull: ['$lastMessageObj.message', null] },
          lastMessageTime: { $ifNull: ['$lastMessageObj.createdAt', '$createdAt'] },
          incomingMessages: '$incomingMessages'
        }
      }
    ]);
    chatList = chatList.concat(problemChats);
  }

  // Logic for Support Chats
  if (!type || type === 'support') {
    const supportMatchQuery = {};
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      supportMatchQuery.createdBy = userObjectId;
    }

    const supportChats = await Support.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      { $match: supportMatchQuery },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'supportId',
          as: 'messages'
        }
      },
      {
        $addFields: {
          lastMessageObj: { $arrayElemAt: [{ $sortArray: { input: "$messages", sortBy: { createdAt: -1 } } }, 0] },
          incomingMessages: {
            $size: {
              $filter: {
                input: "$messages",
                as: "message",
                cond: {
                  $and: [
                    { $not: { $in: [userObjectId, { $ifNull: ["$$message.readBy", []] }] } },
                    { $ne: ["$$message.senderId", userObjectId] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          id: '$_id',
          supportId: '$supportId',
          type: { $literal: 'support' },
          title: '$title',
          status: '$status',
          createdAt: '$createdAt',
          customer: { id: '$customer._id', name: '$customer.name', role: '$customer.role',customerId: '$customer.userId', customerNumber: '$customer.number' },
          lastMessage: { $ifNull: ['$lastMessageObj.message', null] },
          lastMessageTime: { $ifNull: ['$lastMessageObj.createdAt', '$createdAt'] },
          incomingMessages: '$incomingMessages'
        }
      }
    ]);
    chatList = chatList.concat(supportChats);
  }

  // Sort the combined list by the last message time (or creation time if no messages)
  chatList.sort((a, b) => (b.lastMessageTime || b.createdAt) - (a.lastMessageTime || a.createdAt));

  return chatList;
};

export const getConversationsByUserId = async ({ type, userId }) => {
  let chatList = [];
  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (type === 'problem') {
    const problemMatchQuery = { 'customer._id': userObjectId };

    const problemChats = await Problem.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: 'userId',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      { $match: problemMatchQuery },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'problemId',
          as: 'messages'
        }
      },
      {
        $addFields: {
          lastMessageObj: { $arrayElemAt: [{ $sortArray: { input: "$messages", sortBy: { createdAt: -1 } } }, 0] },
          incomingMessages: {
            $size: {
              $filter: {
                input: "$messages",
                as: "message",
                cond: {
                  $and: [
                    { $not: { $in: [userObjectId, { $ifNull: ["$$message.readBy", []] } ] } },
                    { $ne: ["$$message.senderId", userObjectId] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          id: '$_id',
          problemId: '$problemId',
          type: { $literal: 'problem' },
          title: '$title',
          status: '$status',
          createdAt: '$createdAt',
          customer: { id: '$customer._id', name: '$customer.name', role: '$customer.role', customerId: '$customer.userId', customerNumber: '$customer.number' },
          lastMessage: { $ifNull: ['$lastMessageObj.message', null] },
          lastMessageTime: { $ifNull: ['$lastMessageObj.createdAt', '$createdAt'] },
          incomingMessages: '$incomingMessages'
        }
      }
    ]);
    chatList = chatList.concat(problemChats);
  }

  if (type === 'support') {
    const supportMatchQuery = { createdBy: userObjectId };

    const supportChats = await Support.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      { $match: supportMatchQuery },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'supportId',
          as: 'messages'
        }
      },
      {
        $addFields: {
          lastMessageObj: { $arrayElemAt: [{ $sortArray: { input: "$messages", sortBy: { createdAt: -1 } } }, 0] },
          incomingMessages: {
            $size: {
              $filter: {
                input: "$messages",
                as: "message",
                cond: {
                  $and: [
                    { $not: { $in: [userObjectId, { $ifNull: ["$$message.readBy", []] } ] } },
                    { $ne: ["$$message.senderId", userObjectId] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          id: '$_id',
          supportId: '$supportId',
          type: { $literal: 'support' },
          title: '$title',
          status: '$status',
          createdAt: '$createdAt',
          customer: { id: '$customer._id', name: '$customer.name', role: '$customer.role', customerId: '$customer.userId', customerNumber: '$customer.number' },
          lastMessage: { $ifNull: ['$lastMessageObj.message', null] },
          lastMessageTime: { $ifNull: ['$lastMessageObj.createdAt', '$createdAt'] },
          incomingMessages: '$incomingMessages'
        }
      }
    ]);
    chatList = chatList.concat(supportChats);
  }

  chatList.sort((a, b) => (b.lastMessageTime || b.createdAt) - (a.lastMessageTime || a.createdAt));

  return chatList;
}

export const getUserChatSummary = async ({ userId, chatType }) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      return null;
    }

    // Get admin users
    const adminUsers = await User.find({ role: { $in: ['admin', 'superadmin'] } }).lean();
    const adminIds = adminUsers.map(admin => admin._id);

    let chatModel;
    let chatQuery;

    if (chatType === 'problem') {
      chatModel = Problem;
      const participatedProblemIds = await Message.distinct('problemId', {
        senderId: user._id,
        chatType: 'problem',
        problemId: { $ne: null },
      });

      chatQuery = {
        $or: [
          { customerId: user.userId },
          { employeeId: user._id },
          { _id: { $in: participatedProblemIds } },
        ],
      };
    } else {
      chatModel = Support;
      const participatedSupportIds = await Message.distinct('supportId', {
        senderId: user._id,
        chatType: 'support',
        supportId: { $ne: null },
      });

      chatQuery = {
        $or: [{ createdBy: user._id }, { _id: { $in: participatedSupportIds } }],
      };
    }

    console.log(`Looking for ${chatType} chats with query:`, chatQuery);

    // Get all chats for this user
    const chats = await chatModel.find(chatQuery).lean();
    console.log(`Found ${chats.length} ${chatType} chats:`, chats.map(chat => ({
      id: chat._id,
      createdBy: chat.createdBy,
      userId: chat.userId,
      customerId: chat.customerId
    })));
    
    if (chats.length === 0) {
      return {
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          userId: user.userId
        },
        incomingMessages: 0,
        lastMessageTime: null
      };
    }

    const chatIds = chats.map(chat => chat._id);
    const messageField = chatType === 'problem' ? 'problemId' : 'supportId';

    // Get all messages for these chats, sorted by creation date
    const messages = await Message.find({
      [messageField]: { $in: chatIds }
    })
    .sort({ createdAt: -1 })
    .lean();

    console.log(`Found ${messages.length} messages for ${chatType} chats`);

    // Calculate unread messages and last message time
    let incomingMessages = 0;
    let lastMessageTime = null;

    for (const message of messages) {
      // Update last message time if this is the latest
      if (!lastMessageTime || message.createdAt > lastMessageTime) {
        lastMessageTime = message.createdAt;
      }

      // Check if message is from admin and unread by this user
      const isFromAdmin = adminIds.some(adminId => 
        adminId.toString() === message.senderId.toString()
      );
      
      const isRead = message.readBy && message.readBy.some(readByUserId => 
        readByUserId.toString() === user._id.toString()
      );

      if (isFromAdmin && !isRead) {
        incomingMessages++;
      }
    }

    const result = {
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        userId: user.userId
      },
      incomingMessages,
      lastMessageTime
    };

    console.log('Final user summary:', result);
    return result;

  } catch (error) {
    console.error('Error in getUserChatSummary:', error);
    return null;
  }
};