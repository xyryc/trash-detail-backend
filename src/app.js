import express from 'express';
import morgan from 'morgan';
import http from 'http';
import 'dotenv/config.js';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js';
import problemRoutes from './routes/problem.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import messageRoutes from './routes/message.routes.js';
import supportRoutes from './routes/support.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import errorHandler from './middlewares/error.middleware.js';
import ApiError from './utils/ApiError.js';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const corsOptions = {
  origin:'*', // process.env.FRONTEND_URL || 'http://127.0.0.1:8080', // or an array of allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // if you need to send cookies
};

// Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Trash Detail Backend API Running');
});

// Mount routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/problems', problemRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/supports', supportRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Handle 404 Not Found
app.use((req, res, next) => {
  next(new ApiError(404, 'Not Found'));
});

// Global Error Handler
app.use(errorHandler);

export { app, server };
