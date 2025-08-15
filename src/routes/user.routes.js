import express from 'express';
import { createUser, updateUser } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/rbac.middleware.js';

const router = express.Router();

// The POST route is for the superadmin to create any user
router.post('/', protect, restrictTo('superadmin'), createUser);

// All routes below this point require authentication
router.use(protect);

// PATCH /api/users/:id - Update a user (self or by admin/superadmin)
router.patch('/:id', updateUser);

export default router;
