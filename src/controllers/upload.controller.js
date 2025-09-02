import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

export const uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError(400, 'No file uploaded'));
  }

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    fileUrl: req.file.path,
  });
});
