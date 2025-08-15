import express from 'express';
import { loginUser, logoutUser, refreshTokens } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh', refreshTokens);

export default router;
