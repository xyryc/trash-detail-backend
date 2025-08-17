
import 'dotenv/config';
import { app, server } from './app.js';
import connectDB from './config/database.js';
import User from './models/user.model.js';
import initializeSocketIO from './socket.js';

const PORT = process.env.PORT || 3000;

const createSuperAdmin = async () => {
  try {
    const superAdminEmail = process.env.SUPERADMIN_EMAIL;
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

    if (!superAdminEmail || !superAdminPassword) {
      console.log('Superadmin credentials not found in .env file. Skipping creation.');
      return;
    }

    const existingAdmin = await User.findOne({ email: superAdminEmail });

    if (!existingAdmin) {
      await User.create({
        name: 'Super Admin',
        email: superAdminEmail,
        password: superAdminPassword,
        role: 'superadmin',
      });
      console.log('Superadmin account created successfully.');
    } else {
      console.log('Superadmin account already exists.');
    }
  } catch (error) {
    console.error('Error creating superadmin account:', error);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    // Check for essential environment variables
    if (!process.env.JWT_SECRET) {
      console.error('FATAL ERROR: JWT_SECRET is not defined in .env file.');
      process.exit(1);
    }

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('FATAL ERROR: SMTP configuration is incomplete for production environment.');
        process.exit(1);
      }
    }

    await connectDB();
    await createSuperAdmin();

    const io = initializeSocketIO(server);
    app.set('io', io);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
