import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

export const uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError(400, 'No file uploaded'));
  }

  // Construct the URL for the uploaded file
  // Assuming your server is accessible at http://localhost:3000
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    fileUrl: fileUrl,
  });
});
