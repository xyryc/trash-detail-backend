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
  const updaterRole = req.user.role;

  // Authorization: User can only update their own profile unless they are admin/superadmin
  if (updaterRole !== 'admin' && updaterRole !== 'superadmin' && req.user._id.toString() !== userId) {
    return next(new ApiError(403, 'You do not have permission to update this user.'));
  }

  // The service layer will handle the logic for what fields can be updated by whom
  const updatedUser = await userService.updateUserById(userId, updates, updaterRole);

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
  const { role } = req.query;
  const { role: requesterRole, _id: requesterId } = req.user;
  let query = {};

  if (role) {
    // Handle requests for a specific role
    switch (role) {
      case 'superadmin':
        if (requesterRole !== 'superadmin') {
          return next(new ApiError(403, 'You do not have permission to view superadmin users.'));
        }
        // A superadmin asking for 'superadmin' gets both admins and superadmins
        query = { role: { $in: ['admin', 'superadmin'] } };
        break;
      case 'admin':
        if (requesterRole !== 'superadmin' && requesterRole !== 'admin') {
          return next(new ApiError(403, 'You do not have permission to view admin users.'));
        }
        query = { role: 'admin' };
        break;
      default:
        // For any other role, just set the query
        query = { role: role };
    }
  } else {
    // Handle requests for a general list of users
    if (requesterRole === 'admin') {
      query = { role: { $ne: 'superadmin' } };
    } else if (requesterRole !== 'superadmin') {
      query = { role: { $nin: ['admin', 'superadmin'] } };
    }
     // If requester is a superadmin and no role is specified, the empty query {} gets all users
  }

  const users = await userService.getAllUsers(query);
  res.status(200).json({ success: true, data: users || [] });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Admin/Superadmin
export const getUserById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const requesterRole = req.user.role;

  // If the requester is a superadmin, show the password hash
  const showPassword = requesterRole === 'superadmin';

  const user = await userService.getUserById(id, showPassword);

  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  res.status(200).json({ success: true, data: user });
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

export const getMe = catchAsync(async (req, res, next) => {
  // The user object is attached to the request by the auth middleware
  const user = req.user;
  res.status(200).json({
    success: true,
    data: user,
  });
});
