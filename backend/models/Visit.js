import mongoose from 'mongoose';

const treatmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  cost: {
    type: Number,
    required: true,
    min: 0
  }
});

const visitSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  symptoms: String,
  diagnosis: String,
  notes: String,
  treatments: [treatmentSchema],
  totalAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Calculate total amount before saving
visitSchema.pre('save', function(next) {
  this.totalAmount = this.treatments.reduce((total, treatment) => total + treatment.cost, 0);
  next();
});

// Generate unique visit ID
visitSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Visit').countDocuments();
    this._id = `VISIT${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Visit', visitSchema);