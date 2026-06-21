const mongoose = require('mongoose');

const ParkingSpotSchema = new mongoose.Schema({
  spotNumber: {
    type: String,
    required: [true, 'Please add a spot number'],
    trim: true,
  },
  floor: {
    type: String,
    required: [true, 'Please specify the floor'],
    enum: ['Ground', '1st', '2nd'],
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'occupied', 'reserved'],
    default: 'available',
  },
  type: {
    type: String,
    required: true,
    enum: ['regular', 'handicap', 'EV'],
    default: 'regular',
  },
  currentBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
  sensor_id: {
    type: String,
    sparse: true,
  },
  branch: {
    type: String,
    required: [true, 'Please specify the branch'],
    default: 'Negombo',
  },
});

// Compound unique indexes
ParkingSpotSchema.index({ spotNumber: 1, branch: 1 }, { unique: true });
ParkingSpotSchema.index({ sensor_id: 1, branch: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ParkingSpot', ParkingSpotSchema);
