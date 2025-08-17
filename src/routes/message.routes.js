import express from 'express';
import { createMessage, getMessages, markMessagesAsRead } from '../controllers/message.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createMessage);
router.get('/:id', getMessages);
router.patch('/read', markMessagesAsRead);

export default router;
