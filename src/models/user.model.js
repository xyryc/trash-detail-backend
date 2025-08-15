import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values, so only unique if present
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Do not return password by default
  },
  role: {
    type: String,
    enum: ['customer', 'employee', 'admin', 'superadmin'],
    default: 'customer'
  },
  refreshToken: {
    type: String,
  },
  number: {
    type: String,
  },
  addressLane1: {
    type: String,
  },
  addressLane2: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  zipCode: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate userId for customer and employee roles
    if (this.role === 'customer' || this.role === 'employee') {
      const prefix = this.role === 'customer' ? 'C' : 'E';
     const lastUser = await this.constructor.findOne(
  { role: this.role, userId: { $regex: `^${prefix}\\d+` } }, 
  { userId: 1 }
).sort({ userId: -1 });

      let nextIdNum = 1;
      if (lastUser && lastUser.userId) {
        const lastIdNum = parseInt(lastUser.userId.substring(prefix.length));
        if (!isNaN(lastIdNum)) {
          nextIdNum = lastIdNum + 1;
        }
      }
      this.userId = `${prefix}${nextIdNum}`;
    }

    // Hash password only if it's new or modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }
  next();
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
