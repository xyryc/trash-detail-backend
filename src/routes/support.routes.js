import express from 'express';
import { createSupport, getAllSupports, getSupportById, closeSupport } from '../controllers/support.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createSupport);
router.get('/', restrictTo('admin', 'superadmin'), getAllSupports);
router.get('/:id', restrictTo('admin', 'superadmin'), getSupportById);
router.patch('/:id/close', restrictTo('admin', 'superadmin'), closeSupport);

export default router;
