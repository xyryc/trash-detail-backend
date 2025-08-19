import Support from '../models/support.model.js';

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
