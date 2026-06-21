const express = require('express');
const { check } = require('express-validator');
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
  getBookingQr,
  deleteBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All booking routes are protected

router.post(
  '/',
  [
    check('spotId', 'ParkingSpot ID is required').not().isEmpty(),
    check('vehicleNumber', 'Vehicle number is required').not().isEmpty(),
    check('startTime', 'Start time is required').not().isEmpty(),
    check('duration', 'Duration is required').isNumeric(),
  ],
  createBooking
);

router.get('/my', getMyBookings);
router.get('/all', authorize('superadmin', 'operationadmin'), getAllBookings);
router.patch('/:id/cancel', cancelBooking);
router.get('/:id/qr', getBookingQr);
router.delete('/:id', deleteBooking);

module.exports = router;
