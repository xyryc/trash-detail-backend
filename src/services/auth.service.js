import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import sendEmail from '../utils/sendEmail.js';
import bcrypt from 'bcryptjs';

const generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const generateAuthTokens = async (user) => {
  const accessToken = generateToken(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    `${process.env.JWT_ACCESS_EXPIRATION_MINUTES}m`
  );

  const refreshToken = generateToken(
    { id: user._id },
    process.env.JWT_SECRET, // In production, you might use a different secret for refresh tokens
    `${process.env.JWT_REFRESH_EXPIRATION_DAYS}d`
  );

  // Save the refresh token to the user
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

export const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  const { accessToken, refreshToken } = await generateAuthTokens(user);
  user.password = undefined;
  return { user, accessToken, refreshToken };
};

export const logout = async (refreshToken) => {
  const user = await User.findOne({ refreshToken });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });
};

export const refreshAuth = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    return generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token');
  }
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Generate 4 digit code
  const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
  user.passwordResetCode = resetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false });

  // Send email
  const message = `Your password reset code is: ${resetCode}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password reset code',
      html: message,
    });
  } catch (err) {
    console.log(err);
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Email could not be sent');
  }
};

export const resetPassword = async (email, password) => {
  const user = await User.findOne({
    email,
    passwordResetVerified: true,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Password reset not initiated or code expired');
  }

  const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = false;
  await user.save();
};

export const verifyResetCode = async (code) => {
  const user = await User.findOne({
    passwordResetCode: code,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Code is invalid or has expired');
  }

  user.passwordResetVerified = true;
  await user.save({ validateBeforeSave: false });

  return { success: true, message: 'Code verified successfully' };
};

export const resendOtp = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Generate 4 digit code
  const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
  user.passwordResetCode = resetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.passwordResetVerified = false; // Reset verification status

  await user.save({ validateBeforeSave: false });

  // Send email
  const message = `Your new password reset code is: ${resetCode}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'New Password Reset Code',
      html: message,
    });
  } catch (err) {
    console.log(err);
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Email could not be sent');
  }
};
""
