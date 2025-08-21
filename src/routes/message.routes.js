import express from 'express';
import { createMessage, getMessages, markMessageAsRead, getChatList } from '../controllers/message.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
// import { restrictTo } from '../middlewares/rbac.middleware.js'; // No longer needed for this route

const router = express.Router();

router.use(protect);

router.post('/', createMessage);
// New route for chat list (no role restriction, accepts optional query params)
router.get('/conversations', getChatList);
router.get('/:id', getMessages);
router.patch('/:messageId/read', markMessageAsRead);



export default router;