import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadFile } from '../controllers/upload.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Set up multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploads/'); // Files will be stored in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

router.post('/', protect, upload.single('image'), uploadFile);

export default router;
