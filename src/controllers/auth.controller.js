import * as authService from '../services/auth.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';

export const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const { accessToken, refreshToken } = await authService.login(email, password);

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken,
  });
});

export const logoutUser = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  // Note: A refresh token must be provided to log out properly.
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const refreshTokens = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAuth(refreshToken);

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken: newRefreshToken,
  });
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  res.status(200).json({ success: true, message: 'Password reset code sent to your email' });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return next(new ApiError(400, 'Passwords do not match'));
  }
  await authService.resetPassword(email, password);
  res.status(200).json({ success: true, message: 'Password reset successfully' });
});

export const verifyResetCode = catchAsync(async (req, res, next) => {
  const { code } = req.body;
  await authService.verifyResetCode(code);
  res.status(200).json({ success: true, message: 'Code verified successfully' });
});
