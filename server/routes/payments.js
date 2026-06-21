const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // Secure all payment routes

router.post('/create', createOrder);
router.post('/verify', verifyPayment);

module.exports = router;
