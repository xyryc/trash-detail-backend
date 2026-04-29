import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import sendEmail from '../utils/sendEmail.js';

const sendAccountCreationEmail = async (user, password) => {
  const assetBaseUrl =
    process.env.PUBLIC_ASSET_BASE_URL ?? 'https://api.trashdetailnc.com/public';
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
        .logo-image {
            width: 56px;
            height: 56px;
            margin: 0 auto 12px;
            display: block;
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
        .store-badges {
            margin: 22px 0 10px;
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .store-badges a {
            border-bottom: none;
        }
        .store-badges img {
            height: 44px;
            width: auto;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${assetBaseUrl}/icon.png" alt="Trash Detail" class="logo-image" />
            <div class="logo">TRASH DETAIL</div>
        </div>
        
        <div class="content">
            <h1>Your Account Is Ready!</h1>
            <p>Hello,</p>
            <p>We're excited to welcome you to Trash Detail - our smart waste management platform.</p>
            <p>Please use the following credentials to access your account:</p>
            
            <div class="credentials">
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> ${user.role}</p>
                <p><strong>Temporary Password:</strong> <span class="highlight">${password}</span></p>
            </div>
            
            <p>For security, please change your password after first login.</p>

            <div class="store-badges">
                <a href="https://apps.apple.com/us/app/trash-detail/id6762623763" target="_blank" rel="noopener">
                    <img src="${assetBaseUrl}/app_store.png" alt="Download on the App Store" />
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.caitlan.trashdetail" target="_blank" rel="noopener">
                    <img src="${assetBaseUrl}/play_store.png" alt="Get it on Google Play" />
                </a>
            </div>
            
            <p>With Trash Detail, you can:</p>
            <ul>
                <li>Report waste management issues in real-time</li>
                <li>Track resolution progress</li>
                <li>Communicate with our support team</li>
                <li>Access waste analytics in your area</li>
            </ul>
            
            <p>Need help? Reply to this email or contact trashdetail@gmail.com</p>
        </div>
        
        <div class="footer">
            <p>©2018 by Trash Detail, LLC</p>
            <p>For support: North Carolina, South Carolina &amp; Southeast Virginia</p>
            <p>Email: trashdetail@gmail.com | Phone: 252-256-2139 or 252-202-5777</p>
            <p>1104 W Colonial Ave, Elizabeth City, 27909-4112, United States</p>
            <p><a href="https://www.trashdetailnc.com/" style="color: #43A047;">trashdetailnc.com</a></p>
            <p>
                <a href="https://www.trashdetailnc.com/privacy-policy" style="color: #43A047;">Privacy Policy</a>
                |
                <a href="https://www.trashdetailnc.com/terms-and-conditions" style="color: #43A047;">Terms &amp; Conditions</a>
            </p>
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

export const updateUserById = async (id, updateData, updaterRole) => {
  // Only superadmin can update password and role via this function
  if (updateData.password && updaterRole !== 'superadmin') {
    throw new ApiError(403, 'You do not have permission to change the password for another user.');
  }
  if (updateData.role && updaterRole !== 'superadmin') {
    throw new ApiError(403, 'You do not have permission to change user roles.');
  }

  // Fetch the user, including the password field if it needs to be updated
  const user = await User.findById(id).select(updateData.password ? '+password' : '');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Update the fields from the request body
  Object.assign(user, updateData);

  // The .save() method will trigger the pre-save hook to hash the password if it was changed
  await user.save();

  // Exclude password from the returned object
  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

export const getUsersByRole = async (role) => {
  const query = Array.isArray(role) ? { role: { $in: role } } : { role };
  return User.find(query).select('-password -refreshToken');
};

export const removeUserById = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

export const getAllUsers = async (query = {}) => {
  return User.find(query).select('-password -refreshToken');
};

export const getUserById = async (id, showPassword = false) => {
  let query = User.findById(id);
  if (showPassword) {
    query = query.select('+password');
  }
  return query.select('-refreshToken');
};
