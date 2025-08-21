import express from 'express';
import { createProblem, getMyForwardedProblems, getProblemById, getProblems, updateProblemStatus, closeProblem, updateProblem } from '../controllers/problem.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(protect);

// Customer routes
router.get('/my-problems', restrictTo('customer'), getMyForwardedProblems);

// Employee routes
router.post('/', restrictTo('employee'), createProblem);

// Admin routes
router.get('/', restrictTo('admin', 'superadmin'), getProblems);
router.get('/:id', getProblemById);
router.put('/:id/update',restrictTo('admin','superadmin' ,'employee'),updateProblem);
router.patch('/:id/status', restrictTo('admin', 'superadmin'), updateProblemStatus);
router.patch('/:id/close', restrictTo('admin', 'superadmin'), closeProblem);

export default router;
