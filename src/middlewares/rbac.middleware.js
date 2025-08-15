import ApiError from '../utils/ApiError.js';

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array like ['admin', 'superadmin'].
    // req.user.role is set by the 'protect' middleware.
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to perform this action')
      );
    }
    next();
  };
};
