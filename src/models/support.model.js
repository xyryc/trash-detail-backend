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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

supportSchema.pre('save', async function(next) {
  if (this.isNew) {
    const prefix = 'S';
    const lastSupport = await this.constructor.findOne(
      { supportId: { $regex: `^${prefix}\d+` } },
      { supportId: 1 }
    ).sort({ supportId: -1 });

    let nextIdNum = 1;
    if (lastSupport && lastSupport.supportId) {
      const lastIdNum = parseInt(lastSupport.supportId.substring(prefix.length));
      if (!isNaN(lastIdNum)) {
        nextIdNum = lastIdNum + 1;
      }
    } else {
      // If no support found, start from 1
      nextIdNum = 1;
    }
    this.supportId = `${prefix}${nextIdNum}`;
  }
  next();
});

const Support = mongoose.model('Support', supportSchema);

export default Support;
