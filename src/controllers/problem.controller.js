import * as problemService from '../services/problem.service.js';
import * as notificationService from '../services/notification.service.js';
import * as messageService from '../services/message.service.js';
import User from '../models/user.model.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import axios from 'axios';

export const createProblem = catchAsync(async (req, res, next) => {
  const { title, additionalNotes, location, locationName: manualLocationName, imageUrl, customerId } = req.body;
  const employeeId = req.user._id; // Assuming employee is logged in and user object is available in req

  if (!title || (!location && !manualLocationName) || !imageUrl || !customerId) {
    return next(new ApiError(400, 'Please provide title, image, customerId and either location coordinates or a location name'));
  }

  let locationName = manualLocationName;
  let problemLocation = location;

  if (location && location.coordinates && !manualLocationName) {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.coordinates[1]}&lon=${location.coordinates[0]}`);
      locationName = response.data.address.house_number+ ', ' + response.data.address.road + ', ' + response.data.address.state + ', ' + response.data.address.country; 
    } catch (error) {
      console.error('Error fetching location name:', error);
      // Decide if you want to throw an error or proceed without a location name
    }
  }

  const newProblem = await problemService.createProblem({ 
    title, 
    additionalNotes, 
    location: problemLocation, 
    locationName,
    imageUrl, 
    employeeId, 
    customerId
  });

  // Create a notification for all admins
  const admins = await User.find({ role: 'admin' });
  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await notificationService.createNotification({
        recipientId: admin._id,
        senderId: employeeId,
        type: 'new_problem',
        problemId: newProblem._id,
        message: `New problem #${newProblem.problemId} has been created by an employee.`
      });
    }
  }

  res.status(201).json({
    success: true,
    message: 'Problem created successfully',
    data: newProblem,
  });
});

export const getProblemById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const problem = await problemService.getProblemById(id);
  if (!problem) {
    return next(new ApiError(404, 'Problem not found'));
  }
  res.status(200).json({
    success: true,
    data: problem,
  });
});

export const updateProblem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title, additionalNotes, locationName: manualLocationName, imageUrl } = req.body;
  if (!title ||  !manualLocationName || !imageUrl) {
    return next(new ApiError(400, 'Please provide title, image and either location coordinates or a location name'));
  }

 const updateProblem = await problemService.updateProblemById(id, {
    title,
    additionalNotes,
    locationName: manualLocationName,
    imageUrl
  }); 
  if (!updateProblem) {
    return next(new ApiError(404, 'Problem not found'));
  }     
  res.status(200).json({
    success: true,
    message: 'Problem updated successfully',
    data: updateProblem,
  });

});

export const updateProblemStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return next(new ApiError(400, 'Please provide a status'));
  }

  const updatedProblem = await problemService.updateProblemStatusById(id, status);

  // If the status is 'forwarded', initiate a chat between admin and customer
  if (status === 'forwarded') {
    const io = req.app.get('io');
    const adminId = req.user._id;
    const customerId = updatedProblem.customerId;

    // Find the customer's user document to get their mongoose _id
    const customer = await User.findOne({ userId: customerId });
    if (!customer) {
      return next(new ApiError(404, `Customer with ID ${customerId} not found.`));
    }

    // Create an initial message to start the chat
    const newMessage = await messageService.createMessage({
      chatType: 'problem',
      problemId: updatedProblem._id,
      senderId: adminId,
      recipientId: customer._id, // Use the customer's actual _id
      message: 'This problem has been forwarded to you. You can now chat with an admin regarding this issue.'
    });

    // Emit a socket event to notify both parties
    const roomName = `problem_${updatedProblem._id}`;
    io.to(roomName).emit('newMessage', newMessage);
  }

  // Notify the customer about the status update
  const customer = await User.findOne({userId: updatedProblem.customerId});
  if (customer) {
    await notificationService.createNotification({
      recipientId: customer._id,
      senderId: req.user._id, // Assuming the user updating the status is an admin
      type: 'new_problem',
      problemId: updatedProblem._id,
      message: `Your problem #${updatedProblem.problemId} status has been updated to ${status}.`
    });
  }

  res.status(200).json({
    success: true,
    message: 'Problem status updated successfully',
    data: updatedProblem,
  });
});


export const getProblems = catchAsync(async (req, res, next) => {
  const problems = await problemService.getAllProblems();
  res.status(200).json({
    success: true,
    data: problems,
  });
});

export const getMyForwardedProblems = catchAsync(async (req, res, next) => {
  const customerId = req.user.userId; // Get the logged-in customer's ID
  const problems = await problemService.getForwardedProblemsByCustomerId(customerId);
  res.status(200).json({
    success: true,
    data: problems,
  });
});

export const closeProblem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updatedProblem = await problemService.updateProblemStatusById(id, 'closed');

  // Notify the customer about the status update
  const customer = await User.findOne({userId: updatedProblem.customerId});
  if (customer) {
    await notificationService.createNotification({
      recipientId: customer._id,
      senderId: req.user._id, // Assuming the user updating the status is an admin
      type: 'problem_closed',
      problemId: updatedProblem._id,
      message: `Your problem #${updatedProblem.problemId} has been closed.`
    });
  }

  res.status(200).json({
    success: true,
    message: 'Problem closed successfully',
    data: updatedProblem,
  });
});
