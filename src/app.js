import express from 'express';
import morgan from 'morgan';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js';
import errorHandler from './middlewares/error.middleware.js';
import ApiError from './utils/ApiError.js';

const app = express();

// Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Trash Detail Backend API Running');
});

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// Handle 404 Not Found
app.use((req, res, next) => {
  next(new ApiError(404, 'Not Found'));
});

// Global Error Handler
app.use(errorHandler);

export default app;
