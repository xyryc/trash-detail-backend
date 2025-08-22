import mongoose from 'mongoose';

const supportSchema = new mongoose.Schema({
  supportId: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'closed', 'reopened'],
    default: 'open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  statusUpdateDate: {
    type: Date,
    default: Date.now
  }
});

supportSchema.pre('save', async function(next) {
  if (this.isNew) {
    const prefix = 'S';
    
    // Get all existing problem IDs and extract numbers
    const existingSupports = await this.constructor.find(
        { supportId: { $regex: `^${prefix}\\d+$` } }, 
      { supportId: 1 }
    );

    let maxNumber = 0;
    existingSupports.forEach(support => {
      const numberPart = parseInt(support.supportId.replace(prefix, ''));
      if (!isNaN(numberPart) && numberPart > maxNumber) {
        maxNumber = numberPart;
      }
    });

    this.supportId = `${prefix}${maxNumber + 1}`;
  }

  if (this.isModified('status')) {
    this.statusUpdateDate = new Date();
  }
  next();
});

const Support = mongoose.model('Support', supportSchema);

export default Support;
