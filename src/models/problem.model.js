import mongoose from 'mongoose';

const problemSchema = new mongoose.Schema({
  problemId: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  additionalNotes: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  locationName: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'forwarded', 'cancelled', 'closed'],
    default: 'pending'
  },
  reportedDate: {
    type: Date,
    default: Date.now
  },
  statusUpdateDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

problemSchema.pre('save', async function(next) {
  if (this.isNew) {
    const prefix = 'P';
    
    // Get all existing problem IDs and extract numbers
    const existingProblems = await this.constructor.find(
      { problemId: { $regex: `^${prefix}\\d+$` } },
      { problemId: 1 }
    );

    let maxNumber = 0;
    existingProblems.forEach(problem => {
      const numberPart = parseInt(problem.problemId.replace(prefix, ''));
      if (!isNaN(numberPart) && numberPart > maxNumber) {
        maxNumber = numberPart;
      }
    });

    this.problemId = `${prefix}${maxNumber + 1}`;
  }

  if (this.isModified('status')) {
    this.statusUpdateDate = new Date();
  }
  next();
});

problemSchema.index({ location: '2dsphere' });

const Problem = mongoose.model('Problem', problemSchema);

export default Problem;
