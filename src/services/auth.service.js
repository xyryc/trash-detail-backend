import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';

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

  return generateAuthTokens(user);
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
