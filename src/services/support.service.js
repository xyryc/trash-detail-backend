import Support from '../models/support.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create a support ticket
 * @param {Object} supportBody
 * @returns {Promise<Support>}
 */
export const createSupport = async (supportBody) => {
  return Support.create(supportBody);
};

/**
 * Get all support tickets
 * @returns {Promise<Support[]>}
 */
export const getAllSupports = async () => {
  return Support.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
};

/**
 * Get a support ticket by ID
 * @param {String} supportId
 * @returns {Promise<Support>}
 */
export const getSupportById = async (supportId) => {
  return Support.findById(supportId).populate('createdBy', 'name email');
};

/**
 * Update support ticket status by ID
 * @param {String} id - The MongoDB _id of the support ticket
 * @param {String} status - The new status (e.g., 'closed')
 * @returns {Promise<Support>}
 */
export const updateSupportStatusById = async (id, status) => {
  const support = await Support.findById(id);
  if (!support) {
    throw new ApiError(404, 'Support ticket not found');
  }
  support.status = status;
  await support.save();
  return support;
};
