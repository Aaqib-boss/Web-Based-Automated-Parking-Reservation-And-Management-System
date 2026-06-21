const Booking = require('../models/Booking');
const ParkingSpot = require('../models/ParkingSpot');
const PricingConfig = require('../models/PricingConfig');
const { validationResult } = require('express-validator');

// Helper to calculate pricing
const calculatePrice = (duration, config) => {
  const baseRate = config?.baseRate ?? 30;
  const twoHourRate = config?.twoHourRate ?? 50;
  const fourHourRate = config?.fourHourRate ?? 90;
  const fullDayRate = config?.fullDayRate ?? 150;

  if (duration === 1) return baseRate;
  if (duration === 2) return twoHourRate;
  if (duration === 4) return fourHourRate;
  if (duration === 24) return fullDayRate;
  
  // Custom durations fallback
  if (duration < 2) return baseRate;
  if (duration < 4) return twoHourRate;
  if (duration < 8) return fourHourRate;
  return fullDayRate;
};

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { spotId, vehicleNumber, startTime, duration } = req.body;

  try {
    // Check if spot exists
    const spot = await ParkingSpot.findById(spotId);
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }

    // Check if spot is available
    if (spot.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Parking spot is already occupied or reserved' });
    }

    // Calculate dates
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
    
    // Fetch pricing configuration
    const pricingConfig = await PricingConfig.findOne();
    const amount = calculatePrice(duration, pricingConfig);

    const simulatePayments = process.env.SIMULATE_PAYMENTS === 'true';

    // Create booking (initially pending payment)
    const paymentStatus = 'pending';

    const booking = await Booking.create({
      userId: req.user.id,
      spotId,
      vehicleNumber: vehicleNumber.toUpperCase(),
      startTime: start,
      endTime: end,
      duration,
      amount,
      status: 'active',
      paymentStatus,
      branch: spot.branch,
    });

    // Generate unique QR code data
    booking.qrCode = JSON.stringify({
      bookingId: booking.bookingId || booking._id,
      spotNumber: spot.spotNumber,
      vehicleNumber: booking.vehicleNumber,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });
    await booking.save();

    // Update spot status
    spot.status = simulatePayments ? 'reserved' : 'available'; // If not paid yet, keep available or pending
    if (simulatePayments) {
      spot.currentBookingId = booking._id;
    }
    await spot.save();

    // Broadcast spot status change to socket.io
    const io = req.app.get('socketio');
    if (io && simulatePayments) {
      io.emit('spotStatusChanged', {
        spotId: spot._id,
        spotNumber: spot.spotNumber,
        floor: spot.floor,
        status: spot.status,
        type: spot.type,
        currentBookingId: spot.currentBookingId,
      });
    }

    res.status(201).json({
      success: true,
      data: booking,
      spotDetails: {
        spotNumber: spot.spotNumber,
        floor: spot.floor,
        type: spot.type,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get current user's bookings
// @route   GET /api/bookings/my
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('spotId', 'spotNumber floor type branch')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all bookings (Admin only)
// @route   GET /api/bookings/all
// @access  Private/Admin
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'name email phone')
      .populate('spotId', 'spotNumber floor type branch')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Cancel a booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check authorization (Must be booking owner or admin)
    if (booking.userId.toString() !== req.user.id && !['operationadmin', 'superadmin'].includes(req.user.role)) {
      return res.status(401).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();

    // Release parking spot
    const spot = await ParkingSpot.findById(booking.spotId);
    if (spot && spot.currentBookingId && spot.currentBookingId.toString() === booking._id.toString()) {
      spot.status = 'available';
      spot.currentBookingId = null;
      await spot.save();

      // Emit status update to clients
      const io = req.app.get('socketio');
      if (io) {
        io.emit('spotStatusChanged', {
          spotId: spot._id,
          spotNumber: spot.spotNumber,
          floor: spot.floor,
          status: 'available',
          type: spot.type,
          currentBookingId: null,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully. Refund initiated to original payment source.',
      data: booking,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get QR code string for booking
// @route   GET /api/bookings/:id/qr
// @access  Private
exports.getBookingQr = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user.id && !['operationadmin', 'superadmin'].includes(req.user.role)) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this QR code' });
    }

    res.status(200).json({ success: true, qrCode: booking.qrCode });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete a booking
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check authorization (Must be booking owner or admin)
    if (booking.userId.toString() !== req.user.id && !['operationadmin', 'superadmin'].includes(req.user.role)) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this booking' });
    }

    // Release parking spot if it's currently held by this booking
    const spot = await ParkingSpot.findById(booking.spotId);
    if (spot && spot.currentBookingId && spot.currentBookingId.toString() === booking._id.toString()) {
      spot.status = 'available';
      spot.currentBookingId = null;
      await spot.save();

      // Emit status update to clients
      const io = req.app.get('socketio');
      if (io) {
        io.emit('spotStatusChanged', {
          spotId: spot._id,
          spotNumber: spot.spotNumber,
          floor: spot.floor,
          status: 'available',
          type: spot.type,
          currentBookingId: null,
        });
      }
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

