import * as userService from '../services/user.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

// @desc    Create a new user
// @route   POST /api/users
// @access  Superadmin
export const createUser = catchAsync(async (req, res, next) => {
  const { email, role, password } = req.body;

  if (!email || !role || !password) {
    return next(new ApiError(400, 'Please provide email, role, and password'));
  }

  const newUser = await userService.createUser({ email, role, password });

  const userResponse = newUser.toObject();
  delete userResponse.password;

  res.status(201).json({
    success: true,
    message: `User created successfully and notification sent to ${userResponse.email}`,
    data: userResponse,
  });
});

// @desc    Update user details
// @route   PATCH /api/users/:id
// @access  Authenticated User (self) or Admin/Superadmin
export const updateUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const updates = req.body;

  // Prevent users from updating their own role or userId
  if (updates.role && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return next(new ApiError(403, 'You are not allowed to change your role.'));
  }
  if (updates.userId) {
    return next(new ApiError(400, 'User ID cannot be updated.'));
  }

  // Authorization: User can only update their own profile unless they are admin/superadmin
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user._id.toString() !== userId) {
    return next(new ApiError(403, 'You do not have permission to update this user.'));
  }

  // Prevent password updates through this route
  if (updates.password) {
    return next(new ApiError(400, 'Password cannot be updated through this route. Please use /updatePassword.'));
  }

  const updatedUser = await userService.updateUserById(userId, updates);

  if (!updatedUser) {
    return next(new ApiError(404, 'User not found.'));
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
  });
});

export const changePassword = catchAsync(async (req, res, next) => {
  const { newPassword, confirmPassword } = req.body;
  const userId = req.user._id; // Get user ID from authenticated request

  if (newPassword !== confirmPassword) {
    return next(new ApiError(400, 'New password and confirm password do not match'));
  }

  await userService.changePassword(userId, newPassword);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});



// @desc    Get all users
// @route   GET /api/users
// @access  Admin/Superadmin
export const getUsers = catchAsync(async (req, res, next) => {
  const { role } = req.query; // e.g., ?role=customer or ?role=employee
  const requestingUserRole = req.user.role; // Get the role of the user making the request
  let users;
  
  // Only superadmin can get admin details
  if (role === 'admin' && requestingUserRole !== 'superadmin') {
    return next(new ApiError(403, 'Only superadmin can access admin details.'));
  }
  
  if (role) {
    users = await userService.getUsersByRole(role);
  } else {
    // For general listing, exclude admins unless requesting user is superadmin
    if (requestingUserRole !== 'superadmin') {
      const query = { role: { $nin: ['admin', 'superadmin'] } };
      users = await userService.getAllUsers(query);
    } else {
      users = await userService.getAllUsers();
    }
  }
  
  res.status(200).json({ success: true, data: users });
});

export const adminRemove= catchAsync(async (req, res, next) => {
  const userId = req.params.id;
 console.log("Delte:", userId)
  // Only superadmin can remove users
  if (req.user.role !== 'superadmin') {
    return next(new ApiError(403, 'Only superadmin can remove users.'));
  }

  const removedUser = await userService.removeUserById(userId);

  if (!removedUser) {
    return next(new ApiError(404, 'User not found.'));
  }

  res.status(200).json({
    success: true,
    message: 'User removed successfully',
    data: removedUser,
  });
});