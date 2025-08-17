import * as supportService from '../services/support.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

export const createSupport = catchAsync(async (req, res, next) => {
  const { title, details } = req.body;

  if (!title || !details) {
    return next(new ApiError(400, 'Please provide title and details'));
  }

  const newSupport = await supportService.createSupport({ title, details });

  res.status(201).json({
    success: true,
    message: 'Support ticket created successfully',
    data: newSupport,
  });
});

export const getAllSupports = catchAsync(async (req, res, next) => {
  const supports = await supportService.getAllSupports();
  res.status(200).json({
    success: true,
    data: supports,
  });
});

export const getSupportById = catchAsync(async (req, res, next) => {
  const support = await supportService.getSupportById(req.params.id);
  if (!support) {
    return next(new ApiError(404, 'Support ticket not found'));
  }
  res.status(200).json({
    success: true,
    data: support,
  });
});
