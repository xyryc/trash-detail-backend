import express from 'express';
import { createUser, updateUser, getUsers, adminRemove, getMe, getUserById } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/rbac.middleware.js';

const router = express.Router();

// The POST route is for the superadmin to create any user
router.post('/', protect, restrictTo('superadmin'), createUser);

// create user without authentication
// router.post('/', createUser);

// All routes below this point require authentication
router.use(protect);

// GET /api/users/me - Get logged in user data
router.get('/me', getMe);

// GET /api/users - Get all users (Admin/Superadmin only)
router.get('/', restrictTo('admin', 'superadmin','employee'), getUsers);

// GET /api/users/:id - Get a single user by ID (Admin/Superadmin only)
router.get('/:id', restrictTo('admin', 'superadmin'), getUserById);

// PATCH /api/users/:id - Update a user (self or by admin/superadmin)
router.patch('/:id', updateUser);

router.delete('/:id', restrictTo('superadmin'),adminRemove)


export default router;