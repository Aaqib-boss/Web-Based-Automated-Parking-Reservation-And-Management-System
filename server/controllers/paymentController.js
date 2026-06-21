const crypto = require('crypto');
const Razorpay = require('razorpay');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ParkingSpot = require('../models/ParkingSpot');

// Initialize Razorpay (only if keys exist and simulation is off)
let razorpay;
const simulatePayments = process.env.SIMULATE_PAYMENTS === 'true';

if (!simulatePayments && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// @desc    Create Razorpay Order / Simulated checkout order
// @route   POST /api/payments/create
// @access  Private
exports.createOrder = async (req, res) => {
  const { bookingId } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking is already paid' });
    }

    const amountInPaise = booking.amount * 100;
    let orderId = `order_sim_${crypto.randomBytes(6).toString('hex')}`;
    let orderData = {
      id: orderId,
      amount: amountInPaise,
      currency: 'INR',
      receipt: booking._id.toString(),
    };

    // If Razorpay is enabled and we are not simulating
    if (razorpay) {
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: booking._id.toString(),
      };
      
      const order = await razorpay.orders.create(options);
      orderId = order.id;
      orderData = order;
    }

    // Save payment log in DB
    await Payment.create({
      bookingId: booking._id,
      userId: req.user.id,
      amount: booking.amount,
      razorpayOrderId: orderId,
      status: 'pending',
    });

    res.status(200).json({
      success: true,
      order: orderData,
      isSimulated: !razorpay,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid123',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Verify Razorpay payment signature / Simulated payment verification
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payment = await Payment.findOne({ bookingId, razorpayOrderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found for this order' });
    }

    let isSignatureValid = false;

    // Check if we are simulating
    if (!razorpay) {
      // Simulation mode auto-verifies
      isSignatureValid = true;
    } else {
      // Standard signature validation
      const text = `${razorpayOrderId}|${razorpayPaymentId}`;
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      isSignatureValid = generated_signature === razorpaySignature;
    }

    if (isSignatureValid) {
      // Update booking and payment statuses
      payment.status = 'completed';
      payment.razorpayPaymentId = razorpayPaymentId || `pay_sim_${crypto.randomBytes(6).toString('hex')}`;
      await payment.save();

      booking.paymentStatus = 'paid';
      await booking.save();

      // Update the spot status to reserved
      const spot = await ParkingSpot.findById(booking.spotId);
      if (spot) {
        spot.status = 'reserved';
        spot.currentBookingId = booking._id;
        await spot.save();

        // Emit live update to socket clients
        const io = req.app.get('socketio');
        if (io) {
          io.emit('spotStatusChanged', {
            spotId: spot._id,
            spotNumber: spot.spotNumber,
            floor: spot.floor,
            status: 'reserved',
            type: spot.type,
            currentBookingId: spot.currentBookingId,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully and reservation confirmed.',
        data: booking,
      });
    } else {
      payment.status = 'failed';
      await payment.save();

      booking.paymentStatus = 'failed';
      await booking.save();

      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
