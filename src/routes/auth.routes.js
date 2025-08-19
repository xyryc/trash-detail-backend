import express from 'express';
import { loginUser, logoutUser, refreshTokens, forgotPassword, resetPassword, verifyResetCode } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh', refreshTokens);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.put('/reset-password', resetPassword);

export default router;
