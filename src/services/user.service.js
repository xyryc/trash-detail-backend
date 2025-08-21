import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import sendEmail from '../utils/sendEmail.js';

const sendAccountCreationEmail = async (user, password) => {
  const subject = 'Your Account Has Been Created!';
  const html = `
   <!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f7fa;
            margin: 0;
            padding: 0;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
        }
        .header {
            background: linear-gradient(135deg, #2E7D32 0%, #43A047 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            color: white;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .trash-icon {
            font-size: 36px;
            display: block;
            margin-bottom: 10px;
        }
        .content {
            padding: 40px;
        }
        h1 {
            color: #2E7D32;
            margin-top: 0;
            font-weight: 600;
        }
        .credentials {
            background: #E8F5E9;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .btn {
            display: block;
            width: 70%;
            margin: 30px auto;
            padding: 14px;
            background: #43A047;
            color: white !important;
            text-align: center;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 18px;
            box-shadow: 0 4px 6px rgba(67, 160, 71, 0.3);
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #2E7D32;
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(67, 160, 71, 0.4);
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #78909C;
            font-size: 14px;
            border-top: 1px solid #ECEFF1;
        }
        .highlight {
            background: #FFF8E1;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="trash-icon">🗑️</div>
            <div class="logo">TRASH DETAIL</div>
        </div>
        
        <div class="content">
            <h1>Your Account Is Ready!</h1>
            <p>Hello,</p>
            <p>We're excited to welcome you to Trash Detail - our smart waste management platform.</p>
            <p>Please use the following credentials to access your account:</p>
            
            <div class="credentials">
                <p><strong>Login URL:</strong> https://app.trashdetail.com/login</p>
                <p><strong>Email:</strong>${user.email}</p>
                <p><strong>Email:</strong>${user.role}</p>
                <p><strong>Temporary Password:</strong> <span class="highlight">${password}</span></p>
            </div>
            
            <p>For security, please change your password after first login.</p>
            
            <a href="https://app.trashdetail.com/login" class="btn">Login to Your Account</a>
            
            <p>With Trash Detail, you can:</p>
            <ul>
                <li>Report waste management issues in real-time</li>
                <li>Track resolution progress</li>
                <li>Communicate with our support team</li>
                <li>Access waste analytics in your area</li>
            </ul>
            
            <p>Need help? Reply to this email or contact support@trashdetail.com</p>
        </div>
        
        <div class="footer">
            <p>© 2023 Trash Detail. All rights reserved.</p>
            <p>123 Green Street, Eco City | support@trashdetail.com</p>
            <p><a href="#" style="color: #43A047;">Unsubscribe</a> | <a href="#" style="color: #43A047;">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject,
      html,
    });
    console.log(`Account creation email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending account creation email:', error);
    // Even if email fails, the user is already created. This failure needs to be logged.
  }
};

export const createUser = async (userData) => {
  const { email, role, password } = userData;

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'A user with this email already exists.');
  }

  // 2. Create the new user
  const newUser = await User.create({
    name: email.split('@')[0], // Default name from email prefix
    email,
    password,
    role,
  });

  // 3. Send the notification email
  await sendAccountCreationEmail(newUser, password);

  return newUser;
};

export const updateUserById = async (id, updateData) => {
  // Prevent direct updates to sensitive fields
  const disallowedFields = ['password', 'refreshToken', 'role', 'userId'];
  disallowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      throw new ApiError(400, `Updating ${field} directly is not allowed.`);
    }
  });

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  return user;
};

export const getUsersByRole = async (role) => {
  return User.find({ role }).select('-password -refreshToken');
};