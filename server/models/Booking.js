const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  spotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpot',
    required: true,
  },
  branch: {
    type: String,
    required: [true, 'Please specify the branch'],
    default: 'Negombo',
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Please add a vehicle number'],
    trim: true,
    uppercase: true,
  },
  startTime: {
    type: Date,
    required: [true, 'Please add a start time'],
  },
  endTime: {
    type: Date,
    required: [true, 'Please add an end time'],
  },
  duration: {
    type: Number,
    required: [true, 'Please specify duration in hours'],
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  bookingId: {
    type: String,
    unique: true,
  },
  qrCode: {
    type: String, // Stringified JSON or unique identifier used to draw QR code in UI
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate a user-friendly unique booking ID: BK-XXXXXX
const generateBookingId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${result}`;
};

BookingSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 10) {
      const candidateId = generateBookingId();
      const exists = await this.constructor.findOne({ bookingId: candidateId });
      if (!exists) {
        this.bookingId = candidateId;
        unique = true;
      }
      attempts++;
    }
    // Fallback in case of persistent collisions (extremely rare)
    if (!unique) {
      this.bookingId = `BK-${this._id.toString().slice(-6).toUpperCase()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Booking', BookingSchema);
