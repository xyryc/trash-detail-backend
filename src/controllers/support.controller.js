import * as supportService from '../services/support.service.js';
import * as notificationService from '../services/notification.service.js';
import User from '../models/user.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

export const createSupport = catchAsync(async (req, res, next) => {
  const { title, details } = req.body;
  const createdBy = req.user._id;

  if (!title || !details) {
    return next(new ApiError(400, 'Please provide title and details'));
  }

  const newSupport = await supportService.createSupport({ title, details, createdBy });

  // Create a notification for all admins and superadmins
  const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await notificationService.createNotification({
        recipientId: admin._id,
        senderId: createdBy,
        type: 'new_support',
        supportId: newSupport._id,
        id:newSupport.supportId,
        message: `New support ticket #${newSupport.supportId} has been created by ${req.user.name || req.user.email}.`
      });
    }
  }

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

export const closeSupport = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updatedSupport = await supportService.updateSupportStatusById(id, 'closed');

  // Optionally, notify the user who created the support ticket
  const createdBy = await User.findOne({ _id: updatedSupport.createdBy });
  if (createdBy) {
    await notificationService.createNotification({
      recipientId: createdBy._id,
      senderId: req.user._id, // Assuming the user closing the ticket is an admin
      type: 'status_update',
      supportId: updatedSupport._id,
      id:updatedSupport.supportId,
      message: `Your support ticket #${updatedSupport.supportId} has been closed.`
    });
  }

  res.status(200).json({
    success: true,
    message: 'Support ticket closed successfully',
    data: updatedSupport,
  });
});
