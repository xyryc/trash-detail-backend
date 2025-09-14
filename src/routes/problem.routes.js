import express from 'express';
import { createProblem, getMyCreatedProblems, getMyForwardedProblems, getProblemById, getProblems, updateProblemStatus, closeProblem, updateProblem } from '../controllers/problem.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(protect);

// Customer routes
router.get('/my-problems', restrictTo('customer'), getMyForwardedProblems);

// Employee routes
router.post('/', restrictTo('employee'), createProblem);
router.get('/my-created-problems', restrictTo('employee'), getMyCreatedProblems);
//router.get('/my-created-problems', restrictTo('employee'), getMyCreatedProblems);

// Admin routes
router.get('/admin', restrictTo('admin', 'superadmin'), getProblems);
router.get('/:id', getProblemById);
router.put('/update/:id',restrictTo('admin','superadmin' ,'employee'),updateProblem);
router.patch('/status/:id', restrictTo('admin', 'superadmin'), updateProblemStatus);
router.patch('/close/:id', restrictTo('admin', 'superadmin'), closeProblem);

export default router;
