import Problem from '../models/problem.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create a problem
 * @param {Object} problemBody
 * @returns {Promise<Problem>}
 */
export const createProblem = async (problemBody) => {
  return Problem.create(problemBody);
};

/**
 * Get all problems
 * @returns {Promise<Problem[]>}
 */
export const getAllProblems = async () => {
  return Problem.find().populate('employeeId', 'name email');
};

/**
 * Get problem by id
 * @param {String} problemId
 * @returns {Promise<Problem>}
 */
export const getProblemById = async (problemId) => {
  return Problem.findById(problemId).populate('employeeId', 'name email');
};

/**
 * Get forwarded problems by customer id
 * @param {String} customerId
 * @returns {Promise<Problem[]>}
 */
export const getForwardedProblemsByCustomerId = async (customerId) => {
  return Problem.find({ customerId: customerId, status: 'forwarded' }).populate('employeeId', 'name email');
};

/**
 * Update problem status by id
 * @param {String} problemId
 * @param {String} status
 * @returns {Promise<Problem>}
 */
export const updateProblemStatusById = async (problemId, status) => {
  const problem = await Problem.findById(problemId);
  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }
  problem.status = status;
  await problem.save();
  return problem;
};
